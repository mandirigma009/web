// src/routes/roomBookings.js
import express from "express";
import db from "../pool.js";
import { sendStatusEmail } from "../../src/utils/emailService.js";

const router = express.Router();


/* ----------------------------------------
   Utility helpers used by /available-times
---------------------------------------- */
function timeToMinutes(t) {
  // accepts "HH:MM" or "HH:MM:SS"
  const parts = (t || "00:00").split(":").map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* ----------------------------------------
   GET /?room_id=...&date=...
   Returns booked time ranges (formatted HH:MM)
---------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const { room_id, date } = req.query;
    if (!room_id || !date)
      return res.status(400).json({ message: "room_id and date are required" });

    // Format reservation_start / reservation_end to HH:MM so frontend slot times match exactly
    const [rows] = await db.query(
      `SELECT 
         TIME_FORMAT(reservation_start, '%H:%i') AS reservation_start,
         TIME_FORMAT(reservation_end, '%H:%i') AS reservation_end,
         reserved_by
       FROM room_bookings
       WHERE room_id = ?
         AND status = 'approved'
         AND date_reserved = ?`,
      [room_id, date]
    );

    res.json(rows.map((r) => ({
      start: r.reservation_start,
      end: r.reservation_end,
      reserved_by: r.reserved_by,
    })));
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
        `SELECT b.*, r.chairs, r.has_tv, r.has_table, r.has_projector
       FROM room_bookings b
       JOIN rooms r ON r.id = b.room_id
       WHERE b.room_id = ? AND b.date_reserved = ?
       ORDER BY b.reservation_start`,
      [roomId, date]
    );

    res.json({ reservations: rows });
  } catch (err) {
    console.error("Error fetching reservations:", err);
    res.status(500).json({ message: "Failed to fetch reservations." });``
  }
});

