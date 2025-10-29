// server/routes/rooms.js
// CRUD endpoints for rooms table.
// Uses pool.js for MySQL connection (mysql2/promise).
const express = require('express');
const router = express.Router();
const pool = require('../pool');


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

// POST /api/rooms - create a new room
router.post('/', async (req, res) => {
  try {
    const {
      room_number, room_name, room_description, building_name,
      floor_number = 1, status = 1, chairs = 0, has_tv = 0, has_projector = 0, has_table = 0
    } = req.body;

    if (!room_number || !room_name || !building_name) {
      return res.status(400).json({ error: 'room_number, room_name and building_name are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO rooms (room_number, room_name, room_description, building_name, floor_number, status, chairs, has_tv, has_projector, has_table)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [room_number, room_name, room_description || null, building_name, floor_number, status, chairs, has_tv ? 1 : 0, has_projector ? 1 : 0, has_table ? 1 : 0]
    );

    const [rows] = await pool.query('SELECT * FROM rooms WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/rooms error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/rooms/:id - update room
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      room_number, room_name, room_description, building_name,
      floor_number = 1, status = 1, chairs = 0, has_tv = 0, has_projector = 0, has_table = 0
    } = req.body;
    await pool.query(
      `UPDATE rooms SET room_number=?, room_name=?, room_description=?, building_name=?, floor_number=?, status=?, chairs=?, has_tv=?, has_projector=?, has_table=? WHERE id=?`,
      [room_number, room_name, room_description || null, building_name, floor_number, status, chairs, has_tv ? 1 : 0, has_projector ? 1 : 0, has_table ? 1 : 0, id]
    );
    const [rows] = await pool.query('SELECT * FROM rooms WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /api/rooms/:id error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/rooms/:id - delete room
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pool.query('DELETE FROM rooms WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/rooms/:id error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
