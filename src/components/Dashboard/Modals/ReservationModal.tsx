/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
// @ts-ignore
import { toPH } from '../../../../server/utils/dateUtils';
import dayjs from "dayjs";
import "../../../styles/modal.css";
import "../../../styles/dashboard.css";
import "react-toastify/dist/ReactToastify.css";
import { toast } from "react-toastify";

interface ReservationModalProps {
  roomId: number;
  building: string;
  floor: number;
  roomNumber: string;
  roomDesc: string;
  roomName: string;
  currentUserId: number | null;
  reservedBy: string;
  userRole: number;
  max_capacity: number;
  onClose: () => void;
  onSuccess: () => void;
  refreshMyBookings?: () => void;
  onBookingSuccess?: () => void;
  refreshPendingBookings?: () => void;
  chairs?: number;
  has_tv?: number;
  has_table?: number;
  has_projector?: number;
}


const format12Hour = (time24: string) => {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};


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

const ReservationModal: React.FC<ReservationModalProps> = (props) => {
  const {
    roomId,
    building,
    floor,
    currentUserId,
    roomNumber,
    roomDesc,
    roomName,
    max_capacity,
    reservedBy,
    userRole,
    onClose,
    onSuccess,
    onBookingSuccess,
    refreshPendingBookings,
    chairs,
    has_tv,
    has_table,
    has_projector,
  } = props;

  const isAdmin = userRole === 1 || userRole === 2;
  const canUseRecurrence = isAdmin || userRole === 3;

  const [reservations, setReservations] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>();
  const [selectedTeacherName, setSelectedTeacherName] = useState("");

  const [date, setDate] = useState(toPH(new Date().toISOString()).format("YYYY-MM-DD"));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState("");

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"once" | "daily">("once");
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [subject, setSubject] = useState("");


  const today = dayjs().format("YYYY-MM-DD");

  // ✅ CHANGED: Unified date used for time slot logic
  const effectiveDate = isRecurring ? (startDate || date) : date;

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        if (Array.isArray(data.users))
          setTeachers(data.users.filter((u: { role: number; }) => u.role === 3));
      } catch (err) {
        console.error(err);
      }
    })();
  }, [isAdmin]);

  useEffect(() => {
    (async () => {
      try {
        const userId = isAdmin && selectedTeacherId ? selectedTeacherId : currentUserId;
        if (!userId) return;
        const res = await fetch(`/api/users/getEmail/${userId}`);
        const data = await res.json();
        setEmail(data.email || "");
      } catch (err) {
        console.error(err);
      }
    })();
  }, [selectedTeacherId, currentUserId]);

  const handleDayToggle = (day: string) =>
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );

  // ✅ CHANGED: fetch using effectiveDate
  const fetchBookedTimes = async () => {
    try {
      const res = await fetch(
        `/api/room_bookings?room_id=${roomId}&date=${effectiveDate}`
      );
      const data = await res.json();
      const normalized = (Array.isArray(data) ? data : []).map((r: any) => {
        const start = r.start?.slice(0, 5);
        const end = r.end?.slice(0, 5);
        return { ...r, start, end };
      });
      const filtered = normalized.filter((r) =>
        r.status ? r.status === "approved" : true
      );
      setReservations(filtered);
    } catch {
      setReservations([]);
    }
  };

  // ✅ CHANGED dependency
  useEffect(() => {
    fetchBookedTimes();
  }, [roomId, effectiveDate]);

  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const LATEST_START_TODAY = 23 * 60 + 15;

  // ✅ CHANGED: use effectiveDate instead of date
  const availableStartTimes = useMemo(() => {
    const now = dayjs();
    const isToday = dayjs(effectiveDate).isSame(now, "day");
    const currentMinutes = now.hour() * 60 + now.minute();

    return ALL_START_SLOTS.filter((slot) => {
      const slotMin = timeToMinutes(slot);
      if (isToday && (slotMin <= currentMinutes || slotMin > LATEST_START_TODAY)) return false;
      for (const r of reservations) {
        const rStart = timeToMinutes(r.start);
        const rEnd = timeToMinutes(r.end);
        if (slotMin >= rStart && slotMin < rEnd) return false;
      }
      return true;
    });
  }, [effectiveDate, LATEST_START_TODAY, reservations]);

  // ✅ CHANGED: use effectiveDate instead of date
  const availableEndTimes = useMemo(() => {
    if (!startTime) return [];
    const startMin = timeToMinutes(startTime);

    const now = dayjs();
    const isToday = dayjs(effectiveDate).isSame(now, "day");

    const nextBooking = reservations
      .map((r) => timeToMinutes(r.start))
      .filter((s) => s > startMin)
      .sort((a, b) => a - b)[0];

    const limit = nextBooking ? nextBooking - 1 : 1440;

    return ALL_END_SLOTS.filter((slot) => {
      const slotMin = timeToMinutes(slot);
      if (slotMin <= startMin || slotMin > limit) return false;
      if (isToday && slotMin <= now.hour() * 60 + now.minute()) return false;
      return true;
    });
  }, [startTime, reservations, effectiveDate]);

//------------------------

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) return alert("Please pick times.");
    if (startTime >= endTime) return alert("End must be after start.");
    if (isAdmin && !selectedTeacherId) return alert("Please select a teacher.");
    setShowConfirm(true);
  };

  // --- Fetch pending reservations using new /pending endpoint ---
  const getPendingReservations = async () => {
    try {
      const queryParams = new URLSearchParams({
        userRole: String(userRole),
        userId: currentUserId ? String(currentUserId) : "",
      });
      const res = await fetch(`/api/room_bookings/pending?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch pending bookings");
      const data = await res.json();
      return data.bookings || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const isOverlapping = (newRes: { roomId: any; date: any; startTime: any; endTime: any; }, pendingRes: { room_id: any; date: any; reservation_start: any; reservation_end: any; }) => {
    if (newRes.roomId !== pendingRes.room_id) return false;
    if (newRes.date !== pendingRes.date) return false;

    const newStart = new Date(`${newRes.date}T${newRes.startTime}`);
    const newEnd = new Date(`${newRes.date}T${newRes.endTime}`);
    const pendingStart = new Date(`${pendingRes.date}T${pendingRes.reservation_start}`);
    const pendingEnd = new Date(`${pendingRes.date}T${pendingRes.reservation_end}`);

    return newStart < pendingEnd && newEnd > pendingStart;
  };

  const handleReserve = async () => {
    try {
      const pendingReservations = await getPendingReservations();
      const newReservation = { roomId, date, startTime, endTime };
      const conflict = pendingReservations.find((r: { room_id: any; date: any; reservation_start: any; reservation_end: any; }) => isOverlapping(newReservation, r));

      if (conflict) {
        toast.warn(() => (
          <div>
            <p>
              You still have a pending reservation on this room on {conflict.date} at {conflict.reservation_start} - {conflict.reservation_end} that overlaps this reservation.
            </p>
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <button
                onClick={async (e) => { e.stopPropagation(); toast.dismiss(); await submitReservation(); }}
                style={{ backgroundColor: "green", color: "white", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}
              >Yes, proceed</button>
              <button
                onClick={(e) => { e.stopPropagation(); toast.dismiss(); }}
                style={{ backgroundColor: "red", color: "white", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}
              >No, cancel</button>
            </div>
          </div>
        ), { autoClose: false, closeButton: false });
        return;
      }

      await submitReservation();
    } catch (err) {
      console.error(err);
      toast.error("Failed to book - server error.");
    }
  };

  const submitReservation = async () => {
    try {
      const todayPH = toPH(new Date().toISOString());
      const selectedDatePH = toPH(date);

      if (selectedDatePH.isBefore(todayPH, "day")) {
        alert("Cannot select past date.");
        return;
      }

      const finalStartDate = startDate || todayPH.format("YYYY-MM-DD");
      const finalEndDate = endDate ||toPH(new Date().toISOString()).add(7, "days").format("YYYY-MM-DD");

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
        subject,  
        notes,
        status,
        email,
      };

      const res = await fetch("api/room_bookings/book", {
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
        setDate(toPH(new Date().toISOString()).format("YYYY-MM-DD"));
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
        <h3 className="flex items-center justify-center">Book Room {roomNumber}</h3>
        <p>
          <strong>Room Name:</strong> {roomName}<br></br> 
          <strong>Floor:</strong> {floor} <br></br>
          <strong>Building:</strong> {building} · <br></br>
          <strong>Max Seat Capacity:</strong> {max_capacity} persons · <br></br>
       <strong>Description: {roomDesc}</strong> <br></br>
          · Avialable Chairs: {chairs ?? 0},<br></br>
          · TV: {has_tv ? "Yes" : "No"},<br></br>
          · Tables: {has_table ? "Yes" : "No"},<br></br>
          · Projector: {has_projector ? "Yes" : "No"}·
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
              {availableStartTimes.map(t => (
                  <option key={t} value={t}>
                    {format12Hour(t)}
                  </option>
                ))}

            </select>

            <label>End Time:</label>
            <select value={endTime} onChange={e => setEndTime(e.target.value)} disabled={!startTime}>
              <option value="">-- Select End --</option>
              {availableEndTimes.map(t => (
                <option key={t} value={t}>
                  {format12Hour(t)}
                </option>
              ))}

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
            <textarea value={notes} 
            onChange={e => setNotes(e.target.value.slice(0, 250))
          } maxLength={250} placeholder="Optional notes" />

                <p style={{ fontSize: "0.8em", color: "#555", marginTop: "2px" }}>
                  {notes.length} / Max 250 characters
                </p>
                    {reservations.length > 0 && (
                      <div className="mb-2">
                        <strong>Already booked (approved):</strong>
                        <div
                          style={{
                            maxHeight: "100px",   // ~5 items
                            overflowY: "auto",
                            border: "1px solid #ccc",
                            padding: "5px",
                            borderRadius: "4px",
                          }}
                        >
                          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                            {reservations
                              .slice() // copy array
                              .sort((a, b) => {
                                const toMinutes = (t: string) => {
                                  const [h, m] = t.split(":").map(Number);
                                  return h * 60 + m;
                                };
                                return toMinutes(a.start) - toMinutes(b.start);
                              })
                              .map((i) => (
                                <li key={i.start + i.end + i.reserved_by} style={{ padding: "2px 0" }}>
                                  {format12Hour(i.start)} - {format12Hour(i.end)} ({i.reserved_by})
                                </li>
                              ))}
                          </ul>
                        </div>
                      </div>
                    )}



            <div style={{ marginTop: "15px", display: "flex", justifyContent: "space-between" }}>
            <button type="submit" className="bg-yellow-500 text-white px-3 py-2 rounded">Submit</button>
             <button type="button"  className="btn-cancel" onClick={onClose}>Cancel</button>
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
              <div><strong>Time:</strong> {format12Hour(startTime)} - {format12Hour(endTime)}</div>
              <div><strong>Reserved By:</strong> {isAdmin ? selectedTeacherName : reservedBy}</div>
              <div><strong>Email:</strong> {email || "N/A"}</div>
              <div><strong>Subject:</strong> {subject || "N/A"}</div>

              <div><strong>Notes:</strong> {notes || "None"}</div>
            </div>
            <div style={{ marginTop: "15px", display: "flex", justifyContent: "space-between" }}>
              <button className="back-btn"onClick={() => setShowConfirm(false)}>Back</button>
              <button onClick={handleReserve} className="bg-green-500 text-white px-3 py-2 rounded">Confirm</button>
            </div>
          </div>
        )}
      </div>
           
    </div>
    
  );
  
};

export default ReservationModal;
