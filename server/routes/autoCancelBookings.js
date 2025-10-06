// server/cron/autoCancelBookings.js
import cron from "node-cron";
import db from "../pool.js"; // Your MySQL connection

// Helper to format local date/time for MySQL DATETIME
function getCurrentLocalDateTime() {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// Schedule cron job to run every minute
cron.schedule("* * * * *", async () => {
  try {
    const currentDateTime = getCurrentLocalDateTime();
    console.log("[Cron] Current local server time for auto-cancel:", currentDateTime);

    // 1️⃣ Find expired bookings
    const [toDelete] = await db.query(
      `
      SELECT id, room_name, reserved_by, date_reserved, reservation_end
      FROM room_bookings
      WHERE STR_TO_DATE(CONCAT(date_reserved, ' ', reservation_end), '%Y-%m-%d %H:%i:%s') <= ?
      `,
      [currentDateTime]
    );

    if (toDelete.length === 0) {
      console.log("[Cron] No expired bookings to cancel.");
      return;
    }

    // 2️⃣ Log bookings that will be deleted
    console.log("[Cron] Bookings to delete:");
    toDelete.forEach((b) => {
      console.log(
        `ID: ${b.id}, Room: ${b.room_name}, User: ${b.reserved_by}, Date: ${b.date_reserved.toISOString().split("T")[0]}, EndTime: ${b.reservation_end}`
      );
    });

    // 3️⃣ Delete expired bookings
    const ids = toDelete.map((b) => b.id);
    const [result] = await db.query(
      `DELETE FROM room_bookings WHERE id IN (${ids.join(",")})`
    );

    // 4️⃣ Log deleted reservation end times
    console.log("[Cron] Deleted reservations end times:");
    toDelete.forEach((b) => console.log(b.reservation_end));

    console.log(`[Cron] Cancelled ${result.affectedRows} expired bookings.`);
  } catch (err) {
    console.error("[Cron] Error cancelling expired reservations:", err);
  }
});

console.log("[Cron] Auto-cancel cron job started. Running every minute...");
