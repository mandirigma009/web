/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
// @ts-ignore
import { toPH } from "../../../../server/utils/dateUtils";
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


type DayLabel = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";


type YearOption = {
  id: number;
  year_level: number;
  department_id?: number;
};

type SubjectSchedule = {
  subjectId: number | "";
  subjectName: string;
  yearId: number | "";
  sectionId: number | "";
  days: DayLabel[];
  startTime: string;
  endTime: string;
  notes: string;
};

type TeacherUser = {
  id: number;
  name: string;
  role: number;
  department?: string;
  department_id?: number;
  year_level?: number;
  year_id?: number;
};

type ApprovedReservation = {
  start?: string;
  end?: string;
  status?: string;
  reserved_by?: string;
  date?: string;
};

type PendingReservation = {
  room_id: number;
  date: string;
  reservation_start: string;
  reservation_end: string;
};

type BookingPayload = {
  roomId: number;
  roomName: string;
  building: string;
  roomNumber: string;
  roomDesc: string;
  floor: number;
  date: string;
  startTime: string;
  endTime: string;
  recurrence: {
    type: "daily";
    days: DayLabel[];
    start_date: string;
    end_date: string;
  } | null;
  reserved_by: string;
  user_id: number;
  assigned_by: string;
  subject: string;
  subject_id: number | null;
  year_id: number | null;
  department_id: number | null;
  status: "approved" | "pending";
  email: string;
};

const DAYS: DayLabel[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];


const format12Hour = (time24: string) => {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

const generateStartSlots = () => {
  const ts: string[] = [];
  for (let h = 7; h <= 20; h++) {
    [0, 15, 30, 45].forEach((m) => {
      ts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    });
  }
  return ts;
};

const generateEndSlots = () => {
  const ts: string[] = [];
  for (let h = 7; h <= 21; h++) {
    [0, 15, 30, 45].forEach((m) => {
      if (h === 21 && m > 0) return;
      ts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    });
  }
  return ts;
};

const MIN_DURATION = 30;
const MAX_DURATION = 180;

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

  type AssignmentResponse = {
  teacherId: number;
  department_id: number | null;
  years: { id: number; name?: string }[];
  sections?: any[]; // adapt if you have a proper type
  subjects?: { id: number; name: string; year_id: number }[];
};

  const [assignmentResponse, setAssignmentResponse] = useState<AssignmentResponse | null>(null);

  const [teacherDepartmentId, setTeacherDepartmentId] = useState<number | null>(null);

  const isAdmin = userRole === 1 || userRole === 2;
  const canUseRecurrence = isAdmin || userRole === 3;
  

  const [reservations, setReservations] = useState<ApprovedReservation[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [availableYears, setAvailableYears] = useState<YearOption[]>([]);

  const [selectedTeacherId, setSelectedTeacherId] = useState<number | undefined>(undefined);
  const [selectedTeacherName, setSelectedTeacherName] = useState("");


  const today = dayjs().format("YYYY-MM-DD");
  const [date, setDate] = useState(today);
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState("");

  const [isRecurring, setIsRecurring] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
const disableCardInputs = isRecurring && (!startDate || !endDate);
const createEmptySchedule = (): SubjectSchedule => ({
  subjectId: "",
  subjectName: "",
  yearId: "",
  sectionId: "",
  days: [],
  startTime: "",
  endTime: "",
  notes: "",
});

const [subjectSchedules, setSubjectSchedules] = useState<SubjectSchedule[]>([
  createEmptySchedule(),
]);

  const effectiveDate = isRecurring ? (startDate || date) : date;

  const activeTeacher = useMemo(() => {
    const activeId = isAdmin ? selectedTeacherId : currentUserId;
    if (!activeId) return undefined;
    return teachers.find((t) => t.id === activeId);
  }, [teachers, selectedTeacherId, currentUserId, isAdmin]);


useEffect(() => {
}, [selectedTeacherId, selectedTeacherName, activeTeacher, teacherDepartmentId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/users");
        const data: { users?: TeacherUser[] } = await res.json();
        if (Array.isArray(data.users)) {
          setTeachers(data.users.filter((u) => u.role === 3));
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const userId = isAdmin && selectedTeacherId ? selectedTeacherId : currentUserId;
        if (!userId) {
          setEmail("");
          return;
        }

        const res = await fetch(`/api/users/getEmail/${userId}`);
        const data: { email?: string } = await res.json();
        setEmail(data.email || "");
      } catch (err) {
        console.error(err);
      }
    })();
  }, [selectedTeacherId, currentUserId, isAdmin]);


  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const handleDayToggle = (index: number, day: DayLabel) => {
    setSubjectSchedules((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const exists = item.days.includes(day);
        return {
          ...item,
          days: exists ? item.days.filter((d) => d !== day) : [...item.days, day],
        };
      })
    );
  };

  const hasDuplicateSchedules = (): boolean => {
  const combos = subjectSchedules.map(
    (s) => `${s.yearId}-${s.sectionId}-${s.subjectId}`
  );
  return new Set(combos).size !== combos.length;
};

