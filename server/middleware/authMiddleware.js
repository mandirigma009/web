import jwt from "jsonwebtoken";
import pool from "../pool.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_dev_secret";
const IDLE_LIMIT = 60 * 60 * 1000; // 2 minutes (for testing)

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
      return res.status(401).json({ message: "Session expired" });
    }

    const { user_id, last_active } = rows[0];
    const lastActive = new Date(last_active).getTime();

    console.log("Session user_id:", user_id);
    console.log("Session token:", sessionToken);

    // 2️⃣ Idle timeout → DELETE session
    if (Date.now() - lastActive > IDLE_LIMIT) {
      const [result] = await pool.query(
        "DELETE FROM user_sessions WHERE user_id = ? AND session_token = ?",
        [user_id, sessionToken]
      );

      console.log("Deleted sessions (idle):", result.affectedRows);

      return res
        .status(401)
        .json({ message: "Session expired due to inactivity" });
    }

    // 3️⃣ Verify JWT
    if (!accessToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(accessToken, ACCESS_SECRET);

    // 4️⃣ Safety check: JWT user must match session user
    if (decoded.id !== user_id) {
      const [result] = await pool.query(
        "DELETE FROM user_sessions WHERE user_id = ? AND session_token = ?",
        [user_id, sessionToken]
      );

      console.log("Deleted sessions (mismatch):", result.affectedRows);

      return res.status(401).json({ message: "Session mismatch" });
    }

    // 5️⃣ Update activity
    await pool.query(
      `
      UPDATE user_sessions
      SET last_active = NOW()
      WHERE user_id = ? AND session_token = ?
      `,
      [user_id, sessionToken]
    );

    console.log("Session refreshed");

    req.user = decoded;
    req.user.id = user_id;
    next();
  } catch (err) {
    // 6️⃣ Invalid token → DELETE session
    if (sessionToken) {
      const [result] = await pool.query(
        "DELETE FROM user_sessions WHERE session_token = ?",
        [sessionToken]
      );

      console.log("Deleted session (invalid token):", result.affectedRows);
    }

    return res.status(401).json({ message: "Invalid token" });
  }
}
