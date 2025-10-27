// src/components/Dashboard/EditBookingModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import "../../../styles/modal.css";
import "../../../styles/dashboard.css";

interface EditBookingModalProps {
  booking: any;
  onClose: () => void;
  onUpdateSuccess: () => void; // triggers forApprovalTab tab refresh
}

// Generate start/end time slots
const generateStartSlots = () => {
  const ts: string[] = [];
  for (let h = 0; h < 24; h++) {
    [1, 16, 31, 46].forEach((m) => {
      if (m < 60) ts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    });
  }
  return ts;
};

const generateEndSlots = () => {
  const ts: string[] = [];
  for (let h = 0; h < 24; h++) {
    [15, 30, 45, 60].forEach((m) => {
      if (m === 60 && h < 23) ts.push(`${String(h + 1).padStart(2, "0")}:00`);
      else if (m !== 60) ts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    });
  }
  return ts;
};

const ALL_START_SLOTS = generateStartSlots();
const ALL_END_SLOTS = generateEndSlots();

const EditBookingModal: React.FC<EditBookingModalProps> = ({ booking, onClose, onUpdateSuccess }) => {
  const [reservations, setReservations] = useState<any[]>([]);
  const [date, setDate] = useState(
          booking.date_reserved
            ? new Date(booking.date_reserved).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0]
        );
 const [startTime, setStartTime] = useState(booking.reservation_start || "");
  const [endTime, setEndTime] = useState(booking.reservation_end || "");
  const [notes, setNotes] = useState(booking.notes || "");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showForm, setShowForm] = useState(true);

  const fetchReservationsForDay = async () => {
    try {
      const url = new URL("http://localhost:5000/api/room_bookings/reservations");
      url.searchParams.append("roomId", String(booking.room_id));
      url.searchParams.append("date", date);
      const res = await fetch(url.toString());
      const data = await res.json();
      const mappedReservations = (data.reservations || [])
        .filter((r: any) => r.id !== booking.id)
        .map((r: any) => ({
          ...r,
        }));
      setReservations(mappedReservations);
    } catch (err) {
      console.error("Error fetching reservations for day:", err);
    }
  };

  useEffect(() => {
    fetchReservationsForDay();
  }, [booking.room_id, date]);

  const validReservations = useMemo(
    () => reservations.filter((r) => r.start_time && r.end_time),
    [reservations]
  );

  const timeToMinutes = (t?: string) => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const isSlotAvailable = (time: string) => {
    const timeMin = timeToMinutes(time);
    for (const r of validReservations) {
      const rStart = timeToMinutes(r.start_time);
      const rEnd = timeToMinutes(r.end_time);
      if (timeMin >= rStart && timeMin < rEnd) return false;
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (date === todayStr) {
      const now = new Date();
      const [h, m] = time.split(":").map(Number);
      const slotDate = new Date();
      slotDate.setHours(h, m, 0, 0);
      if (slotDate <= now) return false;
    }
    return true;
  };

  const availableStartTimes = useMemo(() => ALL_START_SLOTS.filter(isSlotAvailable), [validReservations, date]);
  const availableEndTimes = useMemo(() => {
    if (!startTime) return ALL_END_SLOTS.filter(isSlotAvailable);
    const startMin = timeToMinutes(startTime);
    return ALL_END_SLOTS.filter((t) => {
      const endMin = timeToMinutes(t);
      if (endMin <= startMin) return false;
      for (const r of validReservations) {
        const rStart = timeToMinutes(r.start_time);
        const rEnd = timeToMinutes(r.end_time);
        if (startMin < rEnd && endMin > rStart) return false;
      }
      return true;
    });
  }, [startTime, validReservations, date]);

  const conflictsWithExisting = (s: string, e: string) => {
    const startMin = timeToMinutes(s);
    const endMin = timeToMinutes(e);
    return validReservations.some((r) => {
      const rStart = timeToMinutes(r.start_time);
      const rEnd = timeToMinutes(r.end_time);
      return startMin < rEnd && endMin > rStart;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

     const nowPH = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
    );

    const selectedDatePH = new Date(date);

    // Normalize both to midnight (so only the date is compared)
    nowPH.setHours(0, 0, 0, 0);
    selectedDatePH.setHours(0, 0, 0, 0);

    // Prevent saving if selected date is before PH today
    if (selectedDatePH < nowPH) {
      alert("You cannot select a past date (based on Philippine time).");
      return;
    }
    
    if (!startTime || !endTime) return alert("Please pick times.");
    if (startTime >= endTime) return alert("End must be after start.");
    if (conflictsWithExisting(startTime, endTime)) {
      alert("Time conflicts with an existing reservation.");
      fetchReservationsForDay();
      return;
    }
    setShowForm(false);
    setShowConfirm(true);
  };

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
        status: "pending", // ✅ Always keep as pending after edit
      }),
    });

    if (res.ok) {
      alert("Booking updated successfully! (Status remains pending)");
      onUpdateSuccess(); // ✅ Trigger refresh (MyBookingsTab)
      onClose(); // ✅ Close modal
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "Failed to update booking.");
    }
  } catch (err) {
    console.error("Update error:", err);
    alert("Failed to update - server error.");
  }
};



  const isFormValid = startTime && endTime && startTime < endTime;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="flex items-center justify-center">Edit Booking</h3>

        <p>
          <strong>Building:</strong> {booking.building_name} ·{" "}
          <strong>Floor:</strong> {booking.floor_number} ·{" "}
          <strong>Room:</strong> {booking.room_name}
        </p>

        {showForm && (
          <>
            <div className="mb-2">
              <label>Date:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                 min={new Date().toISOString().split("T")[0]} // ✅ today's date in yyyy-MM-dd
                  required
              />
            </div>

            <div className="mb-2">
                <label>Start Time:</label>
                <select
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setEndTime("");
                  }}
                  disabled={new Date(date) < new Date(new Date().toISOString().split("T")[0])} // disable if date is in past
                >
                  <option value="">-- Select Start --</option>
                  {availableStartTimes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

            <div className="mb-2">
              <label>End Time:</label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
               disabled={
                  !startTime || // no start time selected
                  new Date(date) < new Date(new Date().toISOString().split("T")[0]) // date is in past
                }              
              >
                <option value="">-- Select End --</option>
                {availableEndTimes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-2">
              <label>Notes (optional):</label>

              <textarea
                className="cancel-modal-textarea"
                value={notes}
                onChange={(e) => {setNotes(e.target.value.slice(0, 250))}}
                maxLength={250}
                placeholder="Optional notes"
              />

                <p style={{ fontSize: "0.8em", color: "#555", marginTop: "2px" }}>
                  {notes.length} / Max 250 characters
                </p>
            </div>

            {reservations.length > 0 && (
              <div className="mb-2">
                <strong>Already booked:</strong>
                <ul>
                  {reservations.map((r) => (
                    <li key={r.id}>
                      {r.start_time} - {r.end_time} ({r.reserved_by})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "15px",
              }}
            >
              <button className="px-3 py-2 border rounded" onClick={onClose}>
                Cancel
              </button>
              <button
                className="px-3 py-2 bg-yellow-500 text-black rounded"
                onClick={handleSubmit}
                disabled={!isFormValid}
              >
                Submit
              </button>
            </div>
          </>
        )}

        {showConfirm && (
          <div className="mt-4 p-4 border rounded bg-gray-50">
            <h4 className="font-medium mb-2">Confirm Update</h4>
            <div>
              <div>
                <strong>Building:</strong> {booking.building_name}
              </div>
              <div>
                <strong>Floor:</strong> {booking.floor_number}
              </div>
              <div>
                <strong>Room:</strong> {booking.room_name}
              </div>
              <div>
                <strong>Date:</strong> {date}
              </div>
              <div>
                <strong>Time:</strong> {startTime} - {endTime}
              </div>
              <div>
                <strong>Notes:</strong> {notes}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "10px",
              }}
            >
              <button
                className="px-3 py-2 border rounded"
                onClick={() => {
                  setShowConfirm(false);
                  setShowForm(true);
                }}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 bg-blue-600 text-black rounded"
                onClick={handleUpdate}
              >
                Update
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditBookingModal;
