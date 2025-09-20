import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// ✅ Create MySQL connection
const pool = mysql.createPool({
   host: "localhost",
  user: "root",        // ✅ your DB username
  password: "",// ✅ your DB password
  database: "myapp",
});



export default pool;
