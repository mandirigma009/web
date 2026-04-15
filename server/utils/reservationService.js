import db from "../pool.js";
import { sendStatusEmail } from "../../src/utils/emailService.js";

const DAYS_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const toMinutes = (t) => {
  const [h, m] = String(t || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const formatDateLocal = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getRecurringDates = (startDate, endDate, selectedDays = []) => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const dates = [];
  const current = new Date(start);

  while (current <= end) {
    const dayName = Object.keys(DAYS_MAP).find((k) => DAYS_MAP[k] === current.getDay());
    if (dayName && selectedDays.includes(dayName)) {
      dates.push(formatDateLocal(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const expandPayloads = (payloads = []) => {
  const expanded = [];

  for (const payload of payloads) {
    const recurrence = payload.recurrence;

    if (!recurrence || recurrence.type === "once") {
      expanded.push({
        ...payload,
        date_reserved: payload.date_reserved || payload.date,
      });
      continue;
    }

    const { start_date, end_date, days } = recurrence;
    const dates = getRecurringDates(start_date, end_date, days || []);

    for (const date_reserved of dates) {
      expanded.push({
        ...payload,
        date_reserved,
      });
    }
  }

  return expanded;
};

const validateBookingWindow = (startTime, endTime) => {
  if (!startTime || !endTime) return "Missing time or date.";

  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);
  const duration = endMin - startMin;

  if (startMin < 7 * 60 || endMin > 21 * 60) {
    return "Booking allowed only between 7:00 AM and 9:00 PM.";
  }

  if (duration < 30 || duration > 180) {
    return "Booking must be between 30 minutes and 3 hours.";
  }

  return null;
};

const buildInsertParams = (payload, bookingDate) => ([
  payload.roomId,
  payload.reserved_by,
  payload.user_id,
  payload.email || null,
  payload.assigned_by,
  bookingDate,
  payload.startTime,
  payload.endTime,
  payload.subject || null,
  payload.notes || null,
  payload.roomNumber || null,
  payload.roomDesc || null,
  payload.roomName || null,
  payload.floor || null,
  payload.building || null,
  payload.status || "pending",
  payload.subject_id ?? null,
  payload.year_id ?? null,
  payload.section_id ?? null,
  payload.department_id ?? null,
]);

const formatTimeRange = (start, end) => `${String(start).slice(0, 5)} - ${String(end).slice(0, 5)}`;

const normalizeConflictRow = (row) => ({
  booking_id: row.id,
  room_id: row.room_id,
  room_name: row.room_name || row.room_number || "Unknown room",
  room_number: row.room_number || null,
  building_name: row.building_name || null,
  date_reserved: row.date_reserved,
  reservation_start: String(row.reservation_start).slice(0, 5),
  reservation_end: String(row.reservation_end).slice(0, 5),
  reserved_by: row.reserved_by || null,
  teacher_name: row.teacher_name || row.reserved_by || null,
  user_id: row.user_id || null,
  department_name: row.department_name || null,
  year_level: row.year_level || null,
  section_name: row.section_name || null,
  subject: row.subject || null,
  status: row.status || null,
});

const buildConflictMessage = (kind, conflict) => {
  const roomPart = `${conflict.room_name}${conflict.room_number ? ` (${conflict.room_number})` : ""}`;
  const teacherPart = conflict.teacher_name ? `Teacher: ${conflict.teacher_name}` : "Teacher: N/A";
  const acadPart = [
    conflict.department_name ? `Course: ${conflict.department_name}` : null, 
    conflict.year_level != null ? `Year: ${conflict.year_level}` : null,
    conflict.section_name ? `Section: ${conflict.section_name}` : null,
    conflict.subject ? `Subject: ${conflict.subject}` : null,
  ].filter(Boolean).join(", ");

  return `${kind} conflict found on ${conflict.date_reserved} at 
  <br>${formatTimeRange(conflict.reservation_start, conflict.reservation_end)} 
  <br>in ${roomPart}. ${teacherPart}${acadPart ? `, ${acadPart}` : ""}.`;
};

const getApprovedConflicts = async (conn, payload, bookingDate) => {
  const baseParams = [payload.roomId, bookingDate, payload.startTime, payload.endTime, payload.user_id];

  const [rows] = await conn.query(
    `
    SELECT
      rb.id,
      rb.room_id,
      rb.room_name,
      rb.room_number,
      rb.building_name,
      rb.date_reserved,
      rb.reservation_start,
      rb.reservation_end,
      rb.reserved_by,
      rb.user_id,
      rb.subject,
      rb.status,
      d.name AS department_name,
      y.year_level,
      s.section_name,
      u.name AS teacher_name
    FROM room_bookings rb
    LEFT JOIN users u ON u.id = rb.user_id
    LEFT JOIN departments d ON d.id = rb.department_id
    LEFT JOIN years y ON y.id = rb.year_id
    LEFT JOIN sections s ON s.id = rb.section_id
    WHERE rb.date_reserved = ?
      AND rb.status = 'approved'
      AND (
        rb.room_id = ?
        OR rb.user_id = ?
      )
      AND NOT (rb.reservation_end <= ? OR rb.reservation_start >= ?)
    ORDER BY rb.reservation_start ASC
    LIMIT 5
    `,
    [bookingDate, payload.roomId, payload.user_id, payload.startTime, payload.endTime]
  );

  return rows.map(normalizeConflictRow);
};

const getOverlappingPending = async (conn, payload, bookingDate) => {
  const [rows] = await conn.query(
    `
    SELECT
      rb.id,
      rb.room_id,
      rb.room_name,
      rb.room_number,
      rb.building_name,
      rb.date_reserved,
      rb.reservation_start,
      rb.reservation_end,
      rb.reserved_by,
      rb.user_id,
      rb.subject,
      rb.status,
      d.name AS department_name,
      y.year_level,
      s.section_name,
      u.name AS teacher_name
    FROM room_bookings rb
    LEFT JOIN users u ON u.id = rb.user_id
    LEFT JOIN departments d ON d.id = rb.department_id
    LEFT JOIN years y ON y.id = rb.year_id
    LEFT JOIN sections s ON s.id = rb.section_id
    WHERE rb.date_reserved = ?
      AND rb.status = 'pending'
      AND (
        rb.room_id = ?
        OR rb.user_id = ?
      )
      AND NOT (
        rb.reservation_end <= ?
        OR rb.reservation_start >= ?
      )
    ORDER BY rb.reservation_start ASC
    `,
    [
      bookingDate,
      payload.roomId,
      payload.user_id,
      payload.startTime,
      payload.endTime,
    ]
  );

  return rows.map(normalizeConflictRow);
};

const createConflictError = (conflicts) => {
  const first = conflicts[0];
  const error = new Error(buildConflictMessage("Approved", first));
  error.statusCode = 409;
  error.conflicts = conflicts;
  error.conflict = first;
  return error;
};

export async function saveReservations(payloads = []) {
  const items = expandPayloads(Array.isArray(payloads) ? payloads : [payloads]);

  if (!items.length) {
    throw Object.assign(new Error("Payload array required."), { statusCode: 400 });
  }

  const conn = await db.getConnection();
  const emailJobs = [];

  try {
    await conn.beginTransaction();

    for (const payload of items) {
      const bookingDate = payload.date_reserved || payload.date;

      if (!bookingDate) {
        throw Object.assign(new Error("Missing booking date."), { statusCode: 400 });
      }

      const windowError = validateBookingWindow(payload.startTime, payload.endTime);
      if (windowError) {
        throw Object.assign(new Error(windowError), { statusCode: 400 });
      }

      const status = payload.status || "pending";

      const approvedConflicts = await getApprovedConflicts(conn, payload, bookingDate);

      if (approvedConflicts.length > 0) {
        throw createConflictError(approvedConflicts);
      }

      if (!payload.department_id || !payload.year_id || !payload.section_id) {
  throw Object.assign(
    new Error("Course, year, and section are required."),
    { statusCode: 400 }
  );
}



      const [insertResult] = await conn.query(
        `INSERT INTO room_bookings (
          room_id,
          reserved_by,
          user_id,
          email,
          assigned_by,
          date_reserved,
          reservation_start,
          reservation_end,
          subject,
          notes,
          room_number,
          room_description,
          room_name,
          floor_number,
          building_name,
          status,
          subject_id,
          year_id,
          section_id,
          department_id,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        buildInsertParams({ ...payload, status }, bookingDate)
      );

      const insertedId = insertResult.insertId;

      if (status === "approved") {
        const pendingOverlap = await getOverlappingPending(conn, payload, bookingDate);

        for (const p of pendingOverlap) {
          await conn.query(
            `UPDATE room_bookings
             SET status = 'rejected',
                 rejected_at = NOW(),
                 reject_reason = 'overlapped_with_approved_reservation'
             WHERE id = ?`,
            [p.booking_id]
          );

          emailJobs.push({
            type: "autoRejected",
            data: {
              reserved_by: p.reserved_by,
              email: null,
              room_name: p.room_name,
              room_number: p.room_number,
              building_name: p.building_name,
              date_reserved: p.date_reserved,
              reservation_start: p.reservation_start,
              reservation_end: p.reservation_end,
              teacher_name: p.teacher_name,
              department_name: p.department_name,
              year_level: p.year_level,
              section_name: p.section_name,
              subject: p.subject,
              booking_id: p.booking_id,
              conflict_reason: "overlapped_with_approved_reservation",
            },
          });
        }
      }

      if (status === "pending") {
        emailJobs.push({
          type: "pending",
          data: {
            reserved_by: payload.reserved_by,
            email: payload.email,
            room_name: payload.roomName,
            room_number: payload.roomNumber,
            building_name: payload.building,
            date_reserved: bookingDate,
            reservation_start: payload.startTime,
            reservation_end: payload.endTime,
            teacher_name: payload.reserved_by,
            department_name: null,
            year_level: null,
            section_name: null,
            subject: payload.subject || null,
            booking_id: insertedId,
          },
        });
      }

      if (status === "approved") {
        emailJobs.push({
          type: "approved",
          data: {
            reserved_by: payload.reserved_by,
            email: payload.email,
            room_name: payload.roomName,
            room_number: payload.roomNumber,
            building_name: payload.building,
            date_reserved: bookingDate,
            reservation_start: payload.startTime,
            reservation_end: payload.endTime,
            teacher_name: payload.reserved_by,
            department_name: null,
            year_level: null,
            section_name: null,
            subject: payload.subject || null,
            booking_id: insertedId,
          },
        });
      }
    }

    await conn.commit();
    conn.release();

    for (const job of emailJobs) {
      try {
        await sendStatusEmail(job.data, job.type);
      } catch (err) {
        console.error("Email send failed:", err);
      }
    }

    return {
      saved: items.length,
      message: "Reservation(s) saved successfully!",
    };
  } catch (err) {
    await conn.rollback();
    conn.release();
    throw err;
  }
}