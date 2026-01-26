// server/routes/adminMetrics.js
import express from "express";
import pool from "../pool.js";

const router = express.Router();

/**
 * GET /api/admin/metrics
 */
router.get("/metrics", async (req, res) => {
  try {
    const [
      [activeUsers],
      [pendingUsers],
      [pendingBookings],
      [availableRooms],
    ] = await Promise.all([
      // Live active users
      pool.query(`
     SELECT COUNT(DISTINCT user_id) AS count
      FROM user_sessions
    `),

      // Pending user approvals
      pool.query(`
        SELECT COUNT(*) AS count
        FROM users
        WHERE status = 'pending'
      `),

      // Pending reservations
      pool.query(`
        SELECT COUNT(*) AS count
        FROM room_bookings
        WHERE status = 'pending'
      `),

      // Available rooms (status = 1)
      pool.query(`
        SELECT COUNT(*) AS count
        FROM rooms
        WHERE status = 1
      `),
    ]);

    res.json({
      activeUsers: activeUsers[0].count,
      pendingUsers: pendingUsers[0].count,
      pendingBookings: pendingBookings[0].count,
      availableRooms: availableRooms[0].count,
    });
  } catch (err) {
    console.error("Admin metrics error:", err);
    res.status(500).json({ message: "Failed to fetch admin metrics" });
  }
});

export default router;
