// src/routes/roomBookings.js
import express from "express";
import db from "../pool.js";
import { sendStatusEmail } from "../../src/utils/emailService.js";

const router = express.Router();

/* ----------------------------------------
   Helper: get recurring dates
---------------------------------------- */
const getRecurringDates = (startDate, endDate, selectedDays) => {
  const daysMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates = [];
  let current = new Date(start);

  while (current <= end) {
    const dayNum = current.getDay();
    const currentDay = Object.keys(daysMap).find((k) => daysMap[k] === dayNum);
    if (selectedDays.includes(currentDay)) {
      dates.push(current.toISOString().split("T")[0]);
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

/* ----------------------------------------
   GET /?room_id=...&date=...
   Returns booked time ranges
---------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const { room_id, date } = req.query;
    if (!room_id || !date)
      return res.status(400).json({ message: "room_id and date are required" });

    const [rows] = await db.query(
      `SELECT reservation_start, reservation_end FROM room_bookings WHERE room_id = ? AND date_reserved = ?`,
      [room_id, date]
    );

    res.json(rows.map((r) => ({ start: r.reservation_start, end: r.reservation_end })));
  } catch (err) {
    console.error("Error fetching booked times:", err);
    res.status(500).json({ message: "Failed to fetch booked times." });
  }
});

/* ----------------------------------------
   GET /reservations?roomId=...&date=...
---------------------------------------- */
router.get("/reservations", async (req, res) => {
  try {
    const roomId = req.query.roomId || req.query.room_id;
    const date = req.query.date;
    if (!roomId || !date)
      return res.status(400).json({ message: "roomId and date are required" });

    const [rows] = await db.query(
      `SELECT id, room_id, reserved_by, user_id, assigned_by, date_reserved, reservation_start AS start_time, reservation_end AS end_time, notes, status 
       FROM room_bookings WHERE room_id = ? AND date_reserved = ? ORDER BY reservation_start`,
      [roomId, date]
    );

    res.json({ reservations: rows });
  } catch (err) {
    console.error("Error fetching reservations:", err);
    res.status(500).json({ message: "Failed to fetch reservations." });
  }
});

/* ----------------------------------------
   GET /available-times?roomId=...&date=...
---------------------------------------- */
router.get("/available-times", async (req, res) => {
  try {
    const roomId = req.query.roomId || req.query.room_id;
    const date = req.query.date;
    if (!roomId || !date)
      return res.status(400).json({ message: "roomId and date are required" });

    const [rows] = await db.query(
      `SELECT reservation_start, reservation_end FROM room_bookings WHERE room_id = ? AND date_reserved = ? AND status = 'approved' ORDER BY reservation_start ASC`,
      [roomId, date]
    );

    const reservedRanges = rows.map((r) => ({
      start: r.reservation_start,
      end: r.reservation_end,
    }));

    const timeToMinutes = (t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const minutesToTime = (m) => {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    };

    const dayStart = timeToMinutes("07:00");
    const dayEnd = timeToMinutes("13:00");
    const reservedMins = reservedRanges
      .map((r) => ({ start: timeToMinutes(r.start), end: timeToMinutes(r.end) }))
      .sort((a, b) => a.start - b.start);

    const merged = [];
    for (const i of reservedMins) {
      if (!merged.length) merged.push({ ...i });
      else {
        const last = merged[merged.length - 1];
        if (i.start <= last.end) last.end = Math.max(last.end, i.end);
        else merged.push({ ...i });
      }
    }

    const available = [];
    let cursor = dayStart;
    for (const r of merged) {
      if (r.start > cursor) available.push({ start: cursor, end: r.start });
      cursor = Math.max(cursor, r.end);
    }
    if (cursor < dayEnd) available.push({ start: cursor, end: dayEnd });

    res.json({
      available: available.map((r) => ({
        start: minutesToTime(r.start),
        end: minutesToTime(r.end),
      })),
      reserved: reservedRanges,
    });
  } catch (err) {
    console.error("Error fetching available times:", err);
    res.status(500).json({ message: "Failed to fetch available times." });
  }
});

/* ----------------------------------------
   POST /book – single or recurring booking
---------------------------------------- */
router.post("/book", async (req, res) => {
  try {
    const {
      roomId,
      reserved_by,
      assigned_by,
      user_id,
      email,
      date,
      startTime,
      endTime,
      notes,
      roomNumber,
      roomDesc,
      roomName,
      floor,
      building,
      recurrence,
      status,
    } = req.body;

    if (!startTime || !endTime || !date)
      return res.status(400).json({ message: "Missing time or date." });

    const bookingsToSave = [];

    if (!recurrence || recurrence.type === "once") {
      bookingsToSave.push({ date_reserved: date, status });
    } else {
      const { start_date, end_date, days } = recurrence;
      if (!days || days.length === 0)
        return res.status(400).json({ message: "Recurring days required." });
      getRecurringDates(start_date, end_date, days).forEach((d) =>
        bookingsToSave.push({ date_reserved: d, status })
      );
    }

    for (const b of bookingsToSave) {
      if (status === "approved") {
        const [existing] = await db.query(
          `SELECT * FROM room_bookings WHERE room_id = ? AND date_reserved = ? 
           AND status = 'approved' AND NOT (reservation_end <= ? OR reservation_start >= ?)`,
          [roomId, b.date_reserved, startTime, endTime]
        );
        if (existing.length > 0)
          return res.status(409).json({
            message: `Conflict: another approved booking exists on ${b.date_reserved}`,
          });
      }

      const [insert] = await db.query(
        `INSERT INTO room_bookings
         (room_id, reserved_by, user_id, email, assigned_by, date_reserved,
          reservation_start, reservation_end, notes, room_number, room_description,
          room_name, floor_number, building_name, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          roomId,
          reserved_by,
          user_id,
          email,
          assigned_by,
          b.date_reserved,
          startTime,
          endTime,
          notes || null,
          roomNumber,
          roomDesc,
          roomName,
          floor,
          building,
          b.status,
        ]
      );

      if (b.status === "approved") {
        const [pendingOverlap] = await db.query(
          `SELECT id, reserved_by, email FROM room_bookings 
           WHERE room_id = ? AND date_reserved = ? AND status = 'pending'
           AND NOT (reservation_end <= ? OR reservation_start >= ?)`,
          [roomId, b.date_reserved, startTime, endTime]
        );

        for (const p of pendingOverlap) {
          await db.query(
            `UPDATE room_bookings SET status='rejected_by_admin', rejected_at=NOW() WHERE id=?`,
            [p.id]
          );

          await sendStatusEmail(
            {
              ...p,
              room_name: roomName,
              date: b.date_reserved,
              start_time: startTime,
              end_time: endTime,
            },
            "autoRejected"
          );
        }

        await sendStatusEmail(
          {
            reserved_by,
            email,
            room_name: roomName,
            date: b.date_reserved,
            start_time: startTime,
            end_time: endTime,
          },
          "approved"
        );
      }
    }

    res.json({ message: "Reservation(s) saved successfully!" });
  } catch (err) {
    console.error("Error saving reservation:", err);
    res.status(500).json({ message: "Failed to save reservation." });
  }
});

/* ----------------------------------------
   GET /my-bookings/:id
---------------------------------------- */
router.get("/my-bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [bookings] = await db.query(
      `SELECT * FROM room_bookings WHERE user_id = ? AND status = 'approved' ORDER BY date_reserved, reservation_start`, 
      [id]
    );
    res.json({ bookings });
  } catch (err) {
    console.error("Error fetching user bookings:", err);
    res.status(500).json({ message: "Failed to fetch bookings." });
  }
});



/* ----------------------------------------
   PUT /approve/:id
*/
router.put("/approve/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [bookings] = await db.query(`SELECT * FROM room_bookings WHERE id=?`, [id]);
    if (!bookings.length)
      return res.status(404).json({ message: "Reservation not found" });

    const booking = bookings[0];
    await db.query(
      `UPDATE room_bookings SET status='approved', reject_reason = 'approved', approved_at=NOW() WHERE id=?`,
      [id]
    );

    const [pendingOverlaps] = await db.query(
      `SELECT * FROM room_bookings WHERE room_id=? AND date_reserved=? AND status='pending'
       AND NOT (reservation_end <= ? OR reservation_start >= ?)`,
      [
        booking.room_id,
        booking.date_reserved,
        booking.reservation_start,
        booking.reservation_end,
      ]
    );

    for (const p of pendingOverlaps) {
      await db.query(
        `UPDATE room_bookings SET status='rejected_by_admin',  reject_reason = 'Overlapping with another approved reservation', rejected_at=NOW() WHERE id=?`,
        [p.id]
      );
      await sendStatusEmail(
        {
          ...p,
          room_name: booking.room_name,
          date: booking.date_reserved,
          start_time: booking.reservation_start,
          end_time: booking.reservation_end,
        },
        "autoRejected"
      );
    }

    await sendStatusEmail(
      {
        ...booking,
        room_name: booking.room_name,
        date: booking.date_reserved,
        start_time: booking.reservation_start,
        end_time: booking.reservation_end,
      },
      "approved"
    );

    res.json({ message: "Reservation approved successfully." });
  } catch (err) {
    console.error("Error approving reservation:", err);
    res.status(500).json({ message: "Failed to approve reservation." });
  }
});



/* ----------------------------------------
   PUT /reject/:id
---------------------------------------- */
router.put("/reject/:id", async (req, res) => {
  const { id } = req.params;
  //const { reason } = req.body;
   //  [reason || null, id]
   const reason = "rejected by admin";
  try {
    const [bookings] = await db.query(`SELECT * FROM room_bookings WHERE id=?`, [id]);
    if (!bookings.length)
      return res.status(404).json({ message: "Reservation not found" });
    const booking = bookings[0];

    await db.query(
      `UPDATE room_bookings SET status='rejected_by_admin', reject_reason=?, rejected_at=NOW() WHERE id=?`,
      [reason || null, id]
    );

    await sendStatusEmail(
      {
        ...booking,
        room_name: booking.room_name,
        date: booking.date_reserved,
        start_time: booking.reservation_start,
        end_time: booking.reservation_end,
      },
      "rejected"
    );

    res.json({ message: "Reservation rejected successfully." });
  } catch (err) {
    console.error("Error rejecting reservation:", err);
    res.status(500).json({ message: "Failed to reject reservation." });
  }
});

/* ----------------------------------------
   PUT /auto-cancel-pending
---------------------------------------- */
router.put("/auto-cancel-pending", async (req, res) => {
  try {
    const [pending] = await db.query(
      `SELECT * FROM room_bookings WHERE status='pending' AND TIMESTAMP(date_reserved,reservation_start)<=NOW()`
    );

    for (const p of pending) {
      await db.query(
        `UPDATE room_bookings SET status='cancelled_not_approved_before_start', auto_cancelled_at=NOW() WHERE id=?`,
        [p.id]
      );
      await sendStatusEmail(
        {
          ...p,
          room_name: p.room_name,
          date: p.date_reserved,
          start_time: p.reservation_start,
          end_time: p.reservation_end,
        },
        "cancelled"
      );
    }

    res.json({ message: `Auto-cancelled ${pending.length} pending reservations.` });
  } catch (err) {
    console.error("Error auto-cancelling pending reservations:", err);
    res.status(500).json({ message: "Failed to auto-cancel." });
  }
});


// GET /reservations/pending

router.get("/pending", async (req, res) => {
  try {
    const { userRole, userId } = req.query; // pass these from frontend

    let query = "SELECT * FROM room_bookings WHERE status = 'pending'";
    const params = [];

    if (userRole == 3 && userId) {
      query += " AND user_id = ?";
      params.push(userId);
    }

    query += " ORDER BY date_reserved, reservation_start";

    const [bookings] = await db.query(query, params);

    res.json({ bookings });
  } catch (err) {
    console.error("Error fetching pending bookings:", err);
    res.status(500).json({ message: "Failed to fetch pending bookings." });
  }
});

// GET /reservations/rejected

router.get("/rejected", async (req, res) => {
  try {
    const { userRole, userId } = req.query; // pass these from frontend

    let query = "SELECT * FROM room_bookings WHERE status IN ('cancelled_not_approved_before_start', 'rejected_by_admin', 'cancelled')";
    const params = [];

    if (userRole == 3 && userId) {
      query += " AND user_id = ?";
      params.push(userId);
    }

    query += " ORDER BY date_reserved, reservation_start";

    const [bookings] = await db.query(query, params);

    res.json({ bookings });
  } catch (err) {
    console.error("Error fetching rejected bookings:", err);
    res.status(500).json({ message: "Failed to fetch rejected bookings." });
  }
});


// update pending for approval
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    date_reserved,
    reservation_start,
    reservation_end,
    notes,
    status,
  } = req.body;

  try {
    const [existing] = await db.query(`SELECT * FROM room_bookings WHERE id = ?`, [id]);
    if (!existing.length)
      return res.status(404).json({ message: "Reservation not found" });

    await db.query(
      `UPDATE room_bookings
       SET date_reserved = ?, reservation_start = ?, reservation_end = ?, notes = ?, status = ?
       WHERE id = ?`,
      [date_reserved, reservation_start, reservation_end, notes, status, id]
    );

    res.json({ message: "Reservation updated successfully." });
  } catch (err) {
    console.error("Error updating reservation:", err);
    res.status(500).json({ message: "Failed to update reservation." });
  }
});


router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM room_bookings WHERE id = ?", [id]);
    res.json({ message: "Reservation deleted successfully." });
  } catch (err) {
    console.error("Delete reservation error:", err);
    res.status(500).json({ message: "Failed to delete reservation." });
  }
});



// near top of file (so you can see it when server starts)
console.log("✅ roomBookings router loaded");



/* ----------------------------------------
   PUT /cancel/:id
   Cancel reservation (user or admin)
---------------------------------------- */
// CANCEL ROOM BOOKING
router.put("/cancel/:id", async (req, res) => {
  const { id } = req.params;
  const { reject_reason } = req.body;

  try {
    if (!reject_reason || reject_reason.trim() === "") {
      return res.status(400).json({ message: "Cancellation reason is required." });
    }

    const sql = `
      UPDATE room_bookings 
      SET status='cancelled', 
          reject_reason=?, 
          rejected_at=NOW() 
      WHERE id=?`;

    const [result] = await db.query(sql, [reject_reason, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Booking not found." });
    }

    res.json({ message: "Booking cancelled successfully." });
  } catch (err) {
    console.error("Error cancelling booking:", err);
    res.status(500).json({ message: "Failed to cancel booking." });
  }
});


/**
 * POST /reservations/approve/:id
 * Approve a reservation, reject overlaps, and send emails
 */
/**

router.post("/approve/:id", async (req, res) => {
  const { id } = req.params;
  const { approverName } = req.body;

  try {
    // 1️⃣ Get reservation to approve
    const [[booking]] = await db.query("SELECT * FROM room_bookings WHERE id = ?", [id]);
    if (!booking) return res.status(404).json({ message: "Reservation not found" });

    // 2️⃣ Approve it
    await db.query(
      "UPDATE room_bookings SET status = 'approved', reject_reason = 'approved', approved_at = NOW() WHERE id = ?",
      [approverName, id]
    );

    // Send email to approver (user who made the booking)
    await sendStatusEmail(booking, "approved");

    // 3️⃣ Find overlapping pending bookings (same room, same date)
    const [conflicts] = await db.query(
      `
      SELECT * FROM room_bookings
      WHERE room_id = ?
        AND status = 'pending'
        AND DATE(date_reserved) = DATE(?)
        AND (
          (reservation_start < ? AND reservation_end > ?) OR
          (reservation_start >= ? AND reservation_start < ?)
        )
    `,
      [
        booking.room_id,
        booking.date_reserved,
        booking.reservation_end,
        booking.reservation_start,
        booking.reservation_start,
        booking.reservation_end,
      ]
    );

    // 4️⃣ Reject conflicts if any
    if (conflicts.length > 0) {
      const ids = conflicts.map((r) => r.id);
      const placeholders = ids.map(() => "?").join(",");
      const rejectReason = "Overlapping with another approved reservation";

      // 🧩 Debug log — print what will be rejected
      console.log("🔍 Auto-rejecting conflicts:", ids);
      console.log("📝 Reject reason:", rejectReason);

      const [result] = await db.query(
        `UPDATE room_bookings 
         SET 
           status = 'rejected_by_admin',
           reject_reason = ?,
           rejected_at = NOW()
         WHERE id IN (${placeholders})`,
        [rejectReason, ...ids]
      );

      console.log("✅ MySQL Update Result:", result);

      // Verify data immediately after update
      const [check] = await db.query(
        `SELECT id, status, reject_reason, rejected_at FROM room_bookings WHERE id IN (${placeholders})`,
        ids
      );
      console.log("📦 Updated Rows:", check);

      // Send emails to rejected users
      for (const conflict of conflicts) {
        await sendStatusEmail(conflict, "autoRejected");
      }
    }

    res.json({
      message: `Reservation approved. ${conflicts.length} overlapping bookings were auto-rejected.`,
      rejectedCount: conflicts.length,
    });
  } catch (err) {
    console.error("❌ Error in approving reservation:", err);
    res.status(500).json({ message: "Internal server error while approving reservation" });
  }
});

 */

export default router;
