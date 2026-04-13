// src/routes/roomBookings.js
import express from "express";
import db from "../pool.js";
import { sendStatusEmail } from "../../src/utils/emailService.js";
import { saveReservations } from "../utils/reservationService.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(authMiddleware);



/* ----------------------------------------
   Utility helpers used by /available-times
----------------------------------------
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
   */

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

    if (!roomId || !date) {
      return res.status(400).json({
        message: "roomId and date are required",
      });
    }

    const [rows] = await db.query(
      `SELECT
        b.*,
        r.chairs,
        r.has_tv,
        r.has_table,
        r.has_projector,
        y.year_level,
        s.section_name
      FROM room_bookings b
      JOIN rooms r ON r.id = b.room_id
      LEFT JOIN years y ON y.id = b.year_id
      LEFT JOIN sections s ON s.id = b.section_id
      WHERE b.room_id = ?
      AND b.date_reserved = ?
      ORDER BY b.reservation_start`,
      [roomId, date]
    );

    res.json({ reservations: rows });
  } catch (err) {
    console.error("Error fetching reservations:", err);
    res.status(500).json({
      message: "Failed to fetch reservations.",
    });
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
   GET /my-bookings/:id
---------------------------------------- */
router.get("/my-bookings/:id", async (req, res) => {
  try {
    const { id } = req.params; // user ID from URL
    const { role } = req.query; // or get from auth middleware if available

let query = `
  SELECT 
    b.*, 
    r.chairs,
    r.has_tv,
    r.has_table,
    r.has_projector,
    y.year_level,
    s.section_name
  FROM room_bookings b
  JOIN rooms r ON r.id = b.room_id
  LEFT JOIN years y ON y.id = b.year_id
  LEFT JOIN sections s ON s.id = b.section_id
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
  const bookingId = Number(req.params.id);

  if (!bookingId || isNaN(bookingId)) {
    return res.status(400).json({ message: "Invalid booking ID" });
  }

  const conn = await db.getConnection();
  let committed = false;

  try {
    await conn.beginTransaction();

    /* =========================================
       1. GET BOOKING
    ========================================= */
    const [rows] = await conn.query(
      `SELECT * FROM room_bookings WHERE id = ? FOR UPDATE`,
      [bookingId]
    );

    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = rows[0];

    /* =========================================
       2. CHECK APPROVED CONFLICTS (ROOM)
    ========================================= */
async function checkApprovedConflicts(conn, booking) {
  const [room] = await conn.query(
    `SELECT 1 FROM room_bookings
     WHERE room_id = ?
       AND date_reserved = ?
       AND status = 'approved'
       AND NOT (reservation_end <= ? OR reservation_start >= ?)`,
    [booking.roomId, booking.date, booking.startTime, booking.endTime]
  );

  const [teacher] = await conn.query(
    `SELECT 1 FROM room_bookings
     WHERE user_id = ?
       AND date_reserved = ?
       AND status = 'approved'
       AND NOT (reservation_end <= ? OR reservation_start >= ?)`,
    [booking.user_id, booking.date, booking.startTime, booking.endTime]
  );

  return room.length > 0 || teacher.length > 0;
}

    if (roomConflict.length) {
      await conn.rollback();
      return res.status(409).json({
        message: "Room already has an approved booking in this time slot.",
      });
    }

    /* =========================================
       3. CHECK APPROVED CONFLICTS (TEACHER)
    ========================================= */
    const [teacherConflict] = await conn.query(
      `SELECT 1
       FROM room_bookings
       WHERE user_id = ?
         AND date_reserved = ?
         AND status = 'approved'
         AND id <> ?
         AND NOT (reservation_end <= ? OR reservation_start >= ?)`,
      [
        booking.user_id,
        booking.date_reserved,
        booking.id,
        booking.reservation_start,
        booking.reservation_end,
      ]
    );

    if (teacherConflict.length) {
      await conn.rollback();
      return res.status(409).json({
        message: "Teacher already has an approved booking in this time slot.",
      });
    }

    /* =========================================
       4. APPROVE BOOKING
    ========================================= */
    await conn.query(
      `UPDATE room_bookings
       SET status = 'approved',
           approved_at = NOW(),
           reject_reason = NULL,
           rejected_at = NULL
       WHERE id = ?`,
      [bookingId]
    );

    /* =========================================
       5. REJECT OVERLAPPING PENDING BOOKINGS
    ========================================= */
    const [pendingOverlap] = await conn.query(
      `SELECT id, reserved_by, email, date_reserved, reservation_start, reservation_end
       FROM room_bookings
       WHERE room_id = ?
         AND date_reserved = ?
         AND status = 'pending'
         AND NOT (reservation_end <= ? OR reservation_start >= ?)`,
      [
        booking.room_id,
        booking.date_reserved,
        booking.reservation_start,
        booking.reservation_end,
      ]
    );

    const rejected = [];

    for (const p of pendingOverlap) {
      await conn.query(
        `UPDATE room_bookings
         SET status = 'rejected',
             rejected_at = NOW(),
             reject_reason = 'overlapped_with_approved_reservation'
         WHERE id = ?`,
        [p.id]
      );

      rejected.push(p);
    }

    await conn.commit();
    committed = true;

    res.json({
      message: "Reservation approved successfully.",
      approvedBookingId: bookingId,
      rejectedCount: rejected.length,
    });

    /* =========================================
       6. EMAILS (BACKGROUND)
    ========================================= */
    setImmediate(async () => {
      try {
        await sendStatusEmail(
          {
            ...booking,
            date: booking.date_reserved,
            start_time: booking.reservation_start,
            end_time: booking.reservation_end,
          },
          "approved"
        );

        for (const r of rejected) {
          await sendStatusEmail(
            {
              ...r,
              room_name: booking.room_name,
              date: r.date_reserved,
              start_time: r.reservation_start,
              end_time: r.reservation_end,
            },
            "autoRejected"
          );
        }
      } catch (err) {
        console.error("Email error:", err);
      }
    });
  } catch (err) {
    if (conn && !committed) await conn.rollback();
    console.error(err);

    res.status(500).json({
      message: "Failed to approve reservation.",
      error: err.message,
    });
  } finally {
    if (conn) conn.release();
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
      `UPDATE room_bookings SET status='rejected', reject_reason=?, rejected_at=NOW() WHERE id=?`,
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
        `UPDATE room_bookings SET status='cancelled',  reject_reason='cancelled_not_approved_before_start', rejected_at=NOW() WHERE id=?`,
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

// GET /pending
router.get("/pending", async (req, res) => {
  try {
    const { userRole, userId } = req.query;

let query = `
  SELECT 
    b.*,
    r.chairs,
    r.has_tv,
    r.has_table,
    r.has_projector,
    y.year_level,
    s.section_name,

    CASE 
      WHEN EXISTS (
        SELECT 1
        FROM room_bookings b2
        WHERE b2.room_id = b.room_id
          AND b2.date_reserved = b.date_reserved
          AND b2.status = 'pending'
          AND b2.id != b.id
          AND NOT (
            b2.reservation_end <= b.reservation_start
            OR b2.reservation_start >= b.reservation_end
          )
      )
      THEN 1
      ELSE 0
    END AS has_conflict

  FROM room_bookings b
  JOIN rooms r ON r.id = b.room_id
  LEFT JOIN years y ON y.id = b.year_id
  LEFT JOIN sections s ON s.id = b.section_id
  WHERE b.status = 'pending'
`;

    const params = [];

    if (userRole == 3 && userId) {
      query += " AND b.user_id = ?";
      params.push(userId);
    }

    query += " ORDER BY b.date_reserved, b.reservation_start";

    const [bookings] = await db.query(query, params);

    res.json({ bookings });
  } catch (err) {
    console.error("Error fetching pending bookings:", err);
    res.status(500).json({ message: "Failed to fetch pending bookings." });
  }
});



// GET /pending/conflicts-grouped
router.get("/pending/conflicts-grouped", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT *
      FROM room_bookings
      WHERE status = 'pending'
      ORDER BY room_id, date_reserved, reservation_start
    `);

    const groups = {};

    for (const booking of rows) {
      const key = `${booking.room_id}_${booking.date_reserved}`;

      if (!groups[key]) {
        groups[key] = {
          room_id: booking.room_id,
          room_name: booking.room_name,
          date_reserved: booking.date_reserved,
          bookings: []
        };
      }

      groups[key].bookings.push(booking);
    }

    // Remove groups that don't actually conflict
    const conflictGroups = Object.values(groups).filter(group => {
      const arr = group.bookings;

      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const aStart = arr[i].reservation_start;
          const aEnd = arr[i].reservation_end;
          const bStart = arr[j].reservation_start;
          const bEnd = arr[j].reservation_end;

          if (!(bEnd <= aStart || bStart >= aEnd)) {
            return true;
          }
        }
      }

      return false;
    });

    res.json({ conflictGroups });

  } catch (err) {
    console.error("Error grouping conflicts:", err);
    res.status(500).json({ message: "Failed to group conflicts." });
  }
});




