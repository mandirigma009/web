// src/components/Dashboard/ReservationModal.tsx
import React, { useEffect, useMemo, useState } from "react";

interface ReservationModalProps {
  roomId: number;
  building: string;
  floor: string;
  roomNumber: string;
  roomDesc: string;
  roomName: string;
  reservedBy: string;
  onClose: () => void;
  onSuccess: () => void;
  onBookingSuccess?: () => void; // optional callback to refresh MyBookings
}

// ✅ Start times: HH:01, HH:16, HH:31, HH:46
const generateStartSlots = () => {
  const ts: string[] = [];
  for (let h = 0; h < 24; h++) {
    [1, 16, 31, 46].forEach((m) => {
      if (m < 60) {
        ts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    });
  }
  return ts;
};

// ✅ End times: HH:15, HH:30, HH:45, HH+1:00
const generateEndSlots = () => {
  const ts: string[] = [];
  for (let h = 0; h < 24; h++) {
    [15, 30, 45, 60].forEach((m) => {
      if (m === 60) {
        if (h < 23) ts.push(`${String(h + 1).padStart(2, "0")}:00`);
      } else {
        ts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    });
  }
  return ts;
};

const ALL_START_SLOTS = generateStartSlots();
const ALL_END_SLOTS = generateEndSlots();

const ReservationModal: React.FC<ReservationModalProps> = ({
  roomId,
  building,
  floor,
  roomNumber,
  roomDesc,
  roomName,
  reservedBy,
  onClose,
  onSuccess,
  onBookingSuccess,
}) => {
  const [reservations, setReservations] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showForm, setShowForm] = useState(true);

  const fetchReservationsForDay = async () => {
    try {
      const url = new URL("http://localhost:5000/api/room_bookings/reservations");
      url.searchParams.append("roomId", String(roomId));
      url.searchParams.append("date", date);
      const res = await fetch(url.toString());
      const data = await res.json();
      const mappedReservations = (data.reservations || []).map((r: any) => ({
        ...r,
        start_time: r.reservation_start,
        end_time: r.reservation_end,
        date: r.date_reserved,
      }));
      setReservations(mappedReservations);
    } catch (err) {
      console.error("Error fetching reservations for day:", err);
    }
  };

  useEffect(() => {
    fetchReservationsForDay();
  }, [roomId, date]);

  const timeToMinutes = (t?: string) => {
    if (!t) return 0;
    const [hour, min] = t.split(":").map(Number);
    return hour * 60 + min;
  };

  const isSlotAvailable = (time: string) => {
    const timeMin = timeToMinutes(time);
    for (const r of reservations.filter((r) => r.start_time && r.end_time)) {
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

  // ✅ Use new slot arrays
  const availableStartTimes = useMemo(
    () => ALL_START_SLOTS.filter((t) => isSlotAvailable(t)),
    [reservations, date]
  );

  const availableEndTimes = useMemo(() => {
    if (!startTime) return ALL_END_SLOTS.filter((t) => isSlotAvailable(t));
    const startMin = timeToMinutes(startTime);
    return ALL_END_SLOTS.filter((t) => {
      const endMin = timeToMinutes(t);
      if (endMin <= startMin) return false;
      for (const r of reservations.filter((r) => r.start_time && r.end_time)) {
        const rStart = timeToMinutes(r.start_time);
        const rEnd = timeToMinutes(r.end_time);
        if (startMin < rEnd && endMin > rStart) return false;
      }
      return true;
    });
  }, [startTime, reservations, date]);

  const conflictsWithExisting = (s: string, e: string) => {
    const startMin = timeToMinutes(s);
    const endMin = timeToMinutes(e);
    for (const r of reservations.filter((r) => r.start_time && r.end_time)) {
      const rStart = timeToMinutes(r.start_time);
      const rEnd = timeToMinutes(r.end_time);
      if (startMin < rEnd && endMin > rStart) return true;
    }
    return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleReserve = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/room_bookings/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          roomName,
          building,
          roomNumber,
          roomDesc,
          floor,
          date,
          startTime,
          endTime,
          reserved_by: reservedBy,
          notes,
        }),
      });
      if (res.ok) {
        alert("Reservation saved!");
        if (onBookingSuccess) await onBookingSuccess();
        onSuccess();
        setDate(new Date().toISOString().split("T")[0]);
        setStartTime("");
        setEndTime("");
        setNotes("");
        setShowForm(true);
        setShowConfirm(false);
      } else {
        const err = await res.json();
        alert(err.message || "Failed to create reservation.");
        fetchReservationsForDay();
      }
    } catch (err) {
      console.error("Booking error:", err);
      alert("Failed to book - server error.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="flex items-center justify-center">Book Room</h3>

        <p>
          <strong>Building:</strong> {building} · <strong>Floor:</strong> {floor} · <strong>Room:</strong> {roomName}
        </p>

        {/* Input Form */}
        {showForm && (
          <>
            <label>Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />

            <label>Start Time:</label>
            <select
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                setEndTime("");
              }}
            >
              <option value="">-- Select Start --</option>
              {availableStartTimes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <label>End Time:</label>
            <select value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={!startTime}>
              <option value="">-- Select End --</option>
              {availableEndTimes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <label>Notes (optional):</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />

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

            <div><strong>Room Description:</strong> {roomDesc}</div>
            <div><strong>Reserved by:</strong> {reservedBy}</div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15px" }}>
              <button className="px-3 py-2 border rounded" onClick={onClose}>Cancel</button>
              <button className="px-3 py-2 bg-yellow-500 text-white rounded" onClick={handleSubmit}>Submit</button>
            </div>
          </>
        )}

        {/* Confirm Reservation Section */}
        {showConfirm && (
          <div className="mt-4 p-4 border rounded bg-gray-50">
            <h4 className="font-medium mb-2">Confirm Reservation</h4>
            <div>
              <div><strong>Building:</strong> {building}</div>
              <div><strong>Floor:</strong> {floor}</div>
              <div><strong>Room Number:</strong> {roomNumber}</div>
              <div><strong>Room Name:</strong> {roomName}</div>
              <div><strong>Room Description:</strong> {roomDesc}</div>
              <div><strong>Date:</strong> {date}</div>
              <div><strong>Time:</strong> {startTime} - {endTime}</div>
              <div><strong>Reserved by:</strong> {reservedBy}</div>
              <div><strong>Notes:</strong> {notes}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
              <button
                className="px-3 py-2 border rounded"
                onClick={() => {
                  setShowConfirm(false);
                  setShowForm(true);
                }}
              >
                Cancel
              </button>
              <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={handleReserve}>
                Reserve
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReservationModal;
