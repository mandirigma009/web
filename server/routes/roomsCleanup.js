import pool from "../pool.js"; // adjust path if needed

const cancelExpiredReservations = async () => {
  try {
    const now = new Date();
    const nowStr = now.toISOString().slice(0, 19).replace("T", " ");
    const [result] = await pool.query(
      `UPDATE rooms
       SET status = 1,
           reserved_by = NULL,
           date_reserved = NULL,
           reservation_start = NULL,
           reservation_end = NULL
       WHERE status = 2 AND reservation_end < ?`,
      [nowStr]
    );
    if (result.affectedRows > 0) {
      console.log(`✅ Cancelled ${result.affectedRows} expired reservations`);
    }
  } catch (err) {
    console.error("❌ Error cancelling expired reservations:", err);
  }
};

// Run every minute
setInterval(cancelExpiredReservations, 60 * 1000);
// Run once on startup
cancelExpiredReservations();
