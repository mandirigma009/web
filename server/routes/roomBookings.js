// backend/routes/roomBookings.js
import express from "express";
import db from "../pool.js"; // Your MySQL connection
const router = express.Router();

// ------------------------
// Book a room
// ------------------------
router.post("/book", async (req, res) => {
  try {
    const {
      roomId,
      reserved_by,
      date,
      startTime,
      endTime,
      notes,
      roomNumber,
      roomDesc,
      roomName,
      floor,
      building,
    } = req.body;

    // 1️⃣ Check for overlapping bookings
    const [existing] = await db.query(
      `SELECT * FROM room_bookings
       WHERE room_id = ? AND date_reserved = ?
       AND NOT (reservation_end <= ? OR reservation_start >= ?)`,
      [roomId, date, startTime, endTime]
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ message: "Selected time conflicts with existing booking." });
    }

    // 2️⃣ Save booking
    await db.query(
      `INSERT INTO room_bookings 
      (room_id, reserved_by, date_reserved, reservation_start, reservation_end, notes, room_number, room_description, room_name, floor_number, building_name) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        roomId,
        reserved_by,
        date,
        startTime,
        endTime,
        notes,
        roomNumber,
        roomDesc,
        roomName,
        floor,
        building,
      ]
    );

    res.json({ message: "Reservation saved to room_bookings!" });
  } catch (err) {
    console.error("Error saving reservation:", err);
    res.status(500).json({ message: "Failed to save reservation." });
  }
});

// ------------------------
// Edit booking (update date/time)
// ------------------------
router.put("/:id", async (req, res) => {
  try {

     const { id } = req.params;
    const bookingId = Number(req.params.id);
    const { date, startTime, endTime, roomId, notes } = req.body;
console.log("date = "+ date)
console.log("start time = "+ startTime)
console.log("end time = "+ endTime)
console.log("room ID = "+ id)
console.log("notes = "+ notes)
    if (!date || !startTime || !endTime || !id) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 1️⃣ Check for overlapping bookings, excluding the current booking
    const [conflicts] = await db.query(
      `SELECT * FROM room_bookings
       WHERE id = ? AND date_reserved = ? AND id != ?
       AND NOT (reservation_end <= ? OR reservation_start >= ?)`,
      [id, date, bookingId, startTime, endTime]
    );

    if (conflicts.length > 0) {
      return res
        .status(400)
        .json({ message: "Edited time conflicts with existing booking." });
    }

    // 2️⃣ Update booking
    const [result] = await db.query(
      `UPDATE room_bookings 
       SET date_reserved = ?, notes = ?, reservation_start = ?, reservation_end = ?
       WHERE id = ?`,
      [date, notes, startTime, endTime, bookingId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // 3️⃣ Return updated booking
    const [rows] = await db.query(
      `SELECT * FROM room_bookings WHERE id = ?`,
      [bookingId]
    );

    res.json({ booking: rows[0] });
  } catch (err) {
    console.error("Error updating booking:", err);
    res.status(500).json({ message: "Failed to update booking", error: err.message });
  }
});

// ------------------------
// Cancel a booking manually
// ------------------------
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(
      "DELETE FROM room_bookings WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    res.json({ success: true, message: "Reservation deleted" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});



// ------------------------
// Get reservations for a room & date
// ------------------------
router.get("/reservations", async (req, res) => {
  try {
    
    const { roomId, date } = req.query;

    const [rows] = await db.query(
      "SELECT * FROM room_bookings WHERE room_id = ? AND date_reserved = ? ORDER BY reservation_start",
      [roomId, date]
    );

    res.json({ reservations: rows });
  } catch (err) {
    console.error("Error fetching reservations:", err);
    res.status(500).json({ message: "Failed to fetch reservations." });
  }
});

// ------------------------
// Get all bookings for a user
// ------------------------
router.get("/my-bookings/:name", async (req, res) => {
  const { name } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT *
       FROM room_bookings
       WHERE reserved_by = ?
       ORDER BY date_reserved, reservation_start`,
      [name]
    );
    res.json({ bookings: rows });
  } catch (err) {
    console.error("Error fetching my bookings:", err);
    res.status(500).json({ message: "Failed to fetch bookings." });
  }
});


export default router;
