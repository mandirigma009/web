import express from "express";
import pool from "../pool.js";

const router = express.Router();

/**
 * GET /api/admin/metrics
 * Query params:
 *  - userRole
 *  - userId
 */
router.get("/metrics", async (req, res) => {
  try {
    const userRole = Number(req.query.userRole);
    const userId = Number(req.query.userId);

    // ---- Active users ----
    const [[activeUsers]] = await pool.query(`
      SELECT COUNT(DISTINCT user_id) AS count
      FROM user_sessions
    `);

    // ---- Pending users (admin/staff only) ----
    let pendingUsersCount = 0;
    if (userRole === 1 || userRole === 2) {
      const [[pendingUsers]] = await pool.query(`
        SELECT COUNT(*) AS count
        FROM users
        WHERE status = 'pending'
      `);
      pendingUsersCount = pendingUsers.count;
    }

    // ---- Pending bookings ----
    let pendingBookingsCount = 0;

    if (userRole === 1 || userRole === 2) {
      // Admin / Staff → all pending
      const [[pendingBookings]] = await pool.query(`
        SELECT COUNT(*) AS count
        FROM room_bookings
        WHERE status = 'pending'
      `);
      pendingBookingsCount = pendingBookings.count;
    } else if (userRole === 3) {
      // Reserver → only own pending
      const [[pendingBookings]] = await pool.query(`
        SELECT COUNT(*) AS count
        FROM room_bookings
        WHERE status = 'pending'
          AND user_id = ?
      `, [userId]);
      pendingBookingsCount = pendingBookings.count;
    }

    // ---- Available rooms ----
    const [[availableRooms]] = await pool.query(`
      SELECT COUNT(*) AS count
      FROM rooms
      WHERE status = 1
    `);

    res.json({
      activeUsers: activeUsers.count,
      pendingUsers: pendingUsersCount,
      pendingBookings: pendingBookingsCount,
      availableRooms: availableRooms.count,
    });
  } catch (err) {
    console.error("Admin metrics error:", err);
    res.status(500).json({ message: "Failed to fetch admin metrics" });
  }
});

export default router;