// PUT /approve-bulk
router.put("/approve-bulk", async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "No booking IDs provided." });
  }

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    for (const id of ids) {
      // Fetch the pending booking first
      const [rows] = await conn.query(
        `SELECT * FROM room_bookings WHERE id = ? AND status = 'pending'`,
        [id]
      );

      if (!rows.length) continue; // skip if booking not found
      const booking = rows[0];

      // Reject overlapping pending bookings (no trailing comma)
      await conn.query(
        `UPDATE room_bookings
         SET status = 'rejected',
             reject_reason = 'Overlapping with approved reservation',
             rejected_at = NOW()
         WHERE room_id = ?
           AND date_reserved = ?
           AND status = 'pending'
           AND id != ?
           AND NOT (reservation_end <= ? OR reservation_start >= ?)`,
        [
          booking.room_id,
          booking.date_reserved,
          id,
          booking.reservation_start,
          booking.reservation_end
        ]
      );

      // Check for conflicts with already approved bookings
      const [conflict] = await conn.query(
        `SELECT 1 FROM room_bookings
         WHERE room_id = ?
           AND date_reserved = ?
           AND status = 'approved'
           AND NOT (reservation_end <= ? OR reservation_start >= ?)`,
        [
          booking.room_id,
          booking.date_reserved,
          booking.reservation_start,
          booking.reservation_end
        ]
      );

      if (conflict.length > 0) {
        throw new Error(`Conflict found for booking ID ${id}`);
      }

      // Approve the booking
      await conn.query(
        `UPDATE room_bookings
         SET status = 'approved', approved_at = NOW()
         WHERE id = ?`,
        [id]
      );
    }

    await conn.commit();
    conn.release();
    res.json({ message: "Bulk approval successful." });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error("Bulk approve error:", err);
    res.status(409).json({ message: err.message });
  }
});

