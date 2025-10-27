// src/components/Dashboard/ReservationModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { toPH } from "../../../../server/utils/dateUtils.ts";
import dayjs from "dayjs";
import "../../../styles/modal.css";
import "../../../styles/dashboard.css";
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";


interface ReservationModalProps {
  roomId: number;
  building: string;
  floor: string;
  roomNumber: string;
  roomDesc: string;
  roomName: string;
  name: string;
  currentUserId: number | null;
  reservedBy: string;
  userRole: number;
  onClose: () => void;
  onSuccess: () => void;
  onBookingSuccess?: () => void;
  refreshPendingBookings: () => void;
  refreshMyBookings: () => void;
}

// --- Generate all 15-min start/end slots ---
const generateStartSlots = () =>
  Array.from({ length: 24 * 4 }, (_, i) =>
    `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15 + 1).padStart(2, "0")}`
  );

const generateEndSlots = () =>
  Array.from({ length: 24 * 4 }, (_, i) => {
    const h = Math.floor(i / 4);
    const m = (i % 4) * 15 + 15;
    if (m === 60 && h < 23) return `${String(h + 1).padStart(2, "0")}:00`;
    if (m < 60) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    return null;
  }).filter(Boolean) as string[];

const ALL_START_SLOTS = generateStartSlots();
const ALL_END_SLOTS = generateEndSlots();

