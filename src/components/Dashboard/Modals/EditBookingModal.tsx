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
  onUpdateSuccess: () => void; // triggers table & calendar refresh
}

const format12Hour = (time24: string) => {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

// Generate time slots
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
      else if (m < 60) ts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
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
    const [subject, setSubject] = useState("");

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

  for (const r of reservations) {
    // skip pending reservations
    if (r.status !== "approved") continue;

    if (t >= timeToMinutes(r.start_time) && t < timeToMinutes(r.end_time)) return false;
  }

  const today = new Date().toISOString().split("T")[0];
  if (date === today) {
    const now = new Date();
    const [h, m] = time.split(":").map(Number);
    const slot = new Date(); slot.setHours(h, m, 0, 0);
    if (slot <= now) return false;
  }

  return true;
};


  const availableStartTimes = useMemo(() => ALL_START_SLOTS.filter(isSlotAvailable), [reservations, date]);
  
  const availableEndTimes = useMemo(() => {
  if (!startTime) return ALL_END_SLOTS.filter(isSlotAvailable);

  const sMin = timeToMinutes(startTime);

  return ALL_END_SLOTS.filter((t) => {
    const tMin = timeToMinutes(t);

    // Must be after start time
    if (tMin <= sMin) return false;

    // Only block if overlapping an approved reservation
    for (const r of reservations) {
      if (r.status !== "approved") continue;

      const rStart = timeToMinutes(r.start_time);
      const rEnd = timeToMinutes(r.end_time);

      // Overlap check: end time must not fall inside another reservation
      if (sMin < rEnd && tMin > rStart) return false;
    }

    // Optional: prevent past times if date is today
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
}, [startTime, reservations, date]);

//----------------

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
          subject,
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

 

  useEffect(() => {
  if (booking?.subject) {
    setSubject(booking.subject);
  }
}, [booking]);


  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="flex items-center justify-center">update pending Reservation on Room: {booking.room_number}</h3>
        <p>
          <strong>Room Name:</strong> {booking.room_name}<br></br> <strong>Floor:</strong> {booking.floor_number} <br></br><strong>Building:</strong> {booking.building_name} · <br></br>
       <strong>Description: {booking.room_description}</strong> <br></br>
          ·  Chairs: {booking.chairs ?? 0},<br></br>
          · TV: {booking.has_tv ? "Yes" : "No"},<br></br>
          · Tables: {booking.has_table ? "Yes" : "No"},<br></br>
          · Projector: {booking.has_projector ? "Yes" : "No"}·
        </p>
        {showForm && (
          <form onSubmit={handleSubmit}>
            <label>Date:</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} required />
            <label>Start:</label>
            <select value={startTime} onChange={(e) => { setStartTime(e.target.value); setEndTime(""); }}>
              <option value="">-- Select --</option>
              {availableStartTimes.map((t) => <option key={t} value={t}>{format12Hour(t)}</option>)}
            </select>
            <label>End:</label>
            <select value={endTime} onChange={(e) => setEndTime(e.target.value)}>
              <option value="">-- Select --</option>
              {availableEndTimes.map((t) => <option key={t} value={t}>{format12Hour(t)}</option>)}
            </select>
                        <label>Subject:</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, 100))} // limit 100 chars
                placeholder="Enter subject for the reservation"
                maxLength={100}
              />
              <p style={{ fontSize: "0.8em", color: "#555", marginTop: "2px" }}>
                {subject.length} / Max 100 characters
              </p>
            <label>Notes:</label>
               <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0,250))} maxLength={250}></textarea>
              <p style={{ fontSize: "0.8em", color: "#555", marginTop: "2px" }}>
               {notes.length} / Max 250 characters </p>
            {reservations.length > 0 && (
              <div className="mb-2">
                <br></br><strong>Already booked (approved):</strong>
                <ul>
            {reservations.map(i => (
              <li key={i.id}>
                {i.reservation_start || format12Hour(i.start_time)} - {i.reservation_end || format12Hour(i.end_time)} ({i.reserved_by})
              </li>
            ))}
          </ul>
              </div>
            )}

      <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between" }}>
              <div   ><button type="button"  className="btn-cancel" onClick={onClose}>Cancel</button></div>
              <div className="right-buttons"><button type="submit">Submit</button></div>
        </div>
  
          
          </form>
        )}

        {showConfirm && (
          <div className="confirmation">
            <h4>Confirm Update</h4>
            <p>{date} · {format12Hour(startTime)} - {format12Hour(endTime)}</p>
            <div><strong>Subject:</strong> {subject || "N/A"}</div>
            <p>Notes: {notes || "None"}</p>
            <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between" }}>
            <div  className="left-buttons" ><button className="back-btn" onClick={() => { setShowConfirm(false); setShowForm(true); }}>Back</button></div>
            <div className="right-buttons"><button className="right-buttons" onClick={handleUpdate}>Update</button></div>
            </div>
          </div>
        )}
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default EditBookingModal;
