// server/utils/reservationService.js
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
      const windowError = validateBookingWindow(payload.startTime, payload.endTime);

      if (!bookingDate) {
        throw Object.assign(new Error("Missing time or date."), { statusCode: 400 });
      }

      if (windowError) {
        throw Object.assign(new Error(windowError), { statusCode: 400 });
      }

      const status = payload.status || "pending";

      if (status === "approved") {
        const [roomConflict] = await conn.query(
          `SELECT 1
           FROM room_bookings
           WHERE room_id = ?
             AND date_reserved = ?
             AND status = 'approved'
             AND NOT (reservation_end <= ? OR reservation_start >= ?)`,
          [payload.roomId, bookingDate, payload.startTime, payload.endTime]
        );

        if (roomConflict.length > 0) {
          throw Object.assign(
            new Error(`Room already booked on ${bookingDate}`),
            { statusCode: 409 }
          );
        }

        const [teacherConflict] = await conn.query(
          `SELECT 1
           FROM room_bookings
           WHERE user_id = ?
             AND date_reserved = ?
             AND status = 'approved'
             AND NOT (reservation_end <= ? OR reservation_start >= ?)`,
          [payload.user_id, bookingDate, payload.startTime, payload.endTime]
        );

        if (teacherConflict.length > 0) {
          throw Object.assign(
            new Error(`Teacher already has another booking on ${bookingDate}`),
            { statusCode: 409 }
          );
        }
      }

      await conn.query(
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

      if (status === "approved") {
        const [pendingOverlap] = await conn.query(
          `SELECT id, reserved_by, email, date_reserved, reservation_start, reservation_end
           FROM room_bookings
           WHERE room_id = ?
             AND date_reserved = ?
             AND status = 'pending'
             AND NOT (reservation_end <= ? OR reservation_start >= ?)`,
          [payload.roomId, bookingDate, payload.startTime, payload.endTime]
        );

        for (const p of pendingOverlap) {
          await conn.query(
            `UPDATE room_bookings
             SET status = 'rejected',
                 rejected_at = NOW(),
                 reject_reason = 'overlapped_with_approved_reservation'
             WHERE id = ?`,
            [p.id]
          );

          emailJobs.push({
            type: "autoRejected",
            data: {
              reserved_by: p.reserved_by,
              email: p.email,
              room_name: payload.roomName,
              date_reserved: p.date_reserved,
              reservation_start: p.reservation_start,
              reservation_end: p.reservation_end,
            },
          });
        }
      } else {
        emailJobs.push({
          type: "pending",
          data: {
            reserved_by: payload.reserved_by,
            email: payload.email,
            room_name: payload.roomName,
            date_reserved: bookingDate,
            reservation_start: payload.startTime,
            reservation_end: payload.endTime,
          },
        });
      }
    }

    await conn.commit();
    conn.release();

    for (const job of emailJobs) {
      try {
        await sendStatusEmail(job.data, job.type);
      } catch (emailErr) {
        console.error("Email send failed:", emailErr);
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