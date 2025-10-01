import express from "express";
import pool from "../pool.js"; // MySQL connection pool

const router = express.Router();

// -----------------------
// Function to cancel expired reservations
// -----------------------
const cancelExpiredReservations = async () => {
  try {
    const now = new Date();
    const nowStr = now.toISOString().slice(0, 19).replace("T", " "); // MySQL DATETIME format

    const [result] = await pool.query(
      `UPDATE rooms
       SET status = 1,
           reserved_by = NULL,
           date_reserved = NULL,
           reservation_start = NULL,
           reservation_end = NULL
       WHERE status = 2 AND reservation_end < ?`,
      [nowStr]
    );

    if (result.affectedRows > 0) {
      console.log(`✅ Cancelled ${result.affectedRows} expired reservations`);
    }
  } catch (err) {
    console.error("❌ Error cancelling expired reservations:", err);
  }
};

// Run cleanup every minute
setInterval(cancelExpiredReservations, 60 * 1000);

// Also run once on server start
cancelExpiredReservations();

// -----------------------
// GET all rooms
// -----------------------
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM rooms ORDER BY id DESC");
    res.json({ rooms: rows });
  } catch (err) {
    console.error("❌ Error fetching rooms:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -----------------------
// POST new room
// -----------------------
router.post("/", async (req, res) => {
  try {
    const { room_number, room_name, room_description, building_name, floor_number } = req.body;

    if (!room_number || !room_name) {
      return res.status(400).json({ message: "room_number and room_name are required" });
    }

    const [result] = await pool.query(
      `INSERT INTO rooms (room_number, room_name, room_description, building_name, floor_number, status)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [room_number, room_name, room_description || "", building_name || "", floor_number || 1]
    );

    res.status(201).json({
      message: "Room created successfully",
      room: {
        id: result.insertId,
        room_number,
        room_name,
        room_description,
        building_name,
        floor_number,
        status: 1,
      },
    });
  } catch (err) {
    console.error("❌ Error adding room:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -----------------------
// GET bookings for a specific user
// -----------------------
router.get("/my-bookings/:user", async (req, res) => {
  try {
    const { user } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM rooms WHERE reserved_by = ? AND status = 2",
      [user]
    );
    res.json(rows);
  } catch (error) {
    console.error("❌ Error fetching bookings:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// -----------------------
// Cancel a reservation manually
// -----------------------
router.post("/:id/cancel", async (req, res) => {
  const roomId = Number(req.params.id);

  if (isNaN(roomId)) {
    return res.status(400).json({ error: "Invalid room ID" });
  }

  try {
    const [result] = await pool.query(
      `UPDATE rooms
       SET status = 1,
           reserved_by = NULL,
           date_reserved = NULL,
           reservation_start = NULL,
           reservation_end = NULL
       WHERE id = ? AND status = 2`,
      [roomId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Room not found or not reserved" });
    }

    res.json({ success: true, message: "Reservation cancelled successfully" });
  } catch (err) {
    console.error("❌ Failed to cancel booking:", err);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// Auto-cancel expired reservations endpoint
router.post("/auto-cancel", async (req, res) => {
  try {

const pad = (n) => n.toString().padStart(2, "0");

const now = new Date();
const nowStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

console.log(nowStr); // "2025-09-21 14:30:15" for example


    const [result] = await pool.query(
      `UPDATE rooms
       SET status = 1,
           reserved_by = NULL,
           date_reserved = NULL,
           reservation_start = NULL,
           reservation_end = NULL
       WHERE status = 2 AND reservation_end < ?`,
      [nowStr]
    );

    res.json({ success: true, cancelled: result.affectedRows });
  } catch (err) {
    console.error("❌ Error in auto-cancel endpoint:", err);
    res.status(500).json({ success: false, message: "Failed to cancel expired reservations" });
  }
});


// -----------------------
// Book a room
router.post("/book", async (req, res) => {
  try {
    const { roomId, date, startTime, endTime, notes, reserved_by } = req.body;

    if (!roomId || !date || !startTime || !endTime || !reserved_by) {
      return res.status(400).json({ message: "Missing booking fields" });
    }

    // Combine date + time into proper DATETIME
    const reservationStart = `${date} ${startTime}:00`;
    const reservationEnd = `${date} ${endTime}:00`;

    // Check if available
    const [check] = await pool.query(
      `SELECT * FROM rooms WHERE id = ? AND status = 1`,
      [roomId]
    );
    if (check.length === 0) {
      return res.status(400).json({ message: "Room not available" });
    }

    // Update row
    const [result] = await pool.query(
      `UPDATE rooms
       SET status = 2,
           reserved_by = ?,
           date_reserved = ?,
           reservation_start = ?,
           reservation_end = ?
       WHERE id = ? AND status = 1`,
      [reserved_by, date, reservationStart, reservationEnd, roomId]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: "Failed to reserve room" });
    }

    res.json({ success: true, message: "Room booked successfully" });
  } catch (err) {
    console.error("❌ Booking error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
