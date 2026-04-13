import express from "express";
import pool from "../pool.js";

const router = express.Router();

// GET departments
router.get("/departments", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM departments ORDER BY name"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET years by department
router.get("/years/:departmentId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM years WHERE department_id = ? ORDER BY year_level",
      [req.params.departmentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET sections by year
router.get("/sections/:yearId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM sections WHERE year_id = ? ORDER BY section_name",
      [req.params.yearId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;