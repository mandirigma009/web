// server/routes/rooms.js
// CRUD endpoints for rooms table.
// Uses pool.js for MySQL connection (mysql2/promise).
const express = require('express');
const router = express.Router();
const pool = require('../pool');


// -----------------------
// GET all rooms
// -----------------------


// server/routes/rooms.js
router.get("/", async (req, res) => {
  const [rows] = await pool.query(`
    SELECT r.*, b.building_name
    FROM rooms r
    JOIN buildings b ON b.id = r.building_id
    ORDER BY r.id DESC
  `);
  res.json({ rooms: rows });
});


router.put("/:id", async (req, res) => {
  const {
    room_number,
    room_name,
    room_description,
    building_id,
    floor_number,
    status,
    chairs,
    has_tv,
    has_projector,
    has_table,
    max_capacity  
  } = req.body;

  try {
    await pool.query(
      `UPDATE rooms SET
        room_number=?,
        room_name=?,
        room_description=?,
        building_id=?,
        floor_number=?,
        status=?,
        chairs=?,
        has_tv=?,
        has_projector=?,
        has_table=?,
        max_capacity=?  
      WHERE id=?`,
      [
        room_number,
        room_name,
        room_description || null,
        building_id,
        floor_number,
        status,
        chairs,
        has_tv ? 1 : 0,
        has_projector ? 1 : 0,
        has_table ? 1 : 0,
        max_capacity || 0,  
        req.params.id
      ]
    );

    // Fetch updated room to return
    const [rows] = await pool.query(
      `SELECT r.*, b.building_name
       FROM rooms r
       JOIN buildings b ON b.id = r.building_id
       WHERE r.id = ?`,
      [req.params.id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error updating room:", err);
    res.status(500).json({ error: "Server error" });
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
router.post("/", async (req, res) => {
  const {
    room_number,
    room_name,
    room_description,
    building_id,
    floor_number,
    status,
    chairs,
    has_tv,
    has_projector,
    has_table,
    max_capacity 
  } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO rooms
      (room_number, room_name, room_description, building_id, floor_number,
       status, chairs, has_tv, has_projector, has_table, max_capacity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        room_number,
        room_name,
        room_description,
        building_id,
        floor_number,
        status,
        chairs,
        has_tv ? 1 : 0,
        has_projector ? 1 : 0,
        has_table ? 1 : 0,
        max_capacity || 0   
      ]
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "Room already exists on this floor and building",
      });
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// GET /api/rooms/:id - fetch single room
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT r.*, b.building_name
       FROM rooms r
       JOIN buildings b ON b.id = r.building_id
       WHERE r.id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Room not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error fetching room:", err);
    res.status(500).json({ error: "Internal Server Error" });
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
