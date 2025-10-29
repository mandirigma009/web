// server.js
import "./jobs/archiveJob.js"; // keep at top-level so it runs automatically
// index.js or wherever routes are mounted
import roomBookingsRouter from "./routes/roomBookings.js";
app.use("/api/reservations", roomBookingsRouter);



const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const authRoutes = require("./routes/auth");
const authMiddleware = require("./middleware/authMiddleware");

// ✅ New routes for rooms, assignments, and availability
const roomRoutes = require("./routes/rooms");
const assignmentRoutes = require("./routes/assignments");
const availabilityRoutes = require("./routes/availability");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Existing routes (keep untouched)
app.use("/api", authRoutes);

// ✅ New backend endpoints (require login for sensitive actions)
app.use("/api/rooms", authMiddleware, roomRoutes);
app.use("/api/assignments", authMiddleware, assignmentRoutes);
app.use("/api/availability", authMiddleware, availabilityRoutes);

// ✅ Example protected route
app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({ message: `Hello ${req.user.email}, this is a protected route!` });
});
app.listen(5000, () => console.log("✅ Server running on port 5000 yes yes yes"));
// ✅ Health check route (optional but helpful)
app.get("/", (req, res) => {
  res.send("✅ Backend server running successfully");
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
