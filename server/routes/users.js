// server/routes/users.js
import express from "express";
import pool from "../pool.js";

const router = express.Router();

// GET all users
router.get("/users", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, role FROM users WHERE role > 1"
    );
    res.json({ users: rows });
  } catch (err) {
    console.error("❌ Error fetching users:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// PUT update user role
router.put("/:id/role", async (req, res) => {
  const userId = Number(req.params.id);
  const { role } = req.body;

  if (!role || ![1, 2, 3, 4].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const [result] = await pool.query(
      "UPDATE users SET role = ? WHERE id = ?",
      [role, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Optionally, fetch updated user
    const [rows] = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [userId]
    );

    res.json({ user: rows[0] });
  } catch (err) {
    console.error("❌ Error updating role:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
