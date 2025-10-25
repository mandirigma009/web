import cron from "node-cron";
import db from "../pool.js";
import { sendStatusEmail } from "../../src/utils/emailService.js";
import {
  currentPHDateTime,
  formatToPhilippineDateTime,
  toPH,
} from "../utils/dateUtils.ts";

console.log("[Cron] Auto-cancel cron job started. Running every minute...");

cron.schedule("* * * * *", async () => {
  try {
    const nowPH = currentPHDateTime(); // YYYY-MM-DD HH:mm:ss PH time
    console.log("\n[Cron] Current PH time:", nowPH);

    // 0️⃣ Get last processed time
    const [rows] = await db.query(`SELECT last_processed FROM cron_last_run WHERE id = 1`);
    const lastProcessed = rows[0].last_processed;
    console.log("[Cron] Last processed timestamp:", lastProcessed);

    // 1️⃣ Pending bookings to auto-cancel
    const [pendingToCancel] = await db.query(
      `
      SELECT id, room_name, reserved_by, email, date_reserved, reservation_start, status
      FROM room_bookings
      WHERE status = 'pending'
      AND STR_TO_DATE(CONCAT(date_reserved, ' ', reservation_start), '%Y-%m-%d %H:%i:%s') > ?
      AND STR_TO_DATE(CONCAT(date_reserved, ' ', reservation_start), '%Y-%m-%d %H:%i:%s') <= ?
      `,
      [lastProcessed, nowPH]
    );

    for (const b of pendingToCancel) {
      console.log(`[Cron] Pending booking to cancel:`, b);

      // Update status in DB
      await db.query(
        `UPDATE room_bookings
         SET status = 'cancelled_not_approved_before_start',
             reject_reason = 'cancelled, not approved before start',
             rejected_at = NOW()
         WHERE id = ?`,
        [b.id]
      );

      // Format date/time to PH before sending email
      const formattedBooking = {
        ...b,
        date: formatToPhilippineDateTime(b.date_reserved),
        start_time: b.reservation_start,
        end_time: b.reservation_end || "",
      };

      await sendStatusEmail(formattedBooking, "cancelled_not_approved_before_start");
    }

    if (pendingToCancel.length > 0) {
      console.log(`[Cron] Processed ${pendingToCancel.length} pending bookings.`);
    } else {
      console.log("[Cron] No pending bookings to auto-cancel right now.");
    }

    // 2️⃣ Approved bookings to delete if passed
    const [approvedToDelete] = await db.query(
      `
      SELECT id, room_name, reserved_by, email, date_reserved, reservation_end, status
      FROM room_bookings
      WHERE status = 'approved'
      AND STR_TO_DATE(CONCAT(date_reserved, ' ', reservation_end), '%Y-%m-%d %H:%i:%s') <= ?
      `,
      [nowPH]
    );

    for (const b of approvedToDelete) {
      console.log(`[Cron] Approved booking passed: deleting ID ${b.id}`);
      await db.query(`DELETE FROM room_bookings WHERE id = ?`, [b.id]);
    }

    if (approvedToDelete.length > 0) {
      console.log(`[Cron] Deleted ${approvedToDelete.length} approved bookings.`);
    } else {
      console.log("[Cron] No approved bookings to auto-delete right now.");
    }

    // 3️⃣ Update last_processed timestamp
    await db.query(`UPDATE cron_last_run SET last_processed = ? WHERE id = 1`, [nowPH]);
  } catch (err) {
    console.error("[Cron] Error in auto-cancel task:", err);
  }
});
