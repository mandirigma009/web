import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.js";
import protectedRoutes from "./routes/protected.js";
import usersRoutes from "./routes/users.js";
import roomsRoutes from "./routes/rooms.js";
import pool from "./pool.js";
import roomBookingsRoutes from "./routes/roomBookings.js";
import "./routes/autoCancelBookings.js";
import buildingsRouter from "./routes/buildings.js";
import adminMetricsRoutes from "./routes/useAdminMetrics.js";
import academicRoutes from "./routes/academicRoutes.js";
import publicAcademicRoutes from "./routes/publicAcademic.js";



const app = express();
app.use("/api", publicAcademicRoutes);
// Middlewares
app.use(cookieParser());
app.use(express.json());

// CORS for frontend
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        "https://classroommanagement.online",
        "http://localhost:5173"
      ];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);


// sessionCleanup.js or inside server.js

setInterval(async () => {
  try {
    console.log("🧹 Cleaning expired sessions...");

    await pool.query(`
      DELETE FROM user_sessions
      WHERE last_active < NOW() - INTERVAL 15 MINUTE
    `);

  } catch (err) {
    console.error("❌ Cleanup error:", err);
  }
}, 5 * 60 * 1000); // runs every 5 minutes


// Routes
app.use("/api", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api", usersRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/room_bookings", roomBookingsRoutes);
app.use("/api/buildings", buildingsRouter);
app.use("/api/admin", adminMetricsRoutes);
app.use("/api", academicRoutes);


// Example booking route
app.post("/api/rooms/book", async (req, res) => {
  try {
    const { roomId, date, startTime, endTime, notes, reserved_by } = req.body;
    if (!roomId || !date || !startTime || !endTime)
      return res.status(400).json({ message: "Missing required fields" });

    await pool.query(
      `UPDATE rooms 
       SET status = 2, reserved_by = ?, reservation_start = ?, reservation_end = ?, date_reserved = ? 
       WHERE id = ?`,
      [reserved_by || "Unknown", startTime, endTime, date, roomId]
    );

    res.json({ message: "Room booked successfully" });
  } catch (err) {
    console.error("❌ Error booking room:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Start Node backend (HTTP only)
const PORT = process.env.PORT || 5000;
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`🚀 Node API running on port ${PORT}`);
});
