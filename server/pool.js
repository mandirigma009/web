import mysql from "mysql2/promise";
import dotenv from "dotenv";
import "./routes/autoCancelBookings.js";


dotenv.config();

// ✅ Create MySQL connection
const pool = mysql.createPool({
   host: "localhost",
  user: "root",        // ✅ your DB username
  password: "",// ✅ your DB password
  database: "myapp",
});



export default pool;
