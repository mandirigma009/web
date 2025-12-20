// server/routes/auth.js
import crypto from "crypto";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";
import { sendEmail } from "../../src/utils/emailService.js";

import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_dev_secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_dev_secret";

// cookie options helper
const cookieOptions = (maxAgeMs) => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,           // set true in production (HTTPS)
    sameSite: "lax",         // 'lax' is generally fine for SPA
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: maxAgeMs,
  };
};

// ---------------- SIGNUP ----------------
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    // check existing
    db.query("SELECT id FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ message: "Database error" });
      }
      if (results.length > 0)
        return res.status(400).json({ message: "Email already exists" });

      // hash password
      const hashed = await bcrypt.hash(password, 10);

      // default role = 4 if not provided
      const userRole = role || 4;

      db.query(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
        [name, email, hashed, userRole],
        (err2, result) => {
          if (err2) {
            console.error("DB insert error:", err2);
            return res.status(500).json({ message: "Database error" });
          }
          return res.status(201).json({ message: "User registered successfully" });
        }
      );
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



// ---------------- LOGIN ----------------
// issues access & refresh tokens, sets cookies
router.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ message: "Database error" });
      }
      if (results.length === 0)
        return res.status(401).json({ message: "Invalid credentials" });

      const user = results[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ message: "Invalid credentials" });

      // ✅ create tokens with role included
      const accessToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role, // include role from DB
        },
        ACCESS_SECRET,
        { expiresIn: "60m" }
      );

      const refreshToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role, // include role from DB
        },
        REFRESH_SECRET,
        { expiresIn: "12h" }
      );

      // ✅ set cookies
      res.cookie("accessToken", accessToken, cookieOptions(60 * 60 * 1000)); // 60m
      res.cookie("refreshToken", refreshToken, cookieOptions(12 * 60 * 60 * 1000)); // 12h

      // ✅ return user info including role
      return res.json({
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role, // include role in response too
        },
      });
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// ---------------- REFRESH ----------------
// reads refresh cookie and issues new access token
router.post("/refresh", (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    jwt.verify(token, REFRESH_SECRET, (err, payload) => {
      if (err) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      const newAccessToken = jwt.sign({ id: payload.id, email: payload.email }, ACCESS_SECRET, { expiresIn: "60m" });
      // set new access token cookie
      res.cookie("accessToken", newAccessToken, cookieOptions(60 * 60 * 1000));
      return res.json({ message: "Access token refreshed" });
    });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- LOGOUT ----------------
router.post("/logout", (req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: false, // 🔹 true in production with HTTPS
    sameSite: "strict",
  });

  return res.json({ message: "Logged out" });
});

// ---------------- ME ----------------
// Returns basic current user info (if access token valid).
router.get("/me", (req, res) => {
  try {
    const token =
      req.cookies?.accessToken ||
      (req.headers.authorization && req.headers.authorization.split(" ")[1]);
    if (!token) return res.status(401).json({ message: "No access token" });

    jwt.verify(token, ACCESS_SECRET, (err, payload) => {
      if (err) return res.status(401).json({ message: "Invalid/expired access token" });

      return res.json({
        user: {
          id: payload.id,
          name: payload.name,
          email: payload.email,
          role: payload.role, // ✅ return role
        },
      });
    });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- CHECK EMAIL ----------------
router.post("/check-email", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ exists: false });
  }

  db.query(
    "SELECT id FROM users WHERE email = ?",
    [email],
    (err, results) => {
      if (err) {
        console.error("Check email error:", err);
        return res.status(500).json({ exists: false });
      }

      if (results.length === 0) {
        return res.status(404).json({ exists: false });
      }

      return res.json({ exists: true });
    }
  );
});


/// ---------------- GENERATE RESET CODE ----------------
router.post("/generate-reset-code", (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  db.query(
    "SELECT id, name FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) {
        console.error("Generate reset code error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length === 0) return res.status(404).json({ message: "Email not found" });

      const user = results[0];
      const resetCode = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      db.query(
        `UPDATE users
         SET reset_code = ?, reset_expires = ?
         WHERE email = ?`,
        [resetCode, expiresAt, email],
        async (err2) => {
          if (err2) {
            console.error("Update reset code error:", err2);
            return res.status(500).json({ message: "Failed to save reset code" });
          }

          // ✅ Send the reset code email
          const subject = "🔑 Password Reset Code";
          const body = `
            <p>Hi ${user.name || "User"},</p>
            <p>You requested a password reset. Your reset code is:</p>
            <h2 style="color:#2e6ef7;">${resetCode}</h2>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
          `;

          try {
            await sendEmail(email, subject, body);
            console.log(`✅ Reset code email sent to ${email}`);
          } catch (emailErr) {
            console.error("❌ Failed to send reset code email:", emailErr);
          }

          return res.json({ message: "Reset code generated and sent via email" });
        }
      );
    }
  );
});

// ---------------- RESET PASSWORD ----------------
router.post("/reset-password", async (req, res) => {
  const { email, resetCode, newPassword } = req.body;

  if (!email || !resetCode || !newPassword) {
    return res.status(400).json({ message: "Email, reset code, and new password are required" });
  }

  db.query(
    "SELECT reset_code, reset_expires FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) {
        console.error("Reset password query error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length === 0) return res.status(404).json({ message: "Email not found" });

      const user = results[0];
      const now = new Date();

      // ✅ Check if reset code is valid
      if (!user.reset_code || user.reset_code !== resetCode) {
        return res.status(400).json({ message: "Invalid reset code" });
      }

      // ✅ Check if reset code is expired
      if (now > new Date(user.reset_expires)) {
        return res.status(400).json({ message: "Reset code expired" });
      }

      try {
        const hashed = await bcrypt.hash(newPassword, 10);

        // ✅ Reset password and invalidate reset code
        db.query(
          `UPDATE users
           SET password = ?, reset_code = NULL, reset_expires = NULL
           WHERE email = ?`,
          [hashed, email],
          (err2) => {
            if (err2) {
              console.error("Reset password update error:", err2);
              return res.status(500).json({ message: "Failed to update password" });
            }

            return res.json({ message: "Password reset successfully" });
          }
        );
      } catch (hashErr) {
        console.error("Password hashing error:", hashErr);
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
});



export default router;
