// server/pool.js
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
 host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "myapp",

   /* host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "myapp",
  password: process.env.DB_PASS || "nay44@Qwerty1234.",
  database: process.env.DB_NAME || "myapp",

 
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "myapp",
});
*/

  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export default pool;