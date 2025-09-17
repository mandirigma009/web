// server/routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";
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
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "All fields are required" });

    // check existing
    db.query("SELECT id FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ message: "Database error" });
      }
      if (results.length > 0) return res.status(400).json({ message: "Email already exists" });

      const hashed = await bcrypt.hash(password, 10); //encrypt password in db, hash the password before saving
      db.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashed], (err2, result) => {
        if (err2) {
          console.error("DB insert error:", err2);
          return res.status(500).json({ message: "Database error" });
        }
        return res.status(201).json({ message: "User registered successfully" });
      });
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
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ message: "Database error" });
      }
      if (results.length === 0) return res.status(401).json({ message: "Invalid credentials" });

      const user = results[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ message: "Invalid credentials" });

      // create tokens
     // create tokens with id, email, name
const accessToken = jwt.sign(
  { id: user.id, email: user.email, name: user.name },
  ACCESS_SECRET,
  { expiresIn: "60m" }
);

const refreshToken = jwt.sign(
  { id: user.id, email: user.email, name: user.name },
  REFRESH_SECRET,
  { expiresIn: "12h" }
);


      // set cookies
      res.cookie("accessToken", accessToken, cookieOptions(60 * 60 * 1000));   // 60m
      res.cookie("refreshToken", refreshToken, cookieOptions(12 * 60 * 60 * 1000)); // 12h

      // return minimal user info (not tokens in body required)
      return res.json({
        message: "Login successful",
        user: { id: user.id, name: user.name, email: user.email },
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

      // now payload contains id, email, name
      return res.json({
        user: { id: payload.id, name: payload.name, email: payload.email },
      });
    });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
