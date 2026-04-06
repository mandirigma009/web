import cron from "node-cron";
import db from "../pool.js";
import { sendStatusEmail } from "../../src/utils/emailService.js";
import {
  currentPHDateTime,
  formatToPhilippineDateTime,
  toPH,
} from "../utils/dateUtils.js";

console.log("[Cron] Auto-cancel cron job started. Running every minute...");


cron.schedule("* * * * *", async () => {
  try {
    const nowPH = currentPHDateTime(); // YYYY-MM-DD HH:mm:ss PH time
   //------ console.log("\n[Cron] Current PH time:", nowPH);

    // 0️⃣ Get last processed time
    const [rows] = await db.query(`SELECT last_processed FROM cron_last_run WHERE id = 1`);
  //  const lastProcessed = rows[0].last_processed;
   //-------- console.log("[Cron] Last processed timestamp:", lastProcessed);
    // 1️⃣ Pending bookings that overlap with approved bookings
    const [conflictingPending] = await db.query(
      `
      SELECT b.id, b.room_id, b.reserved_by, b.email, b.date_reserved, 
             b.reservation_start, b.reservation_end, r.room_name
      FROM room_bookings b
      JOIN rooms r ON r.id = b.room_id
      WHERE b.status = 'pending'
        AND EXISTS (
          SELECT 1
          FROM room_bookings a
          WHERE a.room_id = b.room_id
            AND a.date_reserved = b.date_reserved
            AND a.status = 'approved'
            AND NOT (
              a.reservation_end <= b.reservation_start
              OR a.reservation_start >= b.reservation_end
            )
        )
      `
    );

    for (const b of conflictingPending) {
      // Reject the conflicting pending booking
      await db.query(
        `UPDATE room_bookings
         SET status = 'rejected',
             reject_reason = 'Overlapping with approved reservation',
             rejected_at = NOW()
         WHERE id = ?`,
        [b.id]
      );

      // Format booking for email
      const formattedBooking = {
        ...b,
        date: formatToPhilippineDateTime(b.date_reserved),
        start_time: b.reservation_start,
        end_time: b.reservation_end,
      };

      // Send rejection email
      await sendStatusEmail(formattedBooking, "rejected_conflict_with_approved");
    }




    // 2️⃣ Pending bookings to auto-cancel
    const [pendingToCancel] = await db.query(
    `
  SELECT id, room_name, reserved_by, email, date_reserved, reservation_start, status
  FROM room_bookings
  WHERE status = 'pending'
    AND STR_TO_DATE(CONCAT(date_reserved, ' ', reservation_start), '%Y-%m-%d %H:%i:%s') <= ?
  `,
  [nowPH]
    );

    for (const b of pendingToCancel) {

      // Update status in DB
      await db.query(
        `UPDATE room_bookings
        SET status = 'cancelled',
            reject_reason = 'Not approved before reservation start',
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

    /*
    if (pendingToCancel.length > 0) {
      console.log(`[Cron] Processed ${pendingToCancel.length} pending bookings.`);
    } else {
      console.log("[Cron] No pending bookings to auto-cancel right now.");
    }
      */

    // 3️⃣ Approved bookings to delete if passed
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
     
      await db.query(`DELETE FROM room_bookings WHERE id = ?`, [b.id]);
    }

    /*
    if (approvedToDelete.length > 0) {
      console.log(`[Cron] Deleted ${approvedToDelete.length} approved bookings.`);
    } else {
      console.log("[Cron] No approved bookings to auto-delete right now.");
    }
      */

    // 4️⃣ Update last_processed timestamp
    await db.query(`UPDATE cron_last_run SET last_processed = ? WHERE id = 1`, [nowPH]);
  } catch (err) {
    console.error("[Cron] Error in auto-cancel task:", err);
  }



  //

  // 5 Move old cancelled/rejected bookings to archive
try {
  const [movedRows] = await db.query(`
    INSERT INTO room_bookings_archive (
      id,
      room_id,
      reserved_by,
      user_id,
      email,
      date_reserved,
      reservation_start,
      reservation_end,
      notes,
      created_at,
      room_number,
      room_name,
      room_description,
      building_name,
      floor_number,
      assigned_by,
      status,
      is_archived,
      approved_at,
      reject_reason,
      rejected_at
    )
    SELECT
      id,
      room_id,
      reserved_by,
      user_id,
      email,
      date_reserved,
      reservation_start,
      reservation_end,
      notes,
      created_at,
      room_number,
      room_name,
      room_description,
      building_name,
      floor_number,
      assigned_by,
      status,
      1 AS is_archived,
      approved_at,
      reject_reason,
      rejected_at
    FROM room_bookings
    WHERE status IN ('cancelled', 'rejected')
      AND rejected_at < NOW() - INTERVAL 10 DAY
  `);

  if (movedRows.affectedRows > 0) {
    console.log(`[Cron] Moved ${movedRows.affectedRows} old cancelled/rejected bookings to archive.`);

    // Delete them from the main table
    const [deletedRows] = await db.query(`
      DELETE FROM room_bookings
      WHERE status IN ('cancelled', 'rejected')
        AND rejected_at < NOW() - INTERVAL 10 DAY
    `);

   //----------- console.log(`[Cron] Deleted ${deletedRows.affectedRows} archived bookings from main table.`);
 /* } else {
    //---console.log("[Cron] No old cancelled/rejected bookings to archive right now.");
    */
  }
} catch (err) {
  console.error("[Cron] Error archiving old bookings:", err);
}

});



