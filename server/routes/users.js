// server/routes/users.js
import crypto from "crypto";
import express from "express";
import pool from "../pool.js";
import { sendEmail } from "../../src/utils/emailService.js";

const router = express.Router();

/**
 * ✅ GET /api/users or /api/users?role=3
 * If `role` query param is given, filters users by that role.
 * Otherwise, fetches all users with role > 1 (same as before).
 */
router.get("/", async (req, res) => {
  try {
    const { role, status } = req.query;
    let query = "SELECT id, name, email, role, status, verified FROM users";
    const params = [];

    const conditions = [];

    if (role) {
      conditions.push("role = ?");
      params.push(role);
    }

    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }

    if (!role && !status) {
      // keep your original default behavior
      conditions.push("role > 1");
    }

    if (conditions.length) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const [rows] = await pool.query(query, params);
    res.json({ users: rows });
  } catch (err) {
    console.error("❌ Error fetching users:", err.message);
    res.status(500).json({ message: "Server error" });
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


router.put("/:id/activate", async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    // Fetch user
        const [rows] = await pool.query(
        `
        SELECT id, role, verified, email, name, status
        FROM users
        WHERE id = ?
        `,
        [userId]
      );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];

    // Prevent double-activation
    if (user.status === "active") {
      return res.json({ message: "User already active" });
    }

    // Activate user
    await pool.query(
      "UPDATE users SET status = 'active' WHERE id = ?",
      [userId]
    );

    /**
     * Send verification email:
     * - ONLY for instructors (role === 3)
     * - ONLY if not yet verified
     */
    if (user.role === 3 && user.verified === 0) {
      const verificationToken = crypto.randomBytes(32).toString("hex");
              await pool.query(
             "UPDATE users SET verification_token = ? ,  verification_token_created_at = NOW() WHERE id = ?",
             [verificationToken, userId]
           );

      const verifyLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

      await sendEmail(
        user.email,
        "Verify Your Email – Account Approved",
        `
          <p>Hi ${user.name},</p>
          <p>Your instructor account has been approved by an administrator.</p>
          <p>Please verify your email to complete activation:</p>
          <p>
            <a href="${verifyLink}"
               style="padding:10px 20px; background:#2e6ef7; color:#ffffff; text-decoration:none;">
              Verify Email
            </a>
          </p>
          <p>If you did not request this, please ignore this email.</p>
        `
      );
    }

    return res.json({
      message: "User activated successfully",
    });
  } catch (err) {
    console.error("ACTIVATE USER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
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
