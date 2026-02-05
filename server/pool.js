// server/pool.js
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();


const pool = mysql.createPool({
  host: "localhost",
  user: "myapp",
  password: "nay44Qwerty1234.",
  database: "myapp",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
/*

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "myapp",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
*/
export default pool;
