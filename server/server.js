import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import protectedRoutes from "./routes/protected.js"; // ✅ add this
import usersRoutes from "./routes/users.js"; // ✅ import the route





dotenv.config();

const app = express();

app.use(cookieParser());
app.use(express.json());

// ✅ CORS setup
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// ✅ Routes
app.use("/api", authRoutes);
app.use("/api/protected", protectedRoutes); // ✅ protected APIs
app.use("/api", usersRoutes); // ✅ mount under /api
app.use("/api/users", usersRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