const updateSubjectSchedule = (
  index: number,
  field: keyof SubjectSchedule,
  value: string | number | DayLabel[]
) => {
  setSubjectSchedules((prev) => {
    const newSchedules = prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );

    // check for duplicates
    const duplicates = newSchedules.some((itemA, iA) =>
      newSchedules.some(
        (itemB, iB) =>
          iA !== iB &&
          itemA.yearId &&
          itemA.sectionId &&
          itemA.subjectId &&
          itemA.yearId === itemB.yearId &&
          itemA.sectionId === itemB.sectionId &&
          itemA.subjectId === itemB.subjectId
      )
    );

    if (duplicates) {
      alert("Cannot select the same Year + Section + Subject on multiple cards.");
      // revert the current change
      return prev;
    }

    return newSchedules;
  });
};

const addSubjectSchedule = () => {
  if (subjectSchedules.length >= 3) {
    toast.warn("Maximum of 3 subjects only.");
    return;
  }

  setSubjectSchedules((prev) => [...prev, createEmptySchedule()]);
};

  const removeSubjectSchedule = (index: number) => {
    setSubjectSchedules((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const fetchBookedTimes = async () => {
    try {
      const res = await fetch(`/api/room_bookings?room_id=${roomId}&date=${effectiveDate}`);
      const data: ApprovedReservation[] | unknown = await res.json();

      const normalized = (Array.isArray(data) ? data : []).map((r: ApprovedReservation) => {
        const start = r.start?.slice(0, 5);
        const end = r.end?.slice(0, 5);
        return { ...r, start, end };
      });

      const filtered = normalized.filter((r) => (r.status ? r.status === "approved" : true));
      setReservations(filtered);
    } catch {
      setReservations([]);
    }
  };

  useEffect(() => {
    fetchBookedTimes();
  }, [roomId, effectiveDate]);

  const LATEST_START_TODAY = 20 * 60 + 30;

  const availableStartTimes = useMemo(() => {
    const now = dayjs();
    const isToday = dayjs(effectiveDate).isSame(now, "day");
    const currentMinutes = now.hour() * 60 + now.minute();

    return ALL_START_SLOTS.filter((slot) => {
      const slotMin = timeToMinutes(slot);

      if (isToday && (slotMin <= currentMinutes || slotMin > LATEST_START_TODAY)) {
        return false;
      }

      for (const r of reservations) {
        if (!r.start || !r.end) continue;

        const rStart = timeToMinutes(r.start);
        const rEnd = timeToMinutes(r.end);

        if (slotMin >= rStart && slotMin < rEnd) return false;
      }

      return true;
    });
  }, [effectiveDate, reservations]);

  const availableEndTimesFor = (startTime: string) => {
    if (!startTime) return [];

    const startMin = timeToMinutes(startTime);
    const now = dayjs();
    const isToday = dayjs(effectiveDate).isSame(now, "day");
    const currentMinutes = now.hour() * 60 + now.minute();

    const nextBookingStart = reservations
      .map((r) => (r.start ? timeToMinutes(r.start) : Number.POSITIVE_INFINITY))
      .filter((s) => s > startMin)
      .sort((a, b) => a - b)[0];

    const bookingLimit = nextBookingStart ?? 21 * 60;
    const maxAllowed = Math.min(startMin + MAX_DURATION, bookingLimit);

    return ALL_END_SLOTS.filter((slot) => {
      const slotMin = timeToMinutes(slot);
      const duration = slotMin - startMin;

      if (duration < MIN_DURATION) return false;
      if (slotMin > maxAllowed) return false;
      if (isToday && slotMin <= currentMinutes) return false;

      return true;
    });
  };

  const hasInternalOverlap = () => {
    for (let i = 0; i < subjectSchedules.length; i++) {
      const a = subjectSchedules[i];
      if (!a.startTime || !a.endTime) continue;

      for (let j = i + 1; j < subjectSchedules.length; j++) {
        const b = subjectSchedules[j];
        if (!b.startTime || !b.endTime) continue;

        const sameDay = a.days.some((d) => b.days.includes(d));
        if (!sameDay) continue;

        const aStart = timeToMinutes(a.startTime);
        const aEnd = timeToMinutes(a.endTime);
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);

        if (aStart < bEnd && aEnd > bStart) {
          return true;
        }
      }
    }

    return false;
  };

const validateSchedules = () => {
  if (subjectSchedules.length === 0) {
    return "Add at least one subject.";
  }

  if (subjectSchedules.length > 3) {
    return "Maximum of 3 subjects only.";
  }

  for (let i = 0; i < subjectSchedules.length; i++) {
    const item = subjectSchedules[i];

    if (!item.yearId) return `Year is required for subject ${i + 1}.`;
    if (!item.sectionId) return `Section is required for subject ${i + 1}.`;
    if (!item.subjectId) return `Subject ${i + 1} is required.`;
    if (!item.startTime) return `Start time for subject ${i + 1} is required.`;
    if (!item.endTime) return `End time for subject ${i + 1} is required.`;

    if (item.startTime >= item.endTime) {
      return `End time must be after start time for subject ${i + 1}.`;
    }

    if (isRecurring && item.days.length === 0) {
      return `Select at least one day for subject ${i + 1}.`;
    }
  }

  if (isRecurring) {
    if (!startDate) return "Start date is required.";
    if (!endDate) return "End date is required.";
    if (startDate > endDate) return "End date must be after start date.";
  }

  if (hasInternalOverlap()) {
    return "Some subject schedules overlap.";
  }

  return null;
};

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  const validationError = validateSchedules();
  if (validationError) {
    alert(validationError);
    return;
  }

  if (hasDuplicateSchedules()) {
    alert("Cannot have duplicate Year + Section + Subject across different cards.");
    return;
  }

  if (isAdmin && !selectedTeacherId) {
    alert("Please select a teacher.");
    return;
  }

  if (!isRecurring && subjectSchedules.length > 1) {
    alert("Non-recurring bookings can only submit one subject at a time.");
    return;
  }

  setShowConfirm(true);
};

  const getPendingReservations = async () => {
    try {
      const queryParams = new URLSearchParams({
        userRole: String(userRole),
        userId: currentUserId ? String(currentUserId) : "",
      });

      const res = await fetch(`/api/room_bookings/pending?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch pending bookings");

      const data: { bookings?: PendingReservation[] } = await res.json();
      return data.bookings || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const isOverlappingPending = (
    newRes: { roomId: number; date: string; startTime: string; endTime: string },
    pendingRes: PendingReservation
  ) => {
    if (newRes.roomId !== pendingRes.room_id) return false;
    if (newRes.date !== pendingRes.date) return false;

    const newStart = new Date(`${newRes.date}T${newRes.startTime}`);
    const newEnd = new Date(`${newRes.date}T${newRes.endTime}`);
    const pendingStart = new Date(`${pendingRes.date}T${pendingRes.reservation_start}`);
    const pendingEnd = new Date(`${pendingRes.date}T${pendingRes.reservation_end}`);

    return newStart < pendingEnd && newEnd > pendingStart;
  };

  const buildPayloads = (): BookingPayload[] => {
    const finalReservedBy = isAdmin ? selectedTeacherName : reservedBy;
    const finalUserId = isAdmin ? selectedTeacherId! : currentUserId!;
    const status: "approved" | "pending" = isAdmin ? "approved" : "pending";

    return subjectSchedules.map((schedule) => {
     const selectedSubject = assignmentResponse?.subjects?.find(
  (s) => s.id === schedule.subjectId
);

      return {
        roomId,
        roomName,
        building,
        roomNumber,
        roomDesc,
        floor,
        date: isRecurring ? startDate : date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        recurrence: isRecurring
          ? {
              type: "daily",
              days: schedule.days,
              start_date: startDate,
              end_date: endDate,
            }
          : null,
        reserved_by: finalReservedBy,
        user_id: finalUserId,
        assigned_by: reservedBy,
        subject: selectedSubject?.name || schedule.subjectName,
        subject_id: selectedSubject?.id ?? null,
        year_id: schedule.yearId ? Number(schedule.yearId) : null,
        section_id: schedule.sectionId ? Number(schedule.sectionId) : null,
        department_id: teacherDepartmentId,
        notes: schedule.notes,
        status,
        email,
      };
    });
  };

  // Debugging availableYears fetch
useEffect(() => {
  const teacherId = isAdmin ? selectedTeacherId : currentUserId;

  if (!teacherId) {
    setTeacherDepartmentId(null);
    setAvailableYears([]);
    setSubjectSchedules([createEmptySchedule()]);
    setAssignmentResponse(null); // clear previous
    return;
  }

  (async () => {
    try {
      const res = await fetch(`/api/room_bookings/teacher-assignments/${teacherId}`);
      const data = await res.json();



      setAssignmentResponse(data); // ✅ add this
      setTeacherDepartmentId(data.department_id || null);
      setAvailableYears(Array.isArray(data.years) ? data.years : []);
      setSubjectSchedules([createEmptySchedule()]);
    } catch (err) {
      console.error("Failed fetching teacher assignment:", err);
      setTeacherDepartmentId(null);
      setAvailableYears([]);
      setAssignmentResponse(null);
    }
  })();
}, [selectedTeacherId, currentUserId, isAdmin]);


  const handleReserve = async () => {
    try {
      const pendingReservations = await getPendingReservations();
      const payloads = buildPayloads();

      for (const payload of payloads) {
        const conflict = pendingReservations.find((r) => isOverlappingPending(payload, r));

        if (conflict) {
          toast.warn(
            () => (
              <div>
                <p>
                  You still have a pending reservation on this room on {conflict.date} at{" "}
                  {conflict.reservation_start} - {conflict.reservation_end} that overlaps this
                  reservation.
                </p>
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button
                    onClick={async (ev) => {
                      ev.stopPropagation();
                      toast.dismiss();
                      await submitReservation();
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
                    onClick={(ev) => {
                      ev.stopPropagation();
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
            ),
            { autoClose: false, closeButton: false }
          );
          return;
        }
      }

      await submitReservation();
    } catch (err) {
      console.error(err);
      toast.error("Failed to book - server error.");
    }
  };

  const submitReservation = async () => {
    try {
      const validationError = validateSchedules();
      if (validationError) {
        alert(validationError);
        return;
      }

      const todayPH = toPH(new Date().toISOString());
      const selectedDate = isRecurring ? startDate : date;
      const selectedDatePH = toPH(selectedDate);

      if (selectedDatePH.isBefore(todayPH, "day")) {
        alert("Cannot select past date.");
        return;
      }

      const payloads = buildPayloads();
      const res = await fetch("/api/room_bookings/bookMultiple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloads),
      });

      if (res.ok) {
        toast.success("Reservation saved!");
        onBookingSuccess?.();
        onSuccess();
        await fetchBookedTimes();
        refreshPendingBookings?.();

        setShowConfirm(false);
        setDate(today);
        setSelectedTeacherId(undefined);
        setSelectedTeacherName("");
        setAvailableYears([]);
        setIsRecurring(false);
        setStartDate("");
        setEndDate("");
        setSubjectSchedules([createEmptySchedule()]);
      } else {
        const err: { message?: string } = await res.json();
        alert(err.message || "Failed to create reservation.");
        await fetchBookedTimes();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to book - server error.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="flex items-center justify-center">Book Room {roomNumber}</h3>

        <p>
          <strong>Room Name:</strong> {roomName}
          <br />
          <strong>Floor:</strong> {floor}
          <br />
          <strong>Building:</strong> {building}
          <br />
          <strong>Max Seat Capacity:</strong> {max_capacity} persons
          <br />
          <strong>Description:</strong> {roomDesc}
          <br />
          <strong>Available Chairs:</strong> {chairs ?? 0}
          <br />
          <strong>TV:</strong> {has_tv ? "Yes" : "No"}
          <br />
          <strong>Tables:</strong> {has_table ? "Yes" : "No"}
          <br />
          <strong>Projector:</strong> {has_projector ? "Yes" : "No"}
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

                    // only clear if completely empty
                    if (val.trim() === "") {
                      setSelectedTeacherId(undefined);
                      setAvailableYears([]);
                    }
                  }}
                  placeholder="Type teacher's name"
                  style={{ width: "100%", padding: "5px" }}
                />

                {selectedTeacherName.trim() !== "" &&
                  selectedTeacherId === undefined &&
                  teachers.filter((t) =>
                    t.name.toLowerCase().includes(selectedTeacherName.toLowerCase())
                  ).length > 0 && (
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
                          t.name.toLowerCase().includes(selectedTeacherName.toLowerCase())
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
            )}

            {!isRecurring && (
              <>
                <label>Date:</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={today}
                />
              </>
            )}

            {canUseRecurrence && (
              <div className="mt-4 border-t pt-3">
                <table className="w-full table-auto">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-1 px-2 w-10">
                        <input
                          type="checkbox"
                          checked={isRecurring}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setIsRecurring(checked);

                            if (!checked) {
                              setStartDate("");
                              setEndDate("");

                              setSubjectSchedules((prev) => [
                                {
                                  ...prev[0],
                                  days: [],
                                },
                              ]);
                            }
                          }}
                        />
                      </td>
                      <td className="py-1 px-2">Recurring</td>
                    </tr>
                  </tbody>
                </table>

                {isRecurring && (
                  <div className="mt-3">
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                      <div>
                        <label>Start Date:</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          min={today}
                        />
                      </div>

                      <div>
                        <label>End Date:</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate || today}
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            <div style={{ marginTop: "16px" }}>
              {subjectSchedules.map((item, index) => (
                <div
                  key={index}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    padding: "10px",
                    marginBottom: "12px",
                  }}
                >

                  <div style={{ marginTop: "14px" }}>
                    <label>Year:</label>
                      <select
                        value={item.yearId}
                        onChange={(e) => {
                          const yearId = e.target.value ? Number(e.target.value) : "";

                          setSubjectSchedules((prev) =>
                            prev.map((schedule, i) =>
                              i === index
                                ? {
                                    ...schedule,
                                    yearId,
                                    sectionId: "",
                                    subjectId: "",
                                    subjectName: "",
                                  }
                                : schedule
                            )
                          );
                        }}
                        disabled={disableCardInputs || (isAdmin ? !selectedTeacherId : !teacherDepartmentId)}
                        style={{ width: "100%", padding: "5px" }}
                      >
                        {disableCardInputs && (
                          <p style={{ fontSize: "0.9em", color: "red", marginTop: "4px" }}>
                            Please select both Start Date and End Date before filling this class.
                          </p>
                        )}
                        <option value="">-- Select Year --</option>
                        {availableYears.map((y) => (
                          <option key={y.id} value={y.id}>
                            Year {y.year_level}
                          </option>
                        ))}
                      </select>

                    {!teacherDepartmentId && (
                      <p style={{ fontSize: "0.8em", color: "#555", marginTop: "4px" }}>
                        {isAdmin
                          ? "Select a teacher first so the department can load its years and subjects."
                          : "Loading your assigned department, years, and subjects."}
                      </p>
                    )}
                  </div>


                <div style={{ marginTop: "14px" }}>
                  <label>Section:</label>
                    <select
                      value={item.sectionId}
                      onChange={(e) => {
                        const sectionId = e.target.value ? Number(e.target.value) : "";

                        setSubjectSchedules((prev) =>
                          prev.map((schedule, i) =>
                            i === index
                              ? { ...schedule, sectionId }
                              : schedule
                          )
                        );
                      }}
                      disabled={disableCardInputs || !item.yearId}
                      style={{ width: "100%", padding: "5px", marginBottom: "8px" }}
                    >
                      <option value="">
                        {!item.yearId ? "-- Select year first --" : "-- Select Section --"}
                      </option>

                      {(assignmentResponse?.sections || [])
                        .filter((sec) => sec.year_id === item.yearId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                </div>


                  <label>Subject {index + 1}:</label>
                    <select
                      value={item.subjectId}
                      onChange={(e) => {
                        const value = e.target.value;
                        const selected = (assignmentResponse?.subjects || []).find(
                          (s) => s.id === Number(value)
                        );

                        setSubjectSchedules((prev) =>
                          prev.map((schedule, i) =>
                            i === index
                              ? {
                                  ...schedule,
                                  subjectId: value ? Number(value) : "",
                                  subjectName: selected?.name || "",
                                }
                              : schedule
                          )
                        );
                      }}
                      disabled={disableCardInputs || !item.yearId}
                      style={{ width: "100%", marginBottom: "8px" }}
                    >
                      <option value="">
                        {!item.yearId ? "-- Select year first --" : "-- Select Subject --"}
                      </option>

                      {(assignmentResponse?.subjects || [])
                        .filter((s) => s.year_id === item.yearId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>

                  {isRecurring && (
                    <>
                      <p className="text-sm font-medium">Days:</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {DAYS.map((day) => (
                          <label key={day} className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={item.days.includes(day)}
                              onChange={() => handleDayToggle(index, day)}
                              disabled={disableCardInputs}
                            />
                            {day}
                          </label>
                        ))}
                      </div>
                    </>
                  )}

                  <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
                    <div>
                      <label>Start Time:</label>
                      <select
                        value={item.startTime}
                        onChange={(e) => {
                          updateSubjectSchedule(index, "startTime", e.target.value);
                          updateSubjectSchedule(index, "endTime", "");
                        }}
                        disabled={disableCardInputs}
                      >
                        <option value="">-- Select Start --</option>
                        {availableStartTimes.map((t) => (
                          <option key={t} value={t}>
                            {format12Hour(t)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label>End Time:</label>
                      <select
                        value={item.endTime}
                        onChange={(e) => updateSubjectSchedule(index, "endTime", e.target.value)}
                        disabled={disableCardInputs || !item.startTime}
                      >
                        <option value="">-- Select End --</option>
                        {availableEndTimesFor(item.startTime).map((t) => (
                          <option key={t} value={t}>
                            {format12Hour(t)}
                          </option>
                        ))}
                      </select>
                    </div>

                      <label>Notes:</label>
                      <textarea
                        value={item.notes}
                        onChange={(e) =>
                          updateSubjectSchedule(index, "notes", e.target.value.slice(0, 250))
                        }
                        maxLength={250}
                        placeholder="Optional notes"
                      />
                      <p style={{ fontSize: "0.8em", color: "#555", marginTop: "2px" }}>
                        {item.notes.length} / Max 250 characters
                      </p>

                  </div>

                  {subjectSchedules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubjectSchedule(index)}
                      style={{ marginTop: "8px" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

            {isRecurring && subjectSchedules.length < 3 && (
              <button
                type="button"
                onClick={addSubjectSchedule}
                style={{ marginBottom: "12px" }}
                disabled={disableCardInputs || !subjectSchedules[subjectSchedules.length - 1]?.yearId}
              >
                + Add Class
              </button>
            )}
            </div>


            {reservations.length > 0 && (
              <div className="mb-2">
                <strong>Already booked (approved):</strong>
                <div
                  style={{
                    maxHeight: "100px",
                    overflowY: "auto",
                    border: "1px solid #ccc",
                    padding: "5px",
                    borderRadius: "4px",
                  }}
                >
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {reservations
                      .slice()
                      .sort((a, b) => {
                        const aMin = a.start ? timeToMinutes(a.start) : 0;
                        const bMin = b.start ? timeToMinutes(b.start) : 0;
                        return aMin - bMin;
                      })
                      .map((i) => (
                        <li
                          key={`${i.start || ""}-${i.end || ""}-${i.reserved_by || ""}`}
                          style={{ padding: "2px 0" }}
                        >
                          {i.start && i.end
                            ? `${format12Hour(i.start)} - ${format12Hour(i.end)} (${i.reserved_by || "N/A"})`
                            : null}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            )}

            <div style={{ marginTop: "15px", display: "flex", justifyContent: "space-between" }}>
              <button type="submit" className="bg-yellow-500 text-white px-3 py-2 rounded">
                Submit
              </button>
              <button type="button" className="btn-cancel" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {showConfirm && (
          <div>
            <h4>Confirm Reservation</h4>
            <p>
              <strong>Room:</strong> {roomName} ({roomNumber})
            </p>
            <p>
              <strong>Date:</strong> {isRecurring ? `${startDate} - ${endDate}` : date}
            </p>

            <h5>Subjects:</h5>
            <ul>
              {subjectSchedules.map((s, i) => {
                const subj = assignmentResponse?.subjects?.find(sub => sub.id === s.subjectId);
                return (
                  <li key={i} style={{ marginBottom: "6px" }}>
                    <strong>Year:</strong> {s.yearId}, <strong>Section:</strong> {s.sectionId},{" "}
                    <strong>Subject:</strong> {subj?.name || s.subjectName} <br/>
                    <strong>Time:</strong> {s.startTime} - {s.endTime} <br/>
                    {isRecurring && <><strong>Days:</strong> {s.days.join(", ")} <br/></>}
                    {s.notes && <><strong>Notes:</strong> {s.notes}</>}
                  </li>
                );
              })}
            </ul>

            <div style={{ marginTop: "12px" }}>
              <button onClick={handleReserve} style={{ marginRight: "8px" }}>
                Confirm
              </button>
              <button onClick={() => setShowConfirm(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReservationModal;