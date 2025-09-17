import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();

// ✅ Middleware
app.use(cookieParser()); //Parses cookies sent from the browser for handling authentication tokens.
app.use(express.json()); //Parses incoming JSON request

// ✅ CORS setup for cookie-based auth
app.use(
  cors({ //Enables Cross-Origin Resource Sharing, allowing your frontend to communicate with the backend.
    origin: "http://localhost:5173", // change to your frontend origin
    credentials: true, // allow cookies
  })
);

// ✅ Routes
app.use("/api", authRoutes);

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
