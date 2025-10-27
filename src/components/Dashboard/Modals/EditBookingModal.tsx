import React, { useEffect, useMemo, useState } from "react";
import "../../../styles/modal.css";
import "../../../styles/dashboard.css";
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";


interface EditBookingModalProps {
  booking: any;
  onClose: () => void;
  onUpdateSuccess: () => void; // triggers table & calendar refresh
}

// Generate time slots
const generateStartSlots = () => {
  const ts: string[] = [];
  for (let h = 0; h < 24; h++) [1, 16, 31, 46].forEach((m) => {
    if (m < 60) ts.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
  });
  return ts;
};
const generateEndSlots = () => {
  const ts: string[] = [];
  for (let h = 0; h < 24; h++) [15, 30, 45, 60].forEach((m) => {
    if (m === 60 && h < 23) ts.push(`${String(h+1).padStart(2,"0")}:00`);
    else if (m !== 60) ts.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
  });
  return ts;
};
const ALL_START_SLOTS = generateStartSlots();
const ALL_END_SLOTS = generateEndSlots();

const EditBookingModal: React.FC<EditBookingModalProps> = ({ booking, onClose, onUpdateSuccess }) => {
  const [date, setDate] = useState(booking.date_reserved?.split("T")[0] || new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState(booking.reservation_start || "");
  const [endTime, setEndTime] = useState(booking.reservation_end || "");
  const [notes, setNotes] = useState(booking.notes || "");
  const [showForm, setShowForm] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reservations, setReservations] = useState<any[]>([]);

  const fetchReservationsForDay = async () => {
    try {
      const url = new URL("http://localhost:5000/api/room_bookings/reservations");
      url.searchParams.append("roomId", String(booking.room_id));
      url.searchParams.append("date", date);
      const res = await fetch(url.toString());
      const data = await res.json();
      setReservations((data.reservations || []).filter((r: any) => r.id !== booking.id));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchReservationsForDay(); }, [booking.room_id, date]);

  const timeToMinutes = (t?: string) => { if (!t) return 0; const [h,m] = t.split(":").map(Number); return h*60+m; };
  const isSlotAvailable = (time: string) => {
    const t = timeToMinutes(time);
    for (const r of reservations) if (t >= timeToMinutes(r.start_time) && t < timeToMinutes(r.end_time)) return false;
    const today = new Date().toISOString().split("T")[0];
    if (date === today) {
      const now = new Date();
      const [h,m] = time.split(":").map(Number);
      const slot = new Date(); slot.setHours(h,m,0,0);
      if (slot <= now) return false;
    }
    return true;
  };

  const availableStartTimes = useMemo(() => ALL_START_SLOTS.filter(isSlotAvailable), [reservations, date]);
  const availableEndTimes = useMemo(() => {
    if (!startTime) return ALL_END_SLOTS.filter(isSlotAvailable);
    const sMin = timeToMinutes(startTime);
    return ALL_END_SLOTS.filter((t) => timeToMinutes(t) > sMin && reservations.every((r) => !(sMin < timeToMinutes(r.end_time) && timeToMinutes(t) > timeToMinutes(r.start_time))));
  }, [startTime, reservations, date]);

  const handleUpdate = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/room_bookings/${booking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date_reserved: date,
          reservation_start: startTime,
          reservation_end: endTime,
          notes,
          status: "pending",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return alert(err.message || "Failed to update booking.");
      }

      //alert("Booking updated successfully! (Status remains pending)");
      toast.success("Booking updated successfully! (Status remains pending");
      // refresh table + calendar automatically
      onUpdateSuccess();
      onClose();
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update - server error.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime || startTime >= endTime) return alert("Invalid times selected.");
    setShowForm(false); setShowConfirm(true);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Edit Booking</h3>
        <p><strong>Room:</strong> {booking.room_name} · <strong>Floor:</strong> {booking.floor_number}</p>

        {showForm && (
          <form onSubmit={handleSubmit}>
            <label>Date:</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} required />
            <label>Start:</label>
            <select value={startTime} onChange={(e) => { setStartTime(e.target.value); setEndTime(""); }}>
              <option value="">-- Select --</option>
              {availableStartTimes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label>End:</label>
            <select value={endTime} onChange={(e) => setEndTime(e.target.value)}>
              <option value="">-- Select --</option>
              {availableEndTimes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label>Notes:</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0,250))} maxLength={250}></textarea>
            <div className="modal-actions">
              <button type="button" onClick={onClose}>Cancel</button>
              <button type="submit">Submit</button>
            </div>
          </form>
        )}

        {showConfirm && (
          <div className="confirmation">
            <h4>Confirm Update</h4>
            <p>{date} · {startTime}-{endTime}</p>
            <p>Notes: {notes || "None"}</p>
            <button onClick={() => { setShowConfirm(false); setShowForm(true); }}>Back</button>
            <button onClick={handleUpdate}>Update</button>
          </div>
        )}
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default EditBookingModal;
