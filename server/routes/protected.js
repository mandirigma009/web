// routes/protected.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";

import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Student-only route
router.get("/dashboard", authMiddleware, roleMiddleware(0), (req, res) => {
  res.json({ message: "Welcome Student", user: req.user });
});

// Admin-only route
router.get("/dashboard", authMiddleware, roleMiddleware(1), (req, res) => {
  res.json({ message: "Welcome Admin", user: req.user });
});

export default router;
