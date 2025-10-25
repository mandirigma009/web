// server/routes/users.js
import express from "express";
import pool from "../pool.js";

const router = express.Router();

/**
 * ✅ GET /api/users or /api/users?role=3
 * If `role` query param is given, filters users by that role.
 * Otherwise, fetches all users with role > 1 (same as before).
 */
router.get("/", async (req, res) => {
  try {
    const { role } = req.query;
    let query = "SELECT id, name, email, role FROM users";
    const params = [];

    if (role) {
      query += " WHERE role = ?";
      params.push(role);
    } else {
      // Default behavior (your original logic)
      query += " WHERE role > 1";
    }

    const [rows] = await pool.query(query, params);
    res.json({ users: rows });
  } catch (err) {
    console.error("❌ Error fetching users:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ DELETE /api/users/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting user:", err.message);
    res
      .status(500)
      .json({ message: "Failed to delete user", error: err.message });
  }
});

// ✅ PUT /api/users/:id/role (update user role)
router.put("/:id/role", async (req, res) => {
  const userId = Number(req.params.id);
  const { role } = req.body;

  if (!role || ![1, 2, 3, 4].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const [result] = await pool.query("UPDATE users SET role = ? WHERE id = ?", [
      role,
      userId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Optionally fetch updated user
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

// Get email by username
router.get("/users/email/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const [result] = await pool.query("SELECT email FROM users WHERE name = ?", [username]);
    if (result.length === 0) return res.status(404).json({ message: "User not found" });
    res.json({ email: result[0].email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// GET /api/users/getEmail/:id
router.get("/getEmail/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      "SELECT email, name FROM users WHERE id = ?",
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    res.json({ email: rows[0].email, name: rows[0].name });
  } catch (err) {
    console.error("Error fetching user email:", err);
    res.status(500).json({ message: "Failed to fetch email" });
  }
});


export default router;
