// src/components/Dashboard/ReservationModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { toPH,  } from "../../../../server/utils/dateUtils.ts";
import dayjs from "dayjs";

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
  refreshMyBookings,
}) => {
  const isAdmin = userRole === 1 || userRole === 2;
  const canUseRecurrence = isAdmin;

  const [reservations, setReservations] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>();
  const [selectedTeacherName, setSelectedTeacherName] = useState("");
  const [date, setDate] = useState(toPH(new Date()).format("YYYY-MM-DD")); // ✅ PH timezone
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [finalUserId, setFinalUserId] = useState<number | null>(currentUserId);
  const [email, setEmail] = useState("");



  
  // Recurrence states
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"once" | "daily">("once");
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const selectedDate = isRecurring ? startDate : date;
const today = dayjs().format("YYYY-MM-DD");
const nowTime = dayjs().format("HH:mm");




  useEffect(() => {
    if (!isAdmin) return;
    const fetchTeachers = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/users");
        const data = await res.json();
        if (Array.isArray(data.users)) {
          const role3Teachers = data.users.filter((u) => u.role === 3);
          setTeachers(role3Teachers);
        }
      } catch (err) {
        console.error("Error fetching teachers:", err);
      }
    };
    fetchTeachers();
  }, [isAdmin]);

  const fetchEmail = async () => {
    try {
      if (!currentUserId) return;
      let url = "";
      if (isAdmin && selectedTeacherId) {
        url = `http://localhost:5000/api/users/getEmail/${selectedTeacherId}`;
      } else {
        url = `http://localhost:5000/api/users/getEmail/${currentUserId}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch email");
      const data = await res.json();
      setEmail(data.email || "");
    } catch (err) {
      console.error("Error fetching email:", err);
    }
  };

  useEffect(() => {
    if (isAdmin && selectedTeacherId) fetchEmail();
  }, [selectedTeacherId]);

  useEffect(() => {
    if (!isAdmin) fetchEmail();
  }, [currentUserId]);

  const handleDayToggle = (day: string) => {
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const fetchReservationsForDay = async () => {
    try {
      const url = new URL("http://localhost:5000/api/room_bookings/reservations");
      url.searchParams.append("roomId", String(roomId));
      url.searchParams.append("date", date);
      const res = await fetch(url.toString());
      const data = await res.json();
      const mapped = (data.reservations || []).map((r: any) => ({
        ...r,
        start_time: r.reservation_start,
        end_time: r.reservation_end,
        date: r.date_reserved,
        datePH: toPH(r.date_reserved).format("YYYY-MM-DD"), // ✅ PH date for comparisons
      }));
      setReservations(mapped);
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

  const isSlotAvailable = (time: string, checkDate?: string) => {
    const timeMin = timeToMinutes(time);

    for (const r of reservations.filter((r) => r.start_time && r.end_time)) {
      const rStart = timeToMinutes(r.start_time);
      const rEnd = timeToMinutes(r.end_time);
      if (timeMin >= rStart && timeMin < rEnd) return false;
    }

    const todayPH = toPH(new Date());
    const compareDatePH = checkDate ? toPH(checkDate) : toPH(date);

    if (compareDatePH.isSame(todayPH, "day")) {
      const [h, m] = time.split(":").map(Number);
      const slotDatePH = todayPH.hour(h).minute(m).second(0);
      if (slotDatePH.isBefore(todayPH)) return false;
    }

    return true;
  };

  const availableStartTimes = useMemo(() => {
    const checkDate =
      isRecurring && recurrenceType === "daily" && startDate ? startDate : date;
    return ALL_START_SLOTS.filter((t) => isSlotAvailable(t, checkDate));
  }, [reservations, date, isRecurring, recurrenceType, startDate]);

  // Filter available start times dynamically
const filteredStartTimes = availableStartTimes.filter((t) => {
  if (!selectedDate) return false; // no date selected
  if (selectedDate < today) return false; // past date → disable all
  if (selectedDate === today) return t >= nowTime; // today → only future times
  return true; // future dates → allow all
});

  const availableEndTimes = useMemo(() => {
    if (!startTime) return ALL_END_SLOTS.filter((t) => isSlotAvailable(t));
    const startMin = timeToMinutes(startTime);
    const checkDate =
      isRecurring && recurrenceType === "daily" && startDate ? startDate : date;

    return ALL_END_SLOTS.filter((t) => {
      const endMin = timeToMinutes(t);
      if (endMin <= startMin) return false;
      for (const r of reservations.filter((r) => r.start_time && r.end_time)) {
        const rStart = timeToMinutes(r.start_time);
        const rEnd = timeToMinutes(r.end_time);
        if (startMin < rEnd && endMin > rStart) return false;
      }
      return isSlotAvailable(t, checkDate);
    });
  }, [startTime, reservations, date, isRecurring, recurrenceType, startDate]);

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
    if (isAdmin && !selectedTeacherId)
      return alert("Please select a teacher for this booking.");
    setShowForm(false);
    setShowConfirm(true);
  };

  const handleReserve = async () => {
    try {
      const todayPH = toPH(new Date());
      const selectedDatePH = toPH(date);

      if (selectedDatePH.isBefore(todayPH, "day")) {
        alert("You cannot select a past date (PH time).");
        return;
      }

      let finalStartDate = startDate;
      let finalEndDate = endDate;

      if (isRecurring && recurrenceType === "daily") {
        if (!finalStartDate) finalStartDate = todayPH.format("YYYY-MM-DD");
        if (!finalEndDate) finalEndDate = toPH(new Date()).add(7, "days").format("YYYY-MM-DD");
      }

      let finalReservedBy: string;
      let finalUserId: number;
      let finalAssignedBy: string;
      let status: "pending" | "approved";

      if (isAdmin) {
        finalReservedBy = selectedTeacherName;
        finalUserId = selectedTeacherId!;
        finalAssignedBy = reservedBy;
        status = "approved";
      } else {
        finalReservedBy = reservedBy;
        finalUserId = currentUserId!;
        finalAssignedBy = reservedBy;
        status = "pending";
      }

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
        recurrence: isRecurring
          ? {
              type: recurrenceType,
              days: recurrenceType === "daily" ? recurrenceDays : [],
              start_date: finalStartDate,
              end_date: finalEndDate,
            }
          : null,
        reserved_by: finalReservedBy,
        user_id: finalUserId,
        assigned_by: finalAssignedBy,
        notes,
        status,
        email,
      };

      const res = await fetch("http://localhost:5000/api/room_bookings/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      if (res.ok) {
        alert("Reservation saved!");
        if (onBookingSuccess) await onBookingSuccess();
        onSuccess();
        await fetchReservationsForDay();
        refreshPendingBookings?.();

        // Reset form
        setShowConfirm(false);
        setShowForm(true);
        setDate(todayPH.format("YYYY-MM-DD"));
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
          <strong>Building:</strong> {building} · <strong>Floor:</strong>{" "}
          {floor} · <strong>Room:</strong> {roomName}
        </p>

        {showForm && (
          <>
            {isAdmin && (
              <div>
                <label>Select Teacher:</label>
                <div style={{ position: "relative", maxHeight: "120px" }}>
                  <input
                    type="text"
                    value={selectedTeacherName}
                    onChange={(e) => {
                      setSelectedTeacherName(e.target.value);
                      setSelectedTeacherId(undefined); // reset selected ID while typing
                    }}
                    placeholder="Type teacher's name"
                    style={{ width: "100%", padding: "5px" }}
                  />
                  {selectedTeacherName &&
                    teachers.some((t) =>
                      t.name
                        .toLowerCase()
                        .includes(selectedTeacherName.toLowerCase())
                    ) && (
                      <ul
                        style={{
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
                          listStyle: "none",
                        }}
                      >
                        {teachers
                          .filter((t) =>
                            t.name
                              .toLowerCase()
                              .includes(selectedTeacherName.toLowerCase())
                          )
                          .map((t) => (
                            <li
                              key={t.id}
                              style={{
                                padding: "5px",
                                cursor: "pointer",
                                borderBottom: "1px solid #eee",
                              }}
                              onClick={() => {
                                setSelectedTeacherId(t.id);
                                setSelectedTeacherName(t.name);
                              }}
                            >
                              {t.name}
                            </li>
                          ))}
                      </ul>
                    )}
                </div>
              </div>
            )}


            {!isRecurring && (
              <>
                <label>Date:</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </>
            )}

            {canUseRecurrence && (
              <div className="mt-4 border-t pt-3">
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsRecurring(checked);
                      setRecurrenceType(checked ? "daily" : "once");
                      if (!checked) setRecurrenceDays([]);
                    }}
                    style={{ margin: 0, transform: "scale(1.1)" }}
                  />
                  Recurring
                </label>

                {isRecurring && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Days:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                        (day) => (
                          <label key={day} className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={recurrenceDays.includes(day)}
                              onChange={() => handleDayToggle(day)}
                            />
                            {day}
                          </label>
                        )
                      )}
                    </div>

                    <div className="mt-2">
                      <label>Start Date:</label>
                      <input
                        type="date"
                        className="input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                      <label>End Date:</label>
                      <input
                        type="date"
                        className="input"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate || new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <label>Start Time:</label>
              <select
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setEndTime("");
                }}
                disabled={selectedDate < today || !selectedDate}
              >
                <option value="">-- Select Start --</option>
                {filteredStartTimes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

            <label>End Time:</label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={!startTime}
            >
              <option value="">-- Select End --</option>
              {availableEndTimes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <label>Notes:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />

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
                marginTop: "15px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <button onClick={onClose}>Cancel</button>
              <button
                onClick={handleSubmit}
                className="bg-yellow-500 text-white px-3 py-2 rounded"
              >
                Submit
              </button>
            </div>
          </>
        )}

        {/* Confirm section */}
        {showConfirm && (
          <div className="mt-4 p-4 border rounded bg-gray-50">
            <h4 className="font-medium mb-2">Confirm Reservation</h4>
            <div>
              {!isRecurring ? (
                <div>
                  <strong>Date:</strong> {date}
                </div>
              ) : (
                <>
                  <div>
                    <strong>Start Date:</strong> {startDate}
                  </div>
                  <div>
                    <strong>End Date:</strong> {endDate}
                  </div>
                  {recurrenceDays.length > 0 && (
                    <div>
                      <strong>Days:</strong> {recurrenceDays.join(", ")}
                    </div>
                  )}
                </>
              )}

              <div>
                <strong>Time:</strong> {startTime} - {endTime}
              </div>
              <div>
                <strong>Reserved By:</strong>{" "}
                {isAdmin ? selectedTeacherName : reservedBy}
              </div>
              <div>
                <strong>Email:</strong> {email || "N/A"}
              </div>
              <div>
                <strong>Notes:</strong> {notes || "None"}
              </div>
            </div>

            <div
              style={{
                marginTop: "15px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setShowForm(true);
                }}
              >
                Back
              </button>
              
              <button
                onClick={handleReserve}
                className="bg-green-500 text-white px-3 py-2 rounded"
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReservationModal;