/* eslint-disable react-hooks/exhaustive-deps */
 
/* eslint-disable @typescript-eslint/no-unused-expressions */
 
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useRef, useMemo } from "react";
// @ts-ignore
import { formatToPhilippineDate } from '../../../../server/utils/dateUtils';
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import bootstrap5Plugin from "@fullcalendar/bootstrap5";
import type { Room } from "../../../types.tsx";
import EditBookingModal from "./EditBookingModal";
import CalendarEventsModal from "../../Dashboard/Modals/calendarEventsModal.tsx";
import CancelReasonModal from "./CancelReasonModal";
import ActionMenu from "../../../components/ActionMenu.tsx";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { toast, ToastContainer } from "react-toastify";
import "../../../styles/modal.css";
import "../../../styles/dashboard.css";
import { format12Hour } from "../../../utils/timeUtils.ts";
import { useEffect } from "react";
import React from "react";

dayjs.extend(utc);
dayjs.extend(timezone);

interface ReservationTableProps {
  reservations: Room[];
  userRole: number;
  deleteReservation?: (id: number) => void;
  editBooking?: (booking: Room) => void;
  approveBooking?: (id: number) => void;
  rejectBooking?: (id: number) => void;
  formatTime: (start: string, end: string, dateStr: string) => string;
  isForApproval?: boolean;
  isMyBookings?: boolean;
  refreshMyBookings: () => void;
  currentUserId: number | null;
}

export default function ReservationTable({
  reservations,
  userRole,
  deleteReservation,
  editBooking,
  approveBooking,
  rejectBooking,
  isForApproval,
  isMyBookings,
  currentUserId,
  refreshMyBookings,
}: ReservationTableProps) {
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [editingBooking, setEditingBooking] = useState<Room | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Room | null>(null);
  const [cancelReasonModal, setCancelReasonModal] = useState<{ id: number | null } | null>(null);
  //const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  

  // --------------------- Filters & Search ---------------------
  const [buildingFilter, setBuildingFilter] = useState("");
  const [floorFilter, setFloorFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchBy, setSearchBy] = useState<"room_number" | "room_name" | "subject" | "reserved_by">("room_name");
  const [conflictFilter, setConflictFilter] = useState< "safe" | "conflict">("safe");
  const [groupBy, setGroupBy] = useState<"date" | "room_number" | "floor" | "building" | "teacher">("date");




  const conflictDataset = useMemo(() => {
  if (userRole === 3 && currentUserId) {
    return reservations.filter(r => r.user_id === currentUserId);
  }

  return reservations;
}, [reservations, userRole, currentUserId]);




  // Dynamically generate buildings and floors from current reservations
  const buildingOptions = useMemo(
    () => Array.from(new Set(reservations.map((r) => r.building_name).filter(Boolean))),
    [reservations]
  );

  const floorOptions = useMemo(
    () => Array.from(
      new Set(
        reservations
          .filter((r) => !buildingFilter || r.building_name === buildingFilter)
          .map((r) => r.floor_number)
          .filter((f) => f != null)
      )
    ),
    [reservations, buildingFilter]
  );


// Unified conflict checker
const checkConflict = (
  booking: Room,
  dataset: Room[]
): boolean => {
  const normalizeTime = (t?: string) =>
    t?.length === 5 ? `${t}:00` : t || "00:00:00";

  return dataset.some((other) => {
    if (other.id === booking.id) return false;

    if (other.date_reserved !== booking.date_reserved) return false;
console.log("other.date_reserved : ", other.date_reserved)
console.log("booking.date_reserved : ", booking.date_reserved)

    if (other.room_id !== booking.room_id) return false;

const dateA = dayjs.utc(booking.date_reserved).format("YYYY-MM-DD");
const dateB = dayjs.utc(other.date_reserved).format("YYYY-MM-DD");

const startA = dayjs(`${dateA}T${normalizeTime(booking.reservation_start)}`);
const endA   = dayjs(`${dateA}T${normalizeTime(booking.reservation_end)}`);
const startB = dayjs(`${dateB}T${normalizeTime(other.reservation_start)}`);
const endB   = dayjs(`${dateB}T${normalizeTime(other.reservation_end)}`);


console.log("Checking conflict for:", booking.id, {
  room: booking.room_id,
  date: booking.date_reserved,
  start: booking.reservation_start,
  end: booking.reservation_end,
});

console.log("Dataset length:", dataset.length);
    return startA.isBefore(endB) && startB.isBefore(endA);
  });
};




  // Filtered reservations
const filteredReservations = useMemo(() => {
  return reservations.filter((r) => {
    if (buildingFilter && r.building_name !== buildingFilter) return false;
    if (floorFilter && String(r.floor_number) !== floorFilter) return false;

    // Apply conflict filter if for approval
    if  (isForApproval && (userRole === 1 || userRole === 2 || userRole === 3)) {
      const conflict = checkConflict(r, conflictDataset);

      if (conflictFilter === "safe" && conflict) return false;
      if (conflictFilter === "conflict" && !conflict) return false;
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      switch (searchBy) {
        case "room_number":
        case "room_name":
          if (!r.room_name?.toLowerCase().includes(q)) return false;
          break;
        case "subject":
          if (!r.subject?.toLowerCase().includes(q)) return false;
          break;
        case "reserved_by":
          if (!r.notes?.toLowerCase().includes(q)) return false;
          break;
      }
    }

    if (isMyBookings && userRole === 3 && currentUserId) {
      return r.user_id === currentUserId;
    }

    return true;
  });
}, [reservations, buildingFilter, floorFilter, searchQuery, searchBy, isMyBookings, userRole, currentUserId, isForApproval, conflictFilter]);






const getGroupKey = (b: Room) => {
  switch (groupBy) {
    case "date":
      return b.date_reserved;
    case "room_number":
      return b.room_number;
    case "floor":
      return b.floor_number;
    case "building":
      return b.building_name;
    case "teacher":
      return b.reserved_by;
    default:
      return b.date_reserved;
  }
};



const groupedReservations = useMemo(() => {
  const groups: Record<string, Room[]> = {};

  filteredReservations.forEach((b) => {
    const isConflict = checkConflict(b, conflictDataset);

    if (conflictFilter === "safe" && isConflict) return;
    if (conflictFilter === "conflict" && !isConflict) return;

    const key = getGroupKey(b) || "Unknown";

    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  });

  return Object.entries(groups).map(([key, value]) => ({
    key,
    items: value,
  }));
}, [
  filteredReservations,
  conflictFilter,
  groupBy,
  conflictDataset
]);


  const events = filteredReservations.map(b => {
    try {
      const dateUTC = dayjs.utc(b.date_reserved);
      const datePH = dateUTC.tz("Asia/Manila");
      const startTime = b.reservation_start?.length === 5 ? `${b.reservation_start}:00` : b.reservation_start;
      const endTime = b.reservation_end?.length === 5 ? `${b.reservation_end}:00` : b.reservation_end;
      return {
        id: String(b.id),
        title: `${b.room_name} – ${b.building_name}`,
        start: dayjs.tz(`${datePH.format("YYYY-MM-DD")}T${startTime}`, "Asia/Manila").toDate(),
        end: dayjs.tz(`${datePH.format("YYYY-MM-DD")}T${endTime}`, "Asia/Manila").toDate(),
        backgroundColor: "#007bff",
        borderColor: "#007bff",
      };
    } catch { return null; }
  }).filter(e => e !== null);


  const isCancelable = (booking: Room) => {
    if (userRole === 1) return true;
    if (userRole === 3) {
      const nowPH = dayjs().tz("Asia/Manila");
      const datePH = dayjs.utc(booking.date_reserved).tz("Asia/Manila");
      const startTime = booking.reservation_start?.length === 5 ? `${booking.reservation_start}:00` : booking.reservation_start;
      const combinedPH = dayjs.tz(`${datePH.format("YYYY-MM-DD")}T${startTime}`, "Asia/Manila");
      return combinedPH.isValid() && combinedPH.diff(nowPH, "minute") >= 30;
    }
    return false;
  };

  const handleAction = async (action: string, booking: Room) => {
    try {
      switch (action) {
        case "edit": editBooking?.(booking); break;
        case "approve": approveBooking && await approveBooking(booking.id); break;
        case "reject": rejectBooking && await rejectBooking(booking.id); break;
        case "cancel": isCancelable(booking) && isMyBookings && setCancelReasonModal({ id: booking.id }); break;
        case "delete":
          if (deleteReservation && isCancelable(booking) && window.confirm("Are you sure you want to cancel this reservation?")) {
            await deleteReservation(booking.id);
          }
          break;
      }
    } catch (err) { console.error(err); }
    finally { refreshMyBookings(); }
  };

  const getAvailableActions = (booking: Room) => {
    const actions: { key: "approve" | "reject" | "edit" | "delete" | "cancel"; onClick: () => void; disabled?: boolean; title?: string }[] = [];
    if (isForApproval) {
      if (userRole === 1 || userRole === 2) {
        actions.push({ key: "approve", onClick: () => handleAction("approve", booking) });
        actions.push({ key: "reject", onClick: () => handleAction("reject", booking) });
      }
      if (userRole === 3) {
        actions.push({ key: "edit", onClick: () => handleAction("edit", booking) });
        actions.push({ key: "delete", onClick: () => handleAction("delete", booking), disabled: !isCancelable(booking), title: "Cancel booking (30 min rule)" });
      }
    }
    if (isMyBookings && userRole === 3) {
      actions.push({ key: "cancel", onClick: () => handleAction("cancel", booking), disabled: !isCancelable(booking), title: "Cancel booking (30 min rule)" });
    }
    return actions;
  };


  const handleBulkApprove = async () => {
  try {
    const ids = safePendingBookings.map(b => b.id);

    const res = await fetch("/api/room_bookings/approve-bulk", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Bulk approval failed");
    }

    toast.success("All safe reservations approved successfully!");
    refreshMyBookings();
  } catch (err: any) {
    toast.error(err.message || "Bulk approval failed");
  }
};


  const handleCancelWithReason = async (bookingId: number, reason: string) => {
    try {
      const res = await fetch(`api/room_bookings/cancel/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reject_reason: reason })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return alert(err.message || "Failed to cancel reservation.");
      }
      toast.success("Reservation cancelled successfully!");
      setCancelReasonModal(null);
      refreshMyBookings();
    } catch (err) { console.error(err); alert("Error during cancellation."); }
  };

  const dateToTime24 = (date?: Date) => {
    if (!date) return "";
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  };


  
const hasReservations = reservations.length > 0;



  // Only safe (no conflict) bookings
const safePendingBookings = useMemo(() => {
  if (!isForApproval) return [];
  return filteredReservations.filter(b => String(b.status) === "pending" && !checkConflict(b, conflictDataset));
}, [filteredReservations, reservations, isForApproval, userRole, currentUserId]);

const canBulkApprove =
  isForApproval &&
  (userRole === 1 || userRole === 2) &&
  safePendingBookings.length > 0;

// console.log( filteredReservations.map(r => ({ id: r.id, status: r.status, conflict: r.has_conflict })) );


const hasPendingReservations = useMemo(() => {
  return reservations.some(r => String(r.status) === "pending");
}, [reservations]);

const pendingReservations = useMemo(() => {
  return reservations.filter(r => String(r.status) === "pending");
}, [reservations]);

// 👇 Role-aware pending set
const roleAwarePendingReservations = useMemo(() => {
  if (userRole === 3 && currentUserId) {
    // Teacher → only their own pending reservations
    return pendingReservations.filter(r => r.user_id === currentUserId);
  }

  // Admin / Dept Head → all pending
  return pendingReservations;
}, [pendingReservations, userRole, currentUserId]);




const hasSafeBookings = roleAwarePendingReservations.some(r => {
  if (userRole === 3) {
    return !checkConflict(r, conflictDataset);
  }
  return !r.has_conflict;
});

const hasConflictBookings = roleAwarePendingReservations.some(r => {
  if (userRole === 3) {
    return checkConflict(r, conflictDataset);
  }
  return r.has_conflict;
});




useEffect(() => {
  if (!hasPendingReservations) return;

  // If safe doesn't exist but conflict does → switch to conflict
  if (!hasSafeBookings && hasConflictBookings) {
    setConflictFilter("conflict");
  }

  // If conflict doesn't exist but safe does → switch to safe
  if (!hasConflictBookings && hasSafeBookings) {
    setConflictFilter("safe");
  }
}, [hasSafeBookings, hasConflictBookings, hasPendingReservations]);


// Group safe (no conflict) reservations by same date + same room




  // --------------------- Render ---------------------
  return (
    <div>
          {/* Header */}
            <div className="flex justify-between items-center mb-3">
              <h2>{isMyBookings ? (userRole <= 2 ? "All Bookings" : "My Bookings") : (isForApproval ? (userRole === 3 ? "My Pending Reservations1" : "All Pending Reservations") : "Reservations")}</h2>
              <button className="btn btn-outline-primary btn-sm" onClick={() => setViewMode(viewMode === "table" ? "calendar" : "table")}>
                {viewMode === "table" ? "📅 Calendar View" : "📋 Table View"}
              </button>
            </div>
                  {/* Filters & Search */}
                  
                    {reservations.length > 0 && (
                    <>
                      <div className="mb-4 text-black flex flex-wrap gap-4 items-end">
                        {/* Building */}
                        <div style={{ minWidth: 180 }}>
                          <label className="block mb-1 font-medium">Building:</label>
                          <select
                            className="border rounded bg-white w-full h-10 px-2"
                            value={buildingFilter}
                            onChange={(e) => {
                              setBuildingFilter(e.target.value);
                              setFloorFilter("");
                            }}
                          >
                            <option value="">-- All Buildings --</option>
                            {buildingOptions.map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>

                        {/* Floor */}
                        <div style={{ minWidth: 120 }}>
                          <label className="block mb-1 font-medium">Floor:</label>
                          <select
                            className="border rounded bg-white w-full h-10 px-2"
                            value={floorFilter}
                            onChange={(e) => setFloorFilter(e.target.value)}
                            disabled={!buildingFilter}
                          >
                            <option value="">-- All Floors --</option>
                            {floorOptions.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>

                        {/* Search By */}
                        <div style={{ minWidth: 180 }}>
                          <label className="block mb-1 font-medium">Search by:</label>
                          <select
                            className="border rounded bg-white w-full h-10 px-2"
                            value={searchBy}
                            onChange={(e) => setSearchBy(e.target.value as any)}
                          >
                            <option value="room_number">Room number</option>
                            <option value="floor">Floor</option>
                            <option value="subject">Subject</option>
                            {!isForApproval && (
                              <option value="reserved_by">Teacher Name</option>
                            )}
                          </select>
                        </div>

                        {/* Search */}
                        <div style={{ minWidth: 260, flexGrow: 1 }}>
                          <label className="block mb-1 font-medium">Search:</label>
                          <input
                            type="text"
                            className="border rounded bg-white w-full h-10 px-2"
                            placeholder="Type to search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>

                        <button
                          className="btn btn-primary mt-2"
                          onClick={() => {
                            setBuildingFilter("");
                            setFloorFilter("");
                            setSearchQuery("");
                            setSearchBy("room_name");
                          }}
                        >
                          Clear
                        </button>
                      </div>

                        {/* Conflict Filter */}
                          {isForApproval &&
                              hasPendingReservations &&
                              (hasSafeBookings || hasConflictBookings) && (
                              <div>
                                <label className="block mb-1 font-medium">Filter by:</label>
                                <select
                                  value={conflictFilter}
                                  onChange={(e) =>
                                    setConflictFilter(e.target.value as "safe" | "conflict")
                                  }
                                >
                                  {hasSafeBookings && (
                                    <option value="safe">No Conflict</option>
                                  )}

                                  {hasConflictBookings && (
                                    <option value="conflict">With Conflict</option>
                                  )}
                                </select>
                              </div>
                          )}


                          {/* Group By */}
                          {(isForApproval || isMyBookings) && conflictFilter !== "conflict" && (
                            <div>
                              <label className="block mb-1 font-medium">Group by:</label>
                              <select
                                className="border rounded bg-white h-10 px-2"
                                value={groupBy}
                                onChange={(e) => setGroupBy(e.target.value as any)}
                              >
                                <option value="date">Date</option>
                                <option value="room_number">Room Number</option>
                                <option value="floor">Floor</option>
                                <option value="building">Building</option>

                                {isMyBookings && (userRole === 1 || userRole === 2) && (
                                  <option value="teacher">Teacher</option>
                                )}
                              </select>
                            </div>
                          )}
                      </>
                    )}
        
                    {/* Table View */}
                    {viewMode === "table" && (
                      <div style={{ overflowX: "auto", maxHeight: 500 }}>
                              <>
                              <table className="dashboard-table" style={{ width: "100%", minWidth: 1200, marginTop: 10 }}>
                                <thead>
                                  <tr>
                                      {["Room number","room name","description","building","floor","subject", !isForApproval ? "Teacher" : null,"Reservation Date","Reservation Time","Notes"]
                                      .filter((k): k is string => k !== null)
                                      .map(k => <th key={k}>{k}</th>)}
                                  <th>Actions</th>
                                  </tr>
                                </thead>
                                  <tbody>
                                    {groupedReservations.length === 0 ? (
                                      <tr>
                                        <td
                                          colSpan={isForApproval ? 10 : 11}
                                          style={{
                                            textAlign: "center",
                                            padding: "30px",
                                            fontWeight: 500,
                                            color: "#6c757d"
                                          }}
                                        >
                                          No data found.
                                        </td>
                                      </tr>
                                    ) : (
                                      groupedReservations.map((group, index) => {
                                         conflictFilter === "conflict";

                                        return (
                                          <React.Fragment key={`group-${index}`}>
                                            {/* Group Header */}
                                            <tr
                                                className={
                                                  conflictFilter === "conflict"
                                                    ? "group-header-conflict"
                                                    : "group-header-safe"
                                                }
                                              >
                                               <td colSpan={isForApproval ? 10 : 11}>
                                                    {conflictFilter === "conflict"
                                                      ? "⚠ Conflict Group — "
                                                      : isMyBookings
                                                        ? "✅ Approved Booking — "
                                                        : "✅ No Conflict Group — "}
                                                        
                                                    {groupBy === "date"
                                                      ? formatToPhilippineDate(group.key)
                                                      : group.key}{" "}
                                                      
                                                    ({group.items.length})
                                              </td>
                                              </tr>

                                            {group.items.map((booking) => (
                                              <tr key={booking.id}>
                                                <td>{booking.room_number}</td>
                                                <td>{booking.room_name}</td>
                                                <td>{booking.room_description}</td>
                                                <td>{booking.building_name}</td>
                                                <td>{booking.floor_number}</td>
                                                <td>{booking.subject || "—"}</td>
                                                {!isForApproval && (
                                                  <td>{booking.reserved_by || "—"}</td>
                                                )}
                                                <td>
                                                  {formatToPhilippineDate(booking.date_reserved)}
                                                </td>
                                                <td>
                                                  {format12Hour(booking.reservation_start)} -{" "}
                                                  {format12Hour(booking.reservation_end)}
                                                </td>
                                                <td>{booking.notes || "—"}</td>
                                                <td>
                                                  <ActionMenu
                                                    actions={getAvailableActions(booking)}
                                                  />
                                                </td>
                                              </tr>
                                            ))}
                                          </React.Fragment>
                                        );
                                      })
                                    )}
                                  </tbody>

                              </table>
                                {hasReservations && canBulkApprove && safePendingBookings.length > 0 && (
                                  <div className="mt-3 text-end">
                                    <button
                                      className="btn btn-success"
                                      onClick={handleBulkApprove}
                                    >
                                      ✅ Approve All ({safePendingBookings.length})
                                    </button>
                                  </div>
                        
                            )}
                     
                       </>         
                </div>
              )}
               

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div style={{ marginTop: 20 }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin,timeGridPlugin,interactionPlugin,bootstrap5Plugin]}
            themeSystem="bootstrap5"
            initialView="dayGridMonth"
            height="auto"
            events={events}
            eventDidMount={info => info.el.style.cursor="pointer"}
            slotLabelFormat={{ hour:"numeric", minute:"2-digit", hour12:true }}
            eventTimeFormat={{ hour:"numeric", minute:"2-digit", hour12:true }}
            eventContent={arg => {
              const start24 = dateToTime24(arg.event.start!);
              const end24 = dateToTime24(arg.event.end!);
              return (
                <div>
                  <div style={{ fontSize:"0.8em", fontWeight:600 }}>{format12Hour(start24)} - {format12Hour(end24)}</div>
                  <div>{arg.event.title}</div>
                </div>
              )
            }}
            headerToolbar={{ left:"dayGridMonth,timeGridWeek,timeGridDay", center:"title", right:"prev,next today" }}
            eventClick={info => {
              info.jsEvent.preventDefault();
              info.jsEvent.stopPropagation();
              const booking = reservations.find(b => b.id===Number(info.event.id));
              if(booking) setSelectedBooking(booking);
            }}
            dateClick={info => setSelectedDate(info.dateStr)}
            dayCellClassNames={arg => dayjs(arg.date).format("YYYY-MM-DD")===selectedDate?["selected-day"]:[]}
          />
        </div>
      )}

      {/* Modals */}
      {cancelReasonModal?.id && <CancelReasonModal bookingId={cancelReasonModal.id} onClose={()=>setCancelReasonModal(null)} onCancelConfirmed={handleCancelWithReason}/>}
      {selectedBooking && <CalendarEventsModal booking={selectedBooking} isForApproval={isForApproval} onClose={()=>setSelectedBooking(null)} actions={getAvailableActions(selectedBooking)}/>}
      {editingBooking && <EditBookingModal booking={editingBooking} onClose={()=>setEditingBooking(null)} onUpdateSuccess={()=>{setEditingBooking(null); refreshMyBookings();}} />}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
