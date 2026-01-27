import jwt from "jsonwebtoken";
import pool from "../pool.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_dev_secret";
const IDLE_LIMIT = 30 * 60 * 1000; // 30 minutes (testing)

export async function authMiddleware(req, res, next) {
  const accessToken =
    req.cookies?.accessToken ||
    req.headers.authorization?.split(" ")[1];

  const sessionToken = req.cookies?.sessionToken;

  if (!sessionToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // 1️⃣ Fetch session
    const [rows] = await pool.query(
      `
      SELECT user_id, last_active
      FROM user_sessions
      WHERE session_token = ?
      `,
      [sessionToken]
    );

    if (!rows.length) {
      await pool.query(
        "DELETE FROM user_sessions WHERE session_token = ?",
        [sessionToken]
      );
      return res.status(401).json({ message: "Session expired" });
    }

    const { user_id, last_active } = rows[0];
    const lastActive = new Date(last_active).getTime();

    // 2️⃣ Idle timeout
    if (Date.now() - lastActive > IDLE_LIMIT) {
      await pool.query(
        "DELETE FROM user_sessions WHERE session_token = ?",
        [sessionToken]
      );

      return res
        .status(401)
        .json({ message: "Session expired due to inactivity" });
    }

    // 3️⃣ Verify JWT
    if (!accessToken) {
      await pool.query(
        "DELETE FROM user_sessions WHERE session_token = ?",
        [sessionToken]
      );
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(accessToken, ACCESS_SECRET);

    // 4️⃣ JWT must match session user
    if (decoded.id !== user_id) {
      await pool.query(
        "DELETE FROM user_sessions WHERE session_token = ?",
        [sessionToken]
      );
      return res.status(401).json({ message: "Session mismatch" });
    }

    // 5️⃣ Update activity
    await pool.query(
      `
      UPDATE user_sessions
      SET last_active = NOW()
      WHERE session_token = ?
      `,
      [sessionToken]
    );

    req.user = decoded;
    req.user.id = user_id;

    next();
  } catch (err) {
    // 6️⃣ Invalid JWT
    await pool.query(
      "DELETE FROM user_sessions WHERE session_token = ?",
      [sessionToken]
    );

    return res.status(401).json({ message: "Invalid token" });
  }
}
