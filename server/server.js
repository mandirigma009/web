import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import protectedRoutes from "./routes/protected.js";
import usersRoutes from "./routes/users.js";
import roomsRoutes from "./routes/rooms.js";
import pool from "./pool.js"; // ✅ use pool instead of db
import "./routes/roomsCleanup.js";


dotenv.config();

const app = express();

app.use(cookieParser());
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use("/api", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api", usersRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/rooms", roomsRoutes);


// ✅ Fix booking route
app.post("/api/rooms/book", async (req, res) => {
  try {
    const { roomId, date, startTime, endTime, notes, reserved_by } = req.body;

    if (!roomId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
