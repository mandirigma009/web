// server/routes/academicRoutes.js

import express from "express";
import pool from "../pool.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (!req.user || ![1, 2].includes(Number(req.user.role))) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

const isDuplicate = async (sql, params) => {
  const [rows] = await pool.query(sql, params);
  return rows.length > 0;
};

/* ---------------- DEPARTMENTS ---------------- */


// GET all departments
router.get("/departments", async (req, res) => {

  try {
    const [rows] = await pool.query(
      "SELECT * FROM departments ORDER BY name"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/department error", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST new department
router.post("/departments", authMiddleware, requireAdmin, async (req, res) => {
  const { name } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ message: "Department name required" });
  }

  try {
    const duplicate = await isDuplicate(
      "SELECT id FROM departments WHERE LOWER(name) = LOWER(?)",
      [name.trim()]
    );

    if (duplicate) {
      return res.json({ duplicate: true, message: "Department already exists" });
      
    }

    const [result] = await pool.query(
      "INSERT INTO departments (name) VALUES (?)",
      [name.trim()]
    );

    res.json({ id: result.insertId, name: name.trim() });
  } catch (err) {
    console.error("Add department error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT update department
router.put("/departments/:id", authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ message: "Department name required" });
  }

  try {
    const duplicate = await isDuplicate(
      "SELECT id FROM departments WHERE LOWER(name) = LOWER(?) AND id <> ?",
      [name.trim(), id]
    );

    if (duplicate) {
     
      return res.json({ duplicate: true, message: "Department already exists" });
    }

    const [result] = await pool.query(
      "UPDATE departments SET name = ? WHERE id = ?",
      [name.trim(), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json({ id: Number(id), name: name.trim() });
  } catch (err) {
    console.error("Update department error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE department
router.delete("/departments/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM departments WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete department error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- YEARS ---------------- */

// GET years by department
router.get("/years/:departmentId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM years WHERE department_id = ? ORDER BY year_level",
      [req.params.departmentId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Years fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST new year
router.post("/years", authMiddleware, requireAdmin, async (req, res) => {
  const { department_id, year_level } = req.body;

  if (!department_id || year_level === undefined || year_level === null || year_level === "") {
    return res.status(400).json({ message: "Missing data" });
  }

  try {
    const duplicate = await isDuplicate(
      "SELECT id FROM years WHERE department_id = ? AND year_level = ?",
      [department_id, year_level]
    );

    if (duplicate) {
      return res.json({ duplicate: true, message: "Year already exists for this department" });
    }

    const [result] = await pool.query(
      "INSERT INTO years (department_id, year_level) VALUES (?, ?)",
      [department_id, year_level]
    );

    res.json({ id: result.insertId, department_id, year_level });
  } catch (err) {
    console.error("Add year error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT update year
router.put("/years/:id", authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { department_id, year_level } = req.body;

  if (!department_id || year_level === undefined || year_level === null || year_level === "") {
    return res.status(400).json({ message: "Missing data" });
  }

  try {
    const duplicate = await isDuplicate(
      "SELECT id FROM years WHERE department_id = ? AND year_level = ? AND id <> ?",
      [department_id, year_level, id]
    );

    if (duplicate) {
       return res.json({ duplicate: true, message: "Year already exists for this department" });
    }

    const [result] = await pool.query(
      "UPDATE years SET department_id = ?, year_level = ? WHERE id = ?",
      [department_id, year_level, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Year not found" });
    }

    res.json({ id: Number(id), department_id, year_level });
  } catch (err) {
    console.error("Update year error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE year
router.delete("/years/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM years WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Year not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete year error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- SECTIONS ---------------- */

// GET sections by year
router.get("/sections/:yearId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM sections WHERE year_id = ? ORDER BY section_name",
      [req.params.yearId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Sections fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST new section
router.post("/sections", authMiddleware, requireAdmin, async (req, res) => {
  const { year_id, section_name } = req.body;

  if (!year_id || !section_name?.trim()) {
    return res.status(400).json({ message: "Missing data" });
  }

  try {
    const duplicate = await isDuplicate(
      "SELECT id FROM sections WHERE year_id = ? AND LOWER(section_name) = LOWER(?)",
      [year_id, section_name.trim()]
    );

    if (duplicate) {
      return res.json({ duplicate: true, message: "Section already exists for this department" });
    }

    const [result] = await pool.query(
      "INSERT INTO sections (year_id, section_name) VALUES (?, ?)",
      [year_id, section_name.trim()]
    );

    res.json({ id: result.insertId, year_id, section_name: section_name.trim() });
  } catch (err) {
    console.error("Add section error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT update section
router.put("/sections/:id", authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { year_id, section_name } = req.body;

  if (!year_id || !section_name?.trim()) {
    return res.status(400).json({ message: "Missing data" });
  }

  try {
    const duplicate = await isDuplicate(
      "SELECT id FROM sections WHERE year_id = ? AND LOWER(section_name) = LOWER(?) AND id <> ?",
      [year_id, section_name.trim(), id]
    );

    if (duplicate) {
      return res.json({ duplicate: true, message: "Section already exists for this department" });
    }

    const [result] = await pool.query(
      "UPDATE sections SET year_id = ?, section_name = ? WHERE id = ?",
      [year_id, section_name.trim(), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Section not found" });
    }

    res.json({ id: Number(id), year_id, section_name: section_name.trim() });
  } catch (err) {
    console.error("Update section error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE section
router.delete("/sections/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM sections WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Section not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete section error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- SUBJECTS ---------------- */

// GET subjects by year
router.get("/subjects/:yearId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM subjects WHERE year_id = ? ORDER BY name",
      [req.params.yearId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Subjects fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST new subject
router.post("/subjects", authMiddleware, requireAdmin, async (req, res) => {
  const { year_id, name } = req.body;

  if (!year_id || !name?.trim()) {
    return res.status(400).json({ message: "Missing data" });
  }

  try {
    const duplicate = await isDuplicate(
      "SELECT id FROM subjects WHERE year_id = ? AND LOWER(name) = LOWER(?)",
      [year_id, name.trim()]
    );

    if (duplicate) {
      return res.json({ duplicate: true, message: "Subject already exists for this department" });
    }

    const [result] = await pool.query(
      "INSERT INTO subjects (year_id, name) VALUES (?, ?)",
      [year_id, name.trim()]
    );

    res.json({ id: result.insertId, year_id, name: name.trim() });
  } catch (err) {
    console.error("Add subject error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT update subject
router.put("/subjects/:id", authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { year_id, name } = req.body;

  if (!year_id || !name?.trim()) {
    return res.status(400).json({ message: "Missing data" });
  }

  try {
    const duplicate = await isDuplicate(
      "SELECT id FROM subjects WHERE year_id = ? AND LOWER(name) = LOWER(?) AND id <> ?",
      [year_id, name.trim(), id]
    );

    if (duplicate) {
      return res.json({ duplicate: true, message: "Subject already exists for this department" });
    }

    const [result] = await pool.query(
      "UPDATE subjects SET year_id = ?, name = ? WHERE id = ?",
      [year_id, name.trim(), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Subject not found" });
    }

    res.json({ id: Number(id), year_id, name: name.trim() });
  } catch (err) {
    console.error("Update subject error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE subject
router.delete("/subjects/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM subjects WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Subject not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete subject error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;