// server/routes/auth.js

import crypto from "crypto";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";
import { sendEmail } from "../../src/utils/emailService.js";
import { v4 as uuidv4 } from "uuid";



import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

router.get("/_ping", (req, res) => {
  res.json({ ok: true });
});

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

// Helper to wrap db.query in a promise
function queryAsync(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}



// ---------------- SIGNUP ----------------
router.post("/signup", async (req, res) => {
        try {
          const { name, email, password, role, isAdminCreated } = req.body;

          if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "All fields are required" });
          }

          db.query("SELECT id FROM users WHERE email = ?", [email], async (err, results) => {
            if (err) return res.status(500).json({ message: "Database error" });
            if (results.length > 0) {
              return res.status(400).json({ message: "Email already exists" });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            let status = "active";
            let verified = 0;
            let verificationToken = null;

            if (Number(role) === 1) {
              // Super Admin
              status = "active";
              verified = 1;
            } else if (Number(role) === 3) {
              // Instructor
              if (isAdminCreated) {
                // ✅ Admin-added instructors
                status = "active";
                verified = 0;
                verificationToken = crypto.randomBytes(32).toString("hex"); // for verification link
              } else {
                // Self-signup (if any)
                status = "pending";
                verified = 0;
              }
            } else if (Number(role) === 4) {
              // Student
              status = "active";
              verified = 0;
              verificationToken = crypto.randomBytes(32).toString("hex");
            }

            db.query(
              `
              INSERT INTO users
              (name, email, password, role, status, verified, verification_token, verification_token_created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `,
              [
                name,
                email,
                hashedPassword,
                role,
                status,
                verified,
                verificationToken,
                verificationToken ? new Date() : null,
              ],
              async (err2) => {
                if (err2) {
                  console.error(err2);
                  return res.status(500).json({ message: "Database error" });
                }

                // 📧 Send email for verification or admin creation
                if ((Number(role) === 4) || (Number(role) === 3 && isAdminCreated)) {
                  const link = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
                  
                  let subject, body;

                  if (Number(role) === 3 && isAdminCreated) {
                    subject = "You have been added by the admin";
                    body = `
                      <p>Hi ${name},</p>
                      <p>An admin has created an account for you.</p>
                      <p>Here is your temporary password: <strong>${password}</strong></p>
                      <p>Please verify your account by clicking the link below:</p>
                      <a href="${link}" style="padding:10px 20px; background:#2e6ef7; color:white; text-decoration:none;">Verify Account</a>
                    `;
                  } else {
                    subject = "📧 Verify Your Email";
                    body = `
                      <p>Hi ${name},</p>
                      <p>Please verify your email by clicking the button below:</p>
                      <a href="${link}" style="padding:10px 20px; background:#2e6ef7; color:white; text-decoration:none;">Verify Email</a>
                    `;
                  }

                  await sendEmail(email, subject, body);
                }

                return res.status(201).json({
                  message:
                    Number(role) === 3 && isAdminCreated
                      ? "Instructor added successfully. Email sent with temporary password."
                      : Number(role) === 3
                      ? "Registration submitted. Waiting for admin approval."
                      : "Registration successful. Please verify your email.",
                });
              }
            );
          });
        } catch (error) {
          console.error("Signup error:", error);
          res.status(500).json({ message: "Server error" });
        }
      });



//----------------Verify email--------------------//
router.get("/verify-email", async (req, res) => {
      const { token, email } = req.query;

      if (!token || !email) {
        return res.status(400).json({ message: "Invalid verification link" });
      }

      try {
        const results = await queryAsync(
          `SELECT id, verified, verification_token, verification_token_created_at
          FROM users
          WHERE email = ?`,
          [email]
        );

        if (!results.length) {
          return res.status(400).json({ message: "User not found" });
        }

        const user = results[0];

        // ✅ Already verified → SUCCESS (important)
        if (user.verified === 1) {
            return res.json({ message: "Email already verified" });
        }

        // ❌ Token mismatch
        if (!user.verification_token || user.verification_token !== token) {
          return res.status(400).json({ message: "Invalid or used token" });
        }

        // ⏰ Expiration check
        const TOKEN_EXPIRATION_MS = 72 * 60 * 60 * 1000;
        
        const tokenCreatedAt = new Date(user.verification_token_created_at).getTime();

        if (Date.now() - tokenCreatedAt > TOKEN_EXPIRATION_MS) {
          console.log("Date.now() :", Date.now())
          console.log("tokenCreatedAt :", tokenCreatedAt)
          console.log("Date.now() - tokenCreatedAt", Date.now() - tokenCreatedAt)
          console.log("TOKEN_EXPIRATION_MS :", TOKEN_EXPIRATION_MS)
          console.log("Date.now() - tokenCreatedAt > TOKEN_EXPIRATION_MS :", Date.now() - tokenCreatedAt > TOKEN_EXPIRATION_MS)
          return res.status(400).json({ message: "Token expired" });
        }

        // ✅ Verify
        await queryAsync(
          `UPDATE users
          SET verified = 1,
              verification_token = NULL,
              verification_token_created_at = NULL
          WHERE id = ?`,
          [user.id]
        );

        return res.json({ message: "Email successfully verified" });

      } catch (err) {
        console.error("Verify email error:", err);
        return res.status(500).json({ message: "Server error" });
      }
    });



