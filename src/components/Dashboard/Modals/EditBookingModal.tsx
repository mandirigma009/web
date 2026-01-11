/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import "../../../styles/modal.css";
import "../../../styles/dashboard.css";
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";

interface EditBookingModalProps {
  booking: any;
  onClose: () => void;
  onUpdateSuccess: () => void;
}

/* -------------------- time helpers (same logic as ReservationModal) -------------------- */
const generateStartSlots = () => {
  const ts: string[] = [];
  for (let h = 0; h < 24; h++)
    [1, 16, 31, 46].forEach((m) =>
      ts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
    );
  return ts;
};

const generateEndSlots = () => {
  const ts: string[] = [];
  for (let h = 0; h < 24; h++)
    [15, 30, 45, 60].forEach((m) => {
      if (m === 60 && h < 23) ts.push(`${String(h + 1).padStart(2, "0")}:00`);
      else if (m < 60)
        ts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    });
  return ts;
};

const ALL_START_SLOTS = generateStartSlots();
const ALL_END_SLOTS = generateEndSlots();

const timeToMinutes = (t?: string) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const normalizeReservation = (r: any) => ({
  ...r,
  start: (r.start || r.start_time || r.reservation_start)?.slice(0, 5),
  end: (r.end || r.end_time || r.reservation_end)?.slice(0, 5),
});

/* -------------------------------------------------------------------------------------- */

const EditBookingModal: React.FC<EditBookingModalProps> = ({
  booking,
  onClose,
  onUpdateSuccess,
}) => {
  const [date, setDate] = useState(
    booking.date_reserved?.split("T")[0] ||
      new Date().toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState(booking.reservation_start || "");
  const [endTime, setEndTime] = useState(booking.reservation_end || "");
  const [notes, setNotes] = useState(booking.notes || "");
  const [subject, setSubject] = useState(booking.subject || "");
  const [showForm, setShowForm] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reservations, setReservations] = useState<any[]>([]);

  /* -------------------- fetch reservations for the day -------------------- */
  const fetchReservationsForDay = async () => {
    try {
      const url = new URL(
        "http://localhost:5000/api/room_bookings/reservations"
      );
      url.searchParams.append("roomId", String(booking.room_id));
      url.searchParams.append("date", date);

      const res = await fetch(url.toString());
      const data = await res.json();

      setReservations(
        (data.reservations || [])
          .filter((r: any) => r.id !== booking.id)
          .map(normalizeReservation)
      );
    } catch (err) {
      console.error(err);
      setReservations([]);
    }
  };

  useEffect(() => {
    fetchReservationsForDay();
  }, [booking.room_id, date]);

  /* -------------------- approved-only canonical list -------------------- */
  const approvedReservations = useMemo(
    () => reservations.filter((r) => r.status === "approved"),
    [reservations]
  );

  /* -------------------- slot availability (approved only) -------------------- */
  const isSlotAvailable = (time: string) => {
    const t = timeToMinutes(time);

    for (const r of approvedReservations) {
      if (t >= timeToMinutes(r.start) && t < timeToMinutes(r.end)) {
        return false;
      }
    }

    const today = new Date().toISOString().split("T")[0];
    if (date === today) {
      const now = new Date();
      const [h, m] = time.split(":").map(Number);
      const slot = new Date();
      slot.setHours(h, m, 0, 0);
      if (slot <= now) return false;
    }

    return true;
  };

  const availableStartTimes = useMemo(
    () => ALL_START_SLOTS.filter(isSlotAvailable),
    [approvedReservations, date]
  );

  const availableEndTimes = useMemo(() => {
    if (!startTime) return [];

    const startMin = timeToMinutes(startTime);

    return ALL_END_SLOTS.filter((t) => {
      const tMin = timeToMinutes(t);
      if (tMin <= startMin) return false;

      for (const r of approvedReservations) {
        const rStart = timeToMinutes(r.start);
        const rEnd = timeToMinutes(r.end);
        if (startMin < rEnd && tMin > rStart) return false;
      }

      const today = new Date().toISOString().split("T")[0];
      if (date === today) {
        const now = new Date();
        const [h, m] = t.split(":").map(Number);
        const slotTime = new Date();
        slotTime.setHours(h, m, 0, 0);
        if (slotTime <= now) return false;
      }

      return true;
    });
  }, [startTime, approvedReservations, date]);

  /* -------------------- submit/update logic (unchanged) -------------------- */
  const handleUpdate = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/room_bookings/${booking.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date_reserved: date,
            subject,
            reservation_start: startTime,
            reservation_end: endTime,
            notes,
            status: "pending",
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return alert(err.message || "Failed to update booking.");
      }

      toast.success("Booking updated successfully! (Status remains pending)");
      onUpdateSuccess();
      onClose();
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update - server error.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime || startTime >= endTime)
      return alert("Invalid times selected.");
    setShowForm(false);
    setShowConfirm(true);
  };

  /* -------------------- JSX (UNCHANGED UI) -------------------- */
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="flex items-center justify-center">
          update pending Reservation on Room: {booking.room_number}
        </h3>

        <p>
          <strong>Room Name:</strong> {booking.room_name}
          <br />
          <strong>Floor:</strong> {booking.floor_number}
          <br />
          <strong>Building:</strong> {booking.building_name}
          <br />
          <strong>Description:</strong> {booking.room_description}
          <br />
          · Chairs: {booking.chairs ?? 0}
          <br />
          · TV: {booking.has_tv ? "Yes" : "No"}
          <br />
          · Tables: {booking.has_table ? "Yes" : "No"}
          <br />
          · Projector: {booking.has_projector ? "Yes" : "No"}
        </p>

        {showForm && (
          <form onSubmit={handleSubmit}>
            <label>Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              required
            />

            <label>Start:</label>
            <select
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                setEndTime("");
              }}
            >
              <option value="">-- Select --</option>
              {availableStartTimes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <label>End:</label>
            <select value={endTime} onChange={(e) => setEndTime(e.target.value)}>
              <option value="">-- Select --</option>
              {availableEndTimes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <label>Subject :</label>
            <textarea
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, 100))}
              maxLength={100}
            />
            <p style={{ fontSize: "0.8em", color: "#555" }}>
              {subject.length} / Max 100 characters
            </p>

            <label>Notes:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 250))}
              maxLength={250}
            />
            <p style={{ fontSize: "0.8em", color: "#555" }}>
              {notes.length} / Max 250 characters
            </p>

            {approvedReservations.length > 0 && (
              <div className="mb-2">
                <br />
                <strong>Already booked (approved):</strong>
                <ul>
                  {approvedReservations
                    .slice()
                    .sort(
                      (a, b) =>
                        timeToMinutes(a.start) - timeToMinutes(b.start)
                    )
                    .map((i) => (
                      <li
                        key={`${i.start}-${i.end}-${i.reserved_by}`}
                      >
                        {i.start} - {i.end} ({i.reserved_by})
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <div
              className="modal-footer"
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <button type="button" className="btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit">Submit</button>
            </div>
          </form>
        )}

        {showConfirm && (
          <div className="confirmation">
            <h4>Confirm Update</h4>
            <p>
              {date} · {startTime}-{endTime}
            </p>
            <p>Subject: {subject || "None"}</p>
            <p>Notes: {notes || "None"}</p>

            <div
              className="modal-footer"
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setShowForm(true);
                }}
              >
                Back
              </button>
              <button onClick={handleUpdate}>Update</button>
            </div>
          </div>
        )}
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default EditBookingModal;
