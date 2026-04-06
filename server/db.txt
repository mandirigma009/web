import mysql from "mysql2";
import dotenv from "dotenv";
// server.js


dotenv.config();

// ✅ Create MySQL connection

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "myapp",
  password: process.env.DB_PASS || "nay44@Qwerty1234.",
  database: process.env.DB_NAME || "myapp",
});

/*
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "myapp",
});
*/

// ✅ Connect and log status
db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
  console.log("✅ Connected to MySQL database");
});

export default db;