// server/routes/auth.js
router.get("/resend-verification", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "Email required" });

  try {
    const results = await queryAsync(
      `SELECT id, name, verified FROM users WHERE email = ?`,
      [email]
    );

    if (!results.length) return res.status(404).json({ message: "User not found" });

    const user = results[0];

    if (user.verified) {
      return res.json({ message: "Email already verified" });
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    await queryAsync(
      `UPDATE users
       SET verification_token = ?, verification_token_created_at = NOW()
       WHERE id = ?`,
      [verificationToken, user.id]
    );

    const verificationLink =
      `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    const subject = "📧 Verify Your Email (New Token)";
    const body = `<p>Hi ${user.name},</p>
      <p>Your previous token expired. Please verify your email by clicking the button below:</p>
      <a href="${verificationLink}" style="padding:10px 20px; background:#2e6ef7; color:white; text-decoration:none;">Verify Email</a>
    `;

    await sendEmail(email, subject, body);
    return res.json({ message: "New verification email sent" });
  } catch (err) {
    console.error("Resend verification error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});



// ---------------- LOGIN ----------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
      failedAttempts: 0,
      remainingAttempts: 5,
      locked: false,
    });
  }

  try {
    // Use promise wrapper so await works
    const [results] = await db.promise().query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (results.length === 0) {
      return res.status(401).json({
        message: "Invalid credentials",
        failedAttempts: 0,
        remainingAttempts: 5,
        locked: false,
      });
    }

    const user = results[0];
    const now = new Date();

    // Auto-reset failed attempts if lock has expired
    if (user.locked_until && now > new Date(user.locked_until)) {
      await db.promise().query(
        "UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?",
        [user.id]
      );
      user.failed_attempts = 0;
      user.locked_until = null;
    }

    // Check if account is locked
    if (user.locked_until && now < new Date(user.locked_until)) {
      const diff = new Date(user.locked_until).getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      return res.status(403).json({
        message:
          "Your account is locked due to multiple failed login attempts.",
        failedAttempts: user.failed_attempts,
        remainingAttempts: 0,
        locked: true,
        lockedUntil: new Date(user.locked_until).toISOString(),
        countdown: `Try again in ${hours}h ${minutes}m`,
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      let failedAttempts = Number(user.failed_attempts || 0) + 1;
      let lockedUntil = null;
      let isLocked = false;

      if (failedAttempts >= 5) {
        lockedUntil = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12h lock
        isLocked = true;
        failedAttempts = 5; // cap attempts
      }

      await db.promise().query(
        "UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?",
        [failedAttempts, lockedUntil, user.id]
      );

      return res.status(401).json({
        message: "Incorrect Email or Password!",
        failedAttempts,
        remainingAttempts: Math.max(0, 5 - failedAttempts),
        locked: isLocked,
        lockedUntil: lockedUntil ? lockedUntil.toISOString() : null,
      });
    }

    // Successful login → reset failed attempts & lock
    await db.promise().query(
      "UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?",
      [user.id]
    );

    // Check email verified
    if (user.role !== 1 && user.verified !== 1) {
      return res.status(403).json({
        message: "Your email is not verified. Please verify first.",
        failedAttempts: 0,
        remainingAttempts: 5,
        locked: false,
      });
    }

    

    // Check pending status for admin/teacher
    if ([2, 3].includes(user.role) && user.status !== "active") {
      return res.status(403).json({
        message: "Your account is pending admin approval.",
        failedAttempts: 0,
        remainingAttempts: 5,
        locked: false,
      });
    }



    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      ACCESS_SECRET,
      { expiresIn: "60m" }
    );
    const refreshToken = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      REFRESH_SECRET,
      { expiresIn: "12h" }
    );


    // inside /login route, after verifying credentials
const sessionToken = uuidv4();

await db.promise().query(
  `INSERT INTO user_sessions (user_id, session_token) VALUES (?, ?)`,
  [user.id, sessionToken]
);

res.cookie("accessToken", accessToken, cookieOptions(60 * 60 * 1000));
res.cookie("refreshToken", refreshToken, cookieOptions(12 * 60 * 60 * 1000));

// <-- Add this cookie for sessionToken
res.cookie("sessionToken", sessionToken, cookieOptions(12 * 60 * 60 * 1000)); // same expiry as refresh


return res.json({
  message: "Login successful",
  user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, verified: user.verified },
  sessionToken,
});

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      message: "Server error",
      failedAttempts: 0,
      remainingAttempts: 5,
      locked: false,
    });
  }
});




// ---------------- ADMIN APPROVAL ----------------
// PUT /api/auth/users/:id/approve
router.put("/users/:id/approve", async (req, res) => {
  try {
    const userId = Number(req.params.id);

    // 1️⃣ Activate the user
    const result = await queryAsync(
      "UPDATE users SET status = 'active' WHERE id = ? AND role IN (2,3)",
      [userId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "User not found or already approved" });

    // 2️⃣ Fetch user
    const rows = await queryAsync(
      "SELECT name, email, verified FROM users WHERE id = ?",
      [userId]
    );

    if (!rows.length) return res.status(500).json({ message: "Failed to fetch user" });

    const { name, email, verified } = rows[0];

    // 3️⃣ Send verification email if not verified
    if (!verified) {
      const verificationToken = crypto.randomBytes(32).toString("hex");
     await queryAsync(
  `
  UPDATE users
  SET verification_token = ?,
      verification_token_created_at = NOW()
  WHERE id = ?
  `,
  [verificationToken, userId]
);


      const verificationLink =
  `${process.env.FRONTEND_URL}/verify-email` +
  `?token=${verificationToken}&email=${encodeURIComponent(email)}`;

      const subject = "📧 Verify Your Email (Admin Approved)";
      const body = `
        <p>Hi ${name},</p>
        <p>Your registration has been approved by admin. Please verify your email:</p>
        <a href="${verificationLink}" style="padding:10px 20px; background:#2e6ef7; color:white; text-decoration:none;">Verify Email</a>
      `;
      try {
        await sendEmail(email, subject, body);
        console.log(`✅ Verification email sent to ${email}`);
      } catch (err) {
        console.error("❌ Failed to send verification email:", err);
      }
    }

    res.json({ message: "User approved and verification email sent if not verified" });
  } catch (err) {
    console.error(err);
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


router.post("/logout", async (req, res) => {
  try {
    const sessionToken = req.cookies?.sessionToken;

    if (sessionToken) {
      await db.promise().query(
        "DELETE FROM user_sessions WHERE session_token = ?",
        [sessionToken]
      );
    }

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });
    res.clearCookie("sessionToken", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });

    return res.json({ message: "Logged out" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Logout failed" });
  }
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

            // ✅ Reset password, invalidate reset code, and clear failed login attempts if locked
            db.query(
              `UPDATE users
              SET password = ?, 
                  reset_code = NULL, 
                  reset_expires = NULL,
                  failed_attempts = 0,
                  locked_until = NULL
              WHERE email = ?`,
              [hashed, email],
              (err2) => {
                if (err2) {
                  console.error("Reset password update error:", err2);
                  return res.status(500).json({ message: "Failed to update password" });
                }

                return res.json({ message: "Password reset successfully. You can now log in with your new password." });
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
