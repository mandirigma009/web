import express from "express";
import pool from "../pool.js";

const router = express.Router();

// GET all departments
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

export default router;