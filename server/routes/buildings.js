import express from "express";
import pool from "../pool.js"; // make sure pool.js is also ES module

const router = express.Router();

// GET all buildings
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM buildings ORDER BY building_name ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/buildings error", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST create building
router.post("/", async (req, res) => {
  try {
    const { building_name } = req.body;

    if (!building_name || !building_name.trim()) {
      return res.status(400).json({ error: "building_name is required" });
    }

    const [exists] = await pool.query(
      "SELECT id FROM buildings WHERE building_name = ?",
      [building_name.trim()]
    );

    if (exists.length > 0) {
      return res.status(409).json({ error: "Building already exists" });
    }

    const [result] = await pool.query(
      "INSERT INTO buildings (building_name) VALUES (?)",
      [building_name.trim()]
    );

    const [rows] = await pool.query(
      "SELECT * FROM buildings WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/buildings error", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", async (req, res) => {
  await pool.query(
    "UPDATE buildings SET building_name=? WHERE id=?",
    [req.body.building_name.trim(), req.params.id]
  );
  res.json({ success: true });
});

router.delete("/:id", async (req, res) => {
  const [rooms] = await pool.query(
    "SELECT id FROM rooms WHERE building_id=?",
    [req.params.id]
  );

  if (rooms.length) {
    return res
      .status(409)
      .json({ error: "Building has rooms" });
  }

  await pool.query("DELETE FROM buildings WHERE id=?", [
    req.params.id,
  ]);
  res.json({ success: true });
});

export default router; // ✅ ES module default export
