const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const authRoutes = require("./routes/auth");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ All auth routes under /api
app.use("/api", authRoutes);

// Example protected route
const authMiddleware = require("./middleware/authMiddleware");
app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({ message: `Hello ${req.user.email}, this is a protected route!` });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