const ReservationModal: React.FC<ReservationModalProps> = ({
  roomId,
  building,
  floor,
  currentUserId,
  roomNumber,
  roomDesc,
  roomName,
  reservedBy,
  userRole,
  onClose,
  onSuccess,
  onBookingSuccess,
  refreshPendingBookings,
}) => {
  const isAdmin = userRole === 1 || userRole === 2;
  const canUseRecurrence = isAdmin;

  const [reservations, setReservations] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>();
  const [selectedTeacherName, setSelectedTeacherName] = useState("");

  const [date, setDate] = useState(toPH(new Date()).format("YYYY-MM-DD"));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState("");

  // Recurrence states
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"once" | "daily">("once");
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const today = dayjs().format("YYYY-MM-DD");

  // Fetch teachers (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    const fetchTeachers = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/users");
        const data = await res.json();
        if (Array.isArray(data.users)) setTeachers(data.users.filter(u => u.role === 3));
        console.log("Teachers fetched:", data.users);
      } catch (err) {
        console.error("Error fetching teachers:", err);
      }
    };
    fetchTeachers();
  }, [isAdmin]);

  // Fetch email
  const fetchEmail = async () => {
    try {
      const userId = isAdmin && selectedTeacherId ? selectedTeacherId : currentUserId;
      if (!userId) return;
      const res = await fetch(`http://localhost:5000/api/users/getEmail/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch email");
      const data = await res.json();
      setEmail(data.email || "");
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEmail();
  }, [currentUserId, selectedTeacherId]);

  const handleDayToggle = (day: string) =>
    setRecurrenceDays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]));

  // Fetch reservations
  const fetchBookedTimes = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/room_bookings?room_id=${roomId}&date=${date}`);
      const data = await res.json();
      setReservations(Array.isArray(data) ? data : []);
      
    } catch (err) {
      console.error(err);
      setReservations([]);
    }
  };

  useEffect(() => {
    fetchBookedTimes();
  }, [roomId, date]);

  // --- Time helpers ---
  const timeToMinutes = (t: string) => t.split(":").map(Number).reduce((a, b) => a * 60 + b);
  const minutesToTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  // Available start/end times
  const availableStartTimes = useMemo(() => {
    return ALL_START_SLOTS.filter(slot => {
      const slotMin = timeToMinutes(slot);
      return !reservations.some(r => {
        const start = timeToMinutes(r.start);
        const end = timeToMinutes(r.end);
        return slotMin >= start && slotMin < end;
      });
    });
  }, [reservations]);

  const availableEndTimes = useMemo(() => {
    if (!startTime) return [];
    const startMin = timeToMinutes(startTime);
    const nextBooking = reservations
      .map(r => timeToMinutes(r.start))
      .filter(s => s > startMin)
      .sort((a, b) => a - b)[0];
    const limit = nextBooking ? nextBooking - 1 : 24 * 60;

    return ALL_END_SLOTS.filter(slot => {
      const slotMin = timeToMinutes(slot);
      if (slotMin <= startMin || slotMin > limit) return false;
      return !reservations.some(r => {
        const rStart = timeToMinutes(r.start);
        const rEnd = timeToMinutes(r.end);
        return slotMin > rStart && slotMin <= rEnd;
      });
    });
  }, [startTime, reservations]);

  // --- Validation ---
  const conflictsWithExisting = (s: string, e: string) => {
    const startMin = timeToMinutes(s);
    const endMin = timeToMinutes(e);
    return reservations.some(r => {
      const rStart = timeToMinutes(r.start);
      const rEnd = timeToMinutes(r.end);
      return startMin < rEnd && endMin > rStart;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) return alert("Please pick times.");
    if (startTime >= endTime) return alert("End must be after start.");
    if (isAdmin && !selectedTeacherId) return alert("Please select a teacher.");
    setShowConfirm(true);
  };

   // ---------- Fetch pending bookings (ForApprovalTab) ----------
  const fetchUserPendingReservations = async () => {
  if (!currentUserId || !userRole) return;
console.log("ReservationModal currentUserId : ", currentUserId)
console.log("ReservationModal userRole : ", userRole)
  try {
    const res = await fetch(
      `http://localhost:5000/api/room_bookings/pending?userRole=${userRole}&userId=${currentUserId}`,
      { method: "GET", credentials: "include" }
    );
     if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error fetching pending reservations:", err);
    return [];
  }
};

const isOverlapping = (newRes, pendingRes) => {
  if (newRes.roomId !== pendingRes.roomId) return false;
  if (newRes.date !== pendingRes.date) return false;

  const newStart = new Date(`${newRes.date}T${newRes.startTime}`);
  const newEnd = new Date(`${newRes.date}T${newRes.endTime}`);
  const pendingStart = new Date(`${pendingRes.date}T${pendingRes.startTime}`);
  const pendingEnd = new Date(`${pendingRes.date}T${pendingRes.endTime}`);

  return newStart < pendingEnd && newEnd > pendingStart;
};


const handleReserve = async () => {
  try {
    // --- fetch pending reservations ---
    const pendingReservations = await fetchUserPendingReservations();
    const newReservation = { roomId, date, startTime, endTime };
    const conflict = pendingReservations.find((r) => isOverlapping(newReservation, r));
console.log("newReservation : ", newReservation)
console.log("pendingReservations : ", pendingReservations)
console.log("conflict : ", conflict)
    if (conflict) {
      // Display interactive toast
      toast.warn(() => (
        <div>
          <p>
            You still have a pending reservation on this room on {conflict.date} at {conflict.startTime} - {conflict.endTime} that overlaps this reservation.
          </p>
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <button
              onClick={async (e) => {
                e.stopPropagation();           // prevent toast auto-close issues
                toast.dismiss();              // close the toast
                await submitReservation();    // proceed with submission
              }}
              style={{
                backgroundColor: "green",
                color: "white",
                padding: "4px 8px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Yes, proceed
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss();
              }}
              style={{
                backgroundColor: "red",
                color: "white",
                padding: "4px 8px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              No, cancel
            </button>
          </div>
        </div>
      ), { autoClose: false, closeButton: false });
      return; // wait for user action
    }

    // --- no conflicts → normal submit ---
    await submitReservation();
  } catch (err) {
    console.error(err);
    toast.error("Failed to book - server error.");
  }
};

  
const submitReservation = async () => {
  try {
    const todayPH = toPH(new Date());
    const selectedDatePH = toPH(date);

    if (selectedDatePH.isBefore(todayPH, "day")) {
      alert("Cannot select past date.");
      return;
    }

    let finalStartDate = startDate || todayPH.format("YYYY-MM-DD");
    let finalEndDate = endDate || toPH(new Date()).add(7, "days").format("YYYY-MM-DD");

    const finalReservedBy = isAdmin ? selectedTeacherName : reservedBy;
    const finalUserId = isAdmin ? selectedTeacherId! : currentUserId!;
    const status = isAdmin ? "approved" : "pending";

    const bodyData = {
      roomId,
      roomName,
      building,
      roomNumber,
      roomDesc,
      floor,
      date,
      startTime,
      endTime,
      recurrence: isRecurring ? { type: recurrenceType, days: recurrenceType === "daily" ? recurrenceDays : [], start_date: finalStartDate, end_date: finalEndDate } : null,
      reserved_by: finalReservedBy,
      user_id: finalUserId,
      assigned_by: reservedBy,
      notes,
      status,
      email,
    };
console.log("Submitting reservation bodyData:", bodyData);

    const res = await fetch("http://localhost:5000/api/room_bookings/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyData),
    });

    if (res.ok) {
      toast.success("Reservation saved!");
      onBookingSuccess?.();
      onSuccess();
      fetchBookedTimes();
      refreshPendingBookings?.();
      setShowConfirm(false);
      setDate(toPH(new Date()).format("YYYY-MM-DD"));
      setStartTime("");
      setEndTime("");
      setNotes("");
      setSelectedTeacherId(undefined);
      setSelectedTeacherName("");
      setIsRecurring(false);
      setRecurrenceType("once");
      setRecurrenceDays([]);
      setStartDate("");
      setEndDate("");
    } else {
      const err = await res.json();
      alert(err.message || "Failed to create reservation.");
      fetchBookedTimes();
    }
  } catch (err) {
    console.error(err);
    alert("Failed to book - server error.");
  }
};

  // --- JSX remains mostly unchanged ---
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="flex items-center justify-center">Book Room</h3>
        <p>
          <strong>Building:</strong> {building} · <strong>Floor:</strong> {floor} · <strong>Room:</strong> {roomName}
        </p>

        {!showConfirm && (
          <form onSubmit={handleSubmit}>
            {isAdmin && (
<div style={{ position: "relative" }}>
  <label>Select Teacher:</label>
  <input
    type="text"
    value={selectedTeacherName}
    onChange={(e) => {
      const val = e.target.value;
      setSelectedTeacherName(val);

      // Clear selected teacher if user types/backspaces
      if (selectedTeacherId && val !== teachers.find(t => t.id === selectedTeacherId)?.name) {
        setSelectedTeacherId(undefined);
      }
    }}
    placeholder="Type teacher's name"
    style={{ width: "100%", padding: "5px" }}
  />

  {/* Dropdown */}
  {selectedTeacherName.trim() !== "" && selectedTeacherId === undefined && teachers.filter(t =>
    t.name.toLowerCase().includes(selectedTeacherName.toLowerCase())
  ).length > 0 && (
    <ul style={{
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      maxHeight: "120px",
      overflowY: "auto",
      border: "1px solid #ccc",
      background: "white",
      zIndex: 10,
      margin: 0,
      padding: 0,
      listStyle: "none"
    }}>
      {teachers.filter(t =>
        t.name.toLowerCase().includes(selectedTeacherName.toLowerCase())
      ).map(t => (
        <li
          key={t.id}
          style={{ padding: "5px", cursor: "pointer", borderBottom: "1px solid #eee" }}
          onClick={() => {
            setSelectedTeacherId(t.id);
            setSelectedTeacherName(t.name);
            // Dropdown automatically hides because selectedTeacherId is now set
          }}
        >
          {t.name}
        </li>
      ))}
    </ul>
  )}
</div>

            )}

            {!isRecurring && (
              <>
                <label>Date:</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={today} />
              </>
            )}

            {canUseRecurrence && (
              <div className="mt-4 border-t pt-3">
                <label>
                  <input type="checkbox" checked={isRecurring} onChange={(e) => { const checked = e.target.checked; setIsRecurring(checked); setRecurrenceType(checked ? "daily" : "once"); if (!checked) setRecurrenceDays([]); }} /> Recurring
                </label>
                {isRecurring && (
                  <>
                    <p className="text-sm font-medium">Days:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                        <label key={day} className="flex items-center gap-1">
                          <input type="checkbox" checked={recurrenceDays.includes(day)} onChange={() => handleDayToggle(day)} />{day}
                        </label>
                      ))}
                    </div>
                    <div>
                      <label>Start Date:</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={today} />
                      <label>End Date:</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || today} />
                    </div>
                  </>
                )}
              </div>
            )}

            <label>Start Time:</label>
            <select value={startTime} onChange={e => { setStartTime(e.target.value); setEndTime(""); }}
              disabled={new Date(date) < new Date(new Date().toISOString().split("T")[0])} // disable if date is in past
              >
              <option value="">-- Select Start --</option>
              {availableStartTimes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <label>End Time:</label>
            <select value={endTime} onChange={e => setEndTime(e.target.value)} disabled={!startTime}>
              <option value="">-- Select End --</option>
              {availableEndTimes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <label>Notes:</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} maxLength={250} placeholder="Optional notes" />

            {reservations.length > 0 && (
              <div className="mb-2">
                <strong>Already booked (approved):</strong>
                <ul>{reservations.map(i => <li key={i.start + i.end}>{i.start} - {i.end} ({i.reserved_by})</li>)}</ul>
              </div>
            )}

            <div style={{ marginTop: "15px", display: "flex", justifyContent: "space-between" }}>
              <button type="button" onClick={onClose}>Cancel</button>
              <button type="submit" className="bg-yellow-500 text-white px-3 py-2 rounded">Submit</button>
            </div>
          </form>
        )}

        {showConfirm && (
          <div className="mt-4 p-4 border rounded bg-gray-50">
            <h4 className="font-medium mb-2">Confirm Reservation</h4>
            <div>
              {!isRecurring ? (
                <div><strong>Date:</strong> {date}</div>
              ) : (
                <>
                  <div><strong>Start Date:</strong> {startDate}</div>
                  <div><strong>End Date:</strong> {endDate}</div>
                  {recurrenceDays.length > 0 && <div><strong>Days:</strong> {recurrenceDays.join(", ")}</div>}
                </>
              )}
              <div><strong>Time:</strong> {startTime} - {endTime}</div>
              <div><strong>Reserved By:</strong> {isAdmin ? selectedTeacherName : reservedBy}</div>
              <div><strong>Email:</strong> {email || "N/A"}</div>
              <div><strong>Notes:</strong> {notes || "None"}</div>
            </div>
            <div style={{ marginTop: "15px", display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setShowConfirm(false)}>Back</button>
              <button onClick={handleReserve} className="bg-green-500 text-white px-3 py-2 rounded">Confirm</button>
            </div>
          </div>
        )}
      </div>
            <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default ReservationModal;