// GET /reservations/rejected

router.get("/rejected", async (req, res) => {
  try {
    const { userRole, userId } = req.query;

    let query = `
      SELECT 
        b.*,
        r.chairs,
        r.has_tv,
        r.has_table,
        r.has_projector,
        y.year_level,
        s.section_name
      FROM room_bookings b
      JOIN rooms r ON r.id = b.room_id
      LEFT JOIN years y ON y.id = b.year_id
      LEFT JOIN sections s ON s.id = b.section_id
      WHERE b.status NOT IN ('approved', 'pending')
    `;

    const params = [];

    if (userRole == 3 && userId) {
      query += " AND b.user_id = ?";
      params.push(userId);
    }

    query += " ORDER BY b.date_reserved, b.reservation_start";

    const [bookings] = await db.query(query, params);

    res.json({ bookings });
  } catch (err) {
    console.error("Error fetching rejected bookings:", err);
    res.status(500).json({ message: "Failed to fetch rejected bookings." });
  }
});
// GET /reservations/rejected

router.get("/rejected", async (req, res) => {
  try {
    const { userRole, userId } = req.query;

    let query = `
      SELECT 
        b.*,
        r.chairs,
        r.has_tv,
        r.has_table,
        r.has_projector,
        y.year_level,
        s.section_name
      FROM room_bookings b
      JOIN rooms r ON r.id = b.room_id
      LEFT JOIN years y ON y.id = b.year_id
      LEFT JOIN sections s ON s.id = b.section_id
      WHERE b.status NOT IN ('approved', 'pending')
    `;

    const params = [];

    if (userRole == 3 && userId) {
      query += " AND b.user_id = ?";
      params.push(userId);
    }

    query += " ORDER BY b.date_reserved, b.reservation_start";

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




// GET /teacher-assignments/:teacherId
router.get("/teacher-assignments/:teacherId", async (req, res) => {
  const teacherId = Number(req.params.teacherId);


  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    return res.status(400).json({
      message: "Invalid teacherId",
      teacherId: null,
      department_id: null,
      years: [],
      sections: [],
      subjects: [],
      assignments: [],
    });
  }

  try {
    // 1️⃣ Get all teacher assignments (no section_id)
    const [assignmentsRows] = await db.query(
      `SELECT
         tsa.teacher_id,
         tsa.department_id,
         tsa.year_id,
         tsa.subject_id,
         y.year_level
       FROM teacher_subject_assignments tsa
       LEFT JOIN years y ON y.id = tsa.year_id
       WHERE tsa.teacher_id = ?
       ORDER BY y.year_level ASC`,
      [teacherId]
    );

    if (!assignmentsRows.length) {
      return res.json({
        teacherId,
        department_id: null,
        years: [],
        sections: [],
        subjects: [],
        assignments: [],
      });
    }

    // 2️⃣ Determine the teacher's department (first non-null department_id)
    let departmentId = null;
    for (const row of assignmentsRows) {
      if (departmentId === null && row.department_id != null) {
        departmentId = Number(row.department_id);
      }
    }

    // 3️⃣ Collect unique years
    const yearsMap = new Map();
    for (const row of assignmentsRows) {
      if (row.year_id != null && row.year_level != null && !yearsMap.has(row.year_id)) {
        yearsMap.set(row.year_id, {
          id: Number(row.year_id),
          year_level: Number(row.year_level),
        });
      }
    }

    // 4️⃣ Fetch sections for all year_ids
    const yearIds = [...yearsMap.keys()];
    const [sectionsRows] = await db.query(
      `SELECT id AS section_id, year_id, section_name
       FROM sections
       WHERE year_id IN (?)`,
      [yearIds]
    );

    const sectionsMap = new Map();
    for (const row of sectionsRows) {
      sectionsMap.set(row.section_id, {
        id: Number(row.section_id),
        name: row.section_name,
        year_id: Number(row.year_id),
      });
    }

    // 5️⃣ Fetch subjects assigned to teacher
    const [subjectsRows] = await db.query(
      `SELECT tsa.subject_id, sub.name AS subject_name, tsa.year_id
       FROM teacher_subject_assignments tsa
       LEFT JOIN subjects sub ON sub.id = tsa.subject_id
       WHERE tsa.teacher_id = ?`,
      [teacherId]
    );

    const subjectsMap = new Map();
    for (const row of subjectsRows) {
      if (!subjectsMap.has(row.subject_id)) {
        subjectsMap.set(row.subject_id, {
          id: Number(row.subject_id),
          name: row.subject_name,
          year_id: Number(row.year_id),
        });
      }
    }

    // 6️⃣ Build assignments array (year → section → subject)
    const assignments = [];
    for (const row of assignmentsRows) {
      // All sections for the year
      const yearSections = sectionsRows.filter(s => s.year_id === row.year_id);
      // Each subject
      const subject = subjectsMap.get(row.subject_id);

      for (const sec of yearSections) {
        assignments.push({
          teacher_id: Number(row.teacher_id),
          department_id: Number(row.department_id),
          year_id: Number(row.year_id),
          section_id: Number(sec.section_id),
          subject_id: subject ? Number(subject.id) : null,
          year_level: yearsMap.get(row.year_id)?.year_level ?? null,
          section_name: sec.section_name,
          subject_name: subject?.name ?? "",
        });
      }
    }

    const response = {
      teacherId,
      department_id: departmentId,
      years: [...yearsMap.values()],
      sections: [...sectionsMap.values()],
      subjects: [...subjectsMap.values()],
      assignments,
    };


    return res.json(response);
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return res.status(500).json({
      message: "Unexpected server error fetching teacher assignments.",
      error: err.message,
      teacherId,
      department_id: null,
      years: [],
      sections: [],
      subjects: [],
      assignments: [],
    });
  }
});

/* ----------------------------------------
   POST /book – single or recurring booking
---------------------------------------- */
router.post("/book", async (req, res) => {
  try {
    const result = await saveReservations([req.body]);
    res.json(result);
  } catch (err) {
    console.error("❌ Error saving reservation:", err);
    res.status(err.statusCode || 500).json({
      message: err.message || "Failed to save reservation.",
    });
  }
});

router.post("/bookMultiple", async (req, res) => {
  try {
    const payloads = Array.isArray(req.body) ? req.body : [];
    const result = await saveReservations(payloads);
    res.json(result);
  } catch (err) {
    console.error("❌ Error saving multiple reservations:", err);
    res.status(err.statusCode || 500).json({
      message: err.message || "Failed to save reservations.",
    });
  }
});


router.get("/student-schedule/:studentId", authMiddleware, async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);

    const [rows] = await pool.query(
      `
      SELECT
        rb.id,
        rb.date_reserved,
        rb.reservation_start,
        rb.reservation_end,
        rb.subject,
        rb.notes,
        rb.reserved_by AS teacher_name,
        r.room_number,
        r.room_name,
        d.name AS department_name,
        y.year_level,
        s.name AS section_name
      FROM room_bookings rb
      JOIN users u
        ON u.department_id = rb.department_id
       AND u.year_id = rb.year_id
       AND u.section_id = rb.section_id
      JOIN rooms r
        ON rb.room_id = r.id
      LEFT JOIN departments d
        ON rb.department_id = d.id
      LEFT JOIN years y
        ON rb.year_id = y.id
      LEFT JOIN sections s
        ON rb.section_id = s.id
      WHERE u.id = ?
        AND rb.status = 'approved'
      ORDER BY rb.date_reserved ASC, rb.reservation_start ASC
      `,
      [studentId]
    );

    res.json({ schedules: rows });
  } catch (err) {
    console.error("Student schedule fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
