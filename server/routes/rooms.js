import express from "express";
import pool from "../pool.js"; // MySQL connection pool

const router = express.Router();


/// ✅ Update room status (MySQL version)
router.put("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (![1, 2, 3, 4].includes(Number(status))) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const [result] = await pool.query(
      "UPDATE rooms SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    // ✅ Fetch updated row to return to frontend
    const [rows] = await pool.query("SELECT * FROM rooms WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error updating room status:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

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
// EDIT room (role 1 or 2 only) - PUT /rooms/:id
// -----------------------
router.put("/:id", async (req, res) => {
  const roomId = Number(req.params.id);
  if (isNaN(roomId)) return res.status(400).json({ message: "Invalid room ID" });

  const { room_number, room_name, room_description, building_name, floor_number, status } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE rooms
       SET room_number = ?,
           room_name = ?,
           room_description = ?,
           building_name = ?,
           floor_number = ?,
           status = ?
       WHERE id = ?`,
      [room_number, room_name, room_description, building_name, floor_number, status || 1, roomId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Room not found or not updated" });
    }

    res.json({ success: true, message: "Room updated successfully" });
  } catch (err) {
    console.error("❌ Error updating room:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -----------------------
// DELETE room (role 1 or 2 only) - DELETE /rooms/:id
// -----------------------
router.delete("/:id", async (req, res) => {
  const roomId = Number(req.params.id);
  if (isNaN(roomId)) return res.status(400).json({ message: "Invalid room ID" });

  try {
    const [result] = await pool.query(
      `DELETE FROM rooms WHERE id = ?`,
      [roomId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Room not found or already deleted" });
    }

    res.json({ success: true, message: "Room deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting room:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