// Returns { available: [...], reserved: [...] } for a given room/date
// available are continuous blocks (in HH:MM) between dayStart and dayEnd excluding reservations
// ------------------------
router.get("/available-times", async (req, res) => {
  try {
    const roomId = req.query.roomId || req.query.room_id;
    const date = req.query.date;

    if (!roomId || !date) {
      return res.status(400).json({ message: "roomId and date are required" });
    }

    // Fetch approved reservations for that room/date
    const [rows] = await db.query(
      `SELECT reservation_start, reservation_end 
       FROM room_bookings 
       WHERE room_id = ? AND date_reserved = ?
       AND status = 'approved'
       ORDER BY reservation_start ASC`,
      [roomId, date]
    );

    // Map reserved ranges
    const reservedRanges = rows.map(r => ({
      start: r.reservation_start,
      end: r.reservation_end,
    }));

    // Return reserved ranges only (no "available" calculation)
    res.json({
      reserved: reservedRanges,
    });
  } catch (err) {
    console.error("Error fetching available times:", err);
    res.status(500).json({ message: "Failed to fetch reserved times." });
  }
});



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
      subject,
      notes,
      roomNumber,
      roomDesc,
      roomName,
      floor,
      building,
      recurrence,
      status, // now fully respected from frontend
    } = req.body;

    if (!startTime || !endTime || !date)
      return res.status(400).json({ message: "Missing time or date." });

    const bookingsToSave = [];

    // Handle single or recurring bookings
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

    // Process each booking
    for (const b of bookingsToSave) {
      // Conflict check only if status is approved
      if (b.status === "approved") {
        const [existing] = await db.query(
          `SELECT * FROM room_bookings
           WHERE room_id = ? AND date_reserved = ?
           AND status = 'approved'
           AND NOT (reservation_end <= ? OR reservation_start >= ?)`,
          [roomId, b.date_reserved, startTime, endTime]
        );

        if (existing.length > 0) {
          return res.status(409).json({
            message: `Conflict: another approved booking exists on ${b.date_reserved}`,
          });
        }
      }

      // Insert new booking
      await db.query(
        `INSERT INTO room_bookings
         (room_id, reserved_by, user_id, email, assigned_by, date_reserved,
          reservation_start, reservation_end, subject, notes, room_number, room_description,
          room_name, floor_number, building_name, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          roomId,
          reserved_by,
          user_id,
          email,
          assigned_by,
          b.date_reserved,
          startTime,
          endTime,
          subject || null,
          notes || null,
          roomNumber,
          roomDesc,
          roomName,
          floor,
          building,
          b.status,
        ]
      );

      // Auto reject overlapping pending bookings if approved
      if (b.status === "approved") {
        const [pendingOverlap] = await db.query(
          `SELECT id, reserved_by, email, date_reserved, reservation_start, reservation_end
           FROM room_bookings
           WHERE room_id = ? AND date_reserved = ? AND status = 'pending'
           AND NOT (reservation_end <= ? OR reservation_start >= ?)`,
          [roomId, b.date_reserved, startTime, endTime]
        );

        for (const p of pendingOverlap) {
          await db.query(
            `UPDATE room_bookings
             SET status='rejected_by_admin', rejected_at=NOW(),
                 reject_reason='overlapped_with_approved_reservation'
             WHERE id=?`,
            [p.id]
          );

          // Send auto-reject email
          await sendStatusEmail(
            {
              reserved_by: p.reserved_by,
              email: p.email,
              room_name: roomName,
              date_reserved: p.date_reserved,
              reservation_start: p.reservation_start,
              reservation_end: p.reservation_end,
            },
            "autoRejected"
          );
        }
      }

      // Email logic
      // - skip sending email if created as "approved"
      // - only send for "pending" (normal user) or auto rejections
      if (b.status === "pending") {
        await sendStatusEmail(
          {
            reserved_by,
            email,
            room_name: roomName,
            date_reserved: b.date_reserved,
            reservation_start: startTime,
            reservation_end: endTime,
          },
          "pending"
        );
      }
    }

    res.json({ message: "Reservation(s) saved successfully!" });
  } catch (err) {
    console.error("❌ Error saving reservation:", err);
    res.status(500).json({ message: "Failed to save reservation." });
  }
});


/* ----------------------------------------
   GET /my-bookings/:id
---------------------------------------- */
router.get("/my-bookings/:id", async (req, res) => {
  try {
    const { id } = req.params; // user ID from URL
    const { role } = req.query; // or get from auth middleware if available

    let query = `
      SELECT 
        b.*, 
        r.chairs, r.has_tv, r.has_table, r.has_projector
      FROM room_bookings b
      JOIN rooms r ON r.id = b.room_id
      WHERE b.status = 'approved'
    `;
    const params = [];

    if (role === 3) {
      // Non-admin users can only see their own bookings
      query += " AND b.user_id = ?";
      params.push(id);
    }

    query += " ORDER BY b.date_reserved, b.reservation_start";

    const [bookings] = await db.query(query, params);

    res.json({ bookings });
  } catch (err) {
    console.error("Error fetching my bookings:", err);
    res.status(500).json({ error: "Server error fetching bookings" });
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

    let query = `SELECT b.*, r.chairs, r.has_tv, r.has_table, r.has_projector
                 FROM room_bookings b
                 JOIN rooms r ON r.id = b.room_id
                 WHERE b.status = 'pending'`;;
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

    let query = `SELECT b.*, r.chairs, r.has_tv, r.has_table, r.has_projector
                 FROM room_bookings b
                 JOIN rooms r ON r.id = b.room_id
                 WHERE b.status IN ('cancelled_not_approved_before_start', 'rejected_by_admin', 'cancelled')`;
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
    subject,
    notes,
    status,
  } = req.body;

  try {
    const [existing] = await db.query(`SELECT * FROM room_bookings WHERE id = ?`, [id]);
    if (!existing.length)
      return res.status(404).json({ message: "Reservation not found" });

    await db.query(
      `UPDATE room_bookings
       SET date_reserved = ?, reservation_start = ?, reservation_end = ?, subject = ?, notes = ?, status = ?
       WHERE id = ?`,
      [date_reserved, reservation_start, reservation_end, subject, notes, status, id]
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


export default router;
