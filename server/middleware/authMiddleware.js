import jwt from "jsonwebtoken";
import pool from "../pool.js";

<<<<<<< HEAD
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_dev_secret";
const IDLE_LIMIT = 30 * 60 * 1000; // 30 minutes (testing)
=======
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const IDLE_LIMIT = 15 * 60 * 1000; // 15 minutes
>>>>>>> dc04273 (Up need to edit for localhost)

export async function authMiddleware(req, res, next) {
  const accessToken =
    req.cookies?.accessToken ||
    req.headers.authorization?.split(" ")[1];

  const sessionToken = req.cookies?.sessionToken;

  if (!accessToken || !sessionToken) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    // 1️⃣ Verify JWT FIRST (cheap)
    const decoded = jwt.verify(accessToken, ACCESS_SECRET);

    // 2️⃣ Fetch session
    const [rows] = await pool.query(
      `
      SELECT user_id, last_active
      FROM user_sessions
      WHERE session_token = ?
      `,
      [sessionToken]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Session expired" });
    }

    const { user_id, last_active } = rows[0];

    // 3️⃣ Idle timeout
    if (Date.now() - new Date(last_active).getTime() > IDLE_LIMIT) {
      await pool.query(
        "DELETE FROM user_sessions WHERE session_token = ?",
        [sessionToken]
      );
      return res.status(401).json({ message: "Session timed out" });
    }

    // 4️⃣ Match JWT ↔ session
    if (decoded.id !== user_id) {
      return res.status(401).json({ message: "Session mismatch" });
    }

    // 5️⃣ Update activity (non-blocking)
    pool.query(
      "UPDATE user_sessions SET last_active = NOW() WHERE session_token = ?",
      [sessionToken]
    ).catch(() => {});

    req.user = decoded;
    req.user.id = user_id;

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
}
