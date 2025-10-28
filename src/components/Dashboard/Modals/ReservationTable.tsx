// src/components/Dashboard/ReservationTable.tsx
import { useState, useRef, useEffect } from "react";
import { formatToPhilippineDate } from "../../../../server/utils/dateUtils";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import bootstrap5Plugin from "@fullcalendar/bootstrap5";
import type { Room } from "../../../types.tsx";
import EditBookingModal from "./EditBookingModal";
import "../../../styles/modal.css";
import "../../../styles/dashboard.css";
import CancelReasonModal from "./CancelReasonModal";
import CalendarEventsModal from "../Modals/calendarEventsModal";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { toast, ToastContainer } from "react-toastify";

dayjs.extend(utc);
dayjs.extend(timezone);

interface ReservationTableProps {
  reservations: Room[];
  userRole: number;
  deleteReservation?: (id: number) => void;
  editBooking?: (booking: Room) => void;
  approveBooking?: (id: number) => void;
  rejectBooking?: (id: number) => void;
  formatTime: (start: string, end: string, dateStr?: string) => string;
  isForApproval?: boolean;
  isMyBookings?: boolean;
  refreshMyBookings: () => void;
  openCalendar?: (booking: Room) => void;
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
  openCalendar,
}: ReservationTableProps) {
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [editingBooking, setEditingBooking] = useState<Room | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Room | null>(null);
  const [cancelReasonModal, setCancelReasonModal] = useState<{ id: number | null } | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
// Sorting state
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
      key: "",
      direction: "asc",
    });

const handleSort = (key: string) => {
  setSortConfig((prev) => {
    if (prev.key === key) {
      return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
    } else {
      return { key, direction: "asc" };
    }
  });
};


  
  // ----------------------------
  // Cancel logic
  const openCancelModal = (id: number) => setCancelReasonModal({ id });


  const handleCancelWithReason = async (bookingId: number, reason: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/room_bookings/cancel/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reject_reason: reason }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return alert(err.message || "Failed to cancel reservation.");
      }
      toast.success("Reservation cancelled successfully!");
      setCancelReasonModal(null);
      refreshMyBookings(); // refresh table & calendar immediately
    } catch (err) {
      console.error(err);
      alert("Error during cancellation.");
    }
  };

console.log("current user role : ", userRole)
console.log("currentUserId:", currentUserId)

const visibleReservations = (reservations || []).filter((b) => {
  if (isMyBookings) {
    if (userRole === 1) return true; // admin sees everything
    if (userRole === 3 && currentUserId) return b.user_id === currentUserId;
  }
  return true;
});

//Filter reservations depending on role
const sortedReservations = [...visibleReservations].sort((a, b) => {
  const { key, direction } = sortConfig;
  if (!key) return 0;

  const valA = (a as any)[key];
  const valB = (b as any)[key];

  if (valA < valB) return direction === "asc" ? -1 : 1;
  if (valA > valB) return direction === "asc" ? 1 : -1;
  return 0;
});


  // ----------------------------
  // Calendar events mapping
  const events = visibleReservations
  .map((b) => {
      try {
        const dateUTC = dayjs.utc(b.date_reserved);
        const datePH = dateUTC.tz("Asia/Manila");
        const startTime = b.reservation_start.length === 5 ? `${b.reservation_start}:00` : b.reservation_start;
        const endTime = b.reservation_end.length === 5 ? `${b.reservation_end}:00` : b.reservation_end;
        const startPH = dayjs.tz(`${datePH.format("YYYY-MM-DD")}T${startTime}`, "Asia/Manila");
        const endPH = dayjs.tz(`${datePH.format("YYYY-MM-DD")}T${endTime}`, "Asia/Manila");
        return {
          id: String(b.id),
          title: `${startTime}-${endTime}`,
          start: startPH.toDate(),
          end: endPH.toDate(),
          backgroundColor: "#007bff",
          borderColor: "#007bff",
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  // ----------------------------
  const isCancelable = (booking: Room) => {
    if (userRole === 1) return true;
    if (userRole === 3) {
      const nowPH = dayjs().tz("Asia/Manila");
      const dateUTC = dayjs.utc(booking.date_reserved);
      const datePH = dateUTC.tz("Asia/Manila");
      const startTime = booking.reservation_start.length === 5 ? `${booking.reservation_start}:00` : booking.reservation_start;
      const combinedPH = dayjs.tz(`${datePH.format("YYYY-MM-DD")}T${startTime}`, "Asia/Manila");
      if (!combinedPH.isValid()) return false;
      
  //    console.log("combinedPH.diff >= 30", combinedPH.diff(nowPH, "minute") >= 30)
      return combinedPH.diff(nowPH, "minute") >= 30;
    }
    return false;
  };

  const handleAction = async (action: string, booking: Room) => {
  try {
    switch (action) {
      case "edit":
        if (editBooking) editBooking(booking);
        break;

      case "approve":
        if (approveBooking) await approveBooking(booking.id);
        break;

      case "reject":
        if (rejectBooking) await rejectBooking(booking.id);
        break;

      case "cancel":
        if (isCancelable(booking)) {
          if (isMyBookings) openCancelModal(booking.id); // ✅ Only here
        }
        break;

      case "delete":
        if (deleteReservation && isCancelable(booking)) {
          const confirmed = window.confirm(
            "Are you sure you want to cancel this reservation?"
          );
          if (confirmed) await deleteReservation(booking.id);
        }
        break;

      default:
        console.warn("Unhandled action:", action);
        break;
    }
  } catch (err) {
    console.error("Error in handleAction:", err);
  } finally {
    refreshMyBookings();
  }
};


  const activeTab = isForApproval ? "pending" : isMyBookings ? "approved" : "rejected";

  

              // ----------------------------
              return (
                <div>
                  <div className="flex justify-between items-center">
                  <h2>
              {isMyBookings
                ? userRole === 1 || userRole === 2
                  ? "All Bookings"
                  : "My Bookings"
                : isForApproval
                ? userRole === 3
                  ? "My Pending Reservations"
                  : "All Pending Reservations"
                : "Reservations"}
            </h2>


                    <button className="btn btn-outline-primary btn-sm" onClick={() => setViewMode(viewMode === "table" ? "calendar" : "table")}>
                      {viewMode === "table" ? "📅 Calendar View" : "📋 Table View"}
                    </button>
                  </div>
            <div style={{ overflowX: "auto", marginTop: "10px", maxHeight: "500px" }}>
                  {/* ---------- TABLE VIEW ---------- */}
                  {viewMode === "table" && (
                    <>
                      {(!reservations || reservations.length === 0) ? (
              <p>No reservations.</p>
            ) : (
              
              <table
                id="my-bookings-table"
                className="dashboard-table"
                style={{ width: "100%", marginTop: "10px", minWidth: "1200px" }}
              >
              <thead>
                <tr>
                  {[
                    { key: "room_number", label: "Room #" },
                    { key: "room_name", label: "Name" },
                    { key: "room_description", label: "Description" },
                    { key: "building_name", label: "Building" },
                    { key: "floor_number", label: "Floor" },
                    { key: "date_reserved", label: "Date Reserved" },
                    { key: "reservation_start", label: "Time" },
                    { key: "notes", label: "Notes" },
                  ].map(({ key, label }) => (
                    <th key={key} style={{ whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>{label}</span>
                        <div style={{ display: "flex", flexDirection: "column", cursor: "pointer", lineHeight: "0.7" }}>
                          <span
                            style={{
                              fontSize: "10px",
                              opacity: sortConfig.key === key && sortConfig.direction === "asc" ? 1 : 0.3,
                            }}
                            onClick={() => handleSort(key)}
                          >
                            ▲
                          </span>
                          <span
                            style={{
                              fontSize: "10px",
                              opacity: sortConfig.key === key && sortConfig.direction === "desc" ? 1 : 0.3,
                            }}
                            onClick={() => handleSort(key)}
                          >
                            ▼
                          </span>
                        </div>
                      </div>
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>


              <tbody>
                {sortedReservations.map((booking) => (
                  <tr key={booking.id} className={selectedRowId === booking.id ? "highlighted" : ""} onClick={() => setSelectedRowId(booking.id)}>
                    <td>{booking.room_number}</td>
                    <td>{booking.room_name}</td>
                    <td>
                      <strong>{booking.room_description || "No description"}</strong>
                      <br />
                      <span style={{ fontSize: "0.9em", color: selectedRowId === booking.id ? "#fff" : "#000" }}>
                        {booking.chairs ? `${booking.chairs} Chair${booking.chairs > 1 ? "s" : ""}` : "No Chairs"},
                        TV: {booking.has_tv ? "Yes" : "No"} | Tables: {booking.has_table ? "Yes" : "No"} | Projector: {booking.has_projector ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>{booking.building_name}</td>
                    <td>{booking.floor_number}</td>
                    <td>{booking.date_reserved ? formatToPhilippineDate(booking.date_reserved) : "—"}</td>
                    <td>{booking.reservation_start && booking.reservation_end ? `${booking.reservation_start}-${booking.reservation_end}` : "—"}</td>
                    <td>{booking.notes || "—"}</td>
                    <td>
                     {isForApproval ? (
                          // approval actions stay same
                          <>
                            {userRole === 1 || userRole === 2 ? (
                              <select
                                className="border rounded px-2 py-1"
                                onChange={async (e) => {
                                  const action = e.target.value;
                                  if (!action) return;
                                  await handleAction(action, booking);
                                  e.target.value = "";
                                }}
                                defaultValue=""
                              >
                                <option value="">---select action---</option>
                                <option value="approve">Approve</option>
                                <option value="reject">Reject</option>
                              </select>
                            ) : userRole === 3 ? (
                              <select
                                className="border rounded px-2 py-1"
                                onChange={async (e) => {
                                  const action = e.target.value;
                                  if (!action) return;
                                  await handleAction(action, booking);
                                  e.target.value = "";
                                }}
                                defaultValue=""
                              >
                                <option value="">---select action---</option>
                                <option value="edit">Edit</option>
                                <option
                                  value="delete"
                                  disabled={!isCancelable(booking)}
                                  title={
                                    isCancelable(booking)
                                      ? "Cancel this booking"
                                      : "You can only cancel at least 30 minutes before start time."
                                  }
                                >
                                  {isCancelable(booking) ? "Cancel" : "Cancel (Disabled)"}
                                </option>
                              </select>
                            ) : (
                              <span>—</span>
                            )}
                          </>
                        ) : isMyBookings ? (
                          userRole === 1 || userRole === 2 ? (
                            <span>—</span> // ✅ Admin sees no actions in “All Bookings”
                          ) : (
                            <button
                              className="btn btn-danger btn-sm"
                              disabled={!isCancelable(booking)}
                              title={
                                isCancelable(booking)
                                  ? "Cancel this booking"
                                  : "You can only cancel at least 30 minutes before start time."
                              }
                              onClick={async () => await handleAction("cancel", booking)}
                            >
                              Cancel
                            </button>
                          )
                        ) : (
                          <span>—</span>
                        )}

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          
          )}
        </>
        
      )}
      </div>

      {/* ---------- CALENDAR VIEW ---------- */}
      {viewMode === "calendar" && (
        <div style={{ marginTop: "20px" }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, bootstrap5Plugin]}
            themeSystem="bootstrap5"
            initialView="dayGridMonth"
            ref={calendarRef}
            height="auto"
            eventDidMount={(info) => {
                info.el.style.cursor = "pointer";
              }}
            events={events}
            headerToolbar={{
              right: "prev,next today",
              center: "title",
              left: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
           eventClick={(info) => {
              info.jsEvent.preventDefault(); // Prevent FullCalendar from triggering navigation
              info.jsEvent.stopPropagation(); // Prevent bubbling issues

              const bookingId = Number(info.event.id);
              const booking = reservations.find((b) => b.id === bookingId);
              
              if (booking) {
                // Add a small delay to ensure React state stabilizes before opening modal
                setTimeout(() => {
                  setSelectedBooking(booking);
                }, 100);
              }
            }}

          />
        </div>
      )}

      {/* Cancel modal */}
      {cancelReasonModal && cancelReasonModal.id && (
        <CancelReasonModal
          bookingId={cancelReasonModal.id}
          onClose={() => setCancelReasonModal(null)}
          onCancelConfirmed={handleCancelWithReason}
        />
      )}



      {/* Calendar event modal */}
      {selectedBooking && (
        <CalendarEventsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          formatTimePH={(s, e) => `${s} - ${e}`}
          userRole={userRole === 1 || userRole === 2 ? "admin" : "teacher"}
          activeTab={activeTab}
         onApprove={() => handleAction("approve", selectedBooking)}
          onReject={() => handleAction("reject", selectedBooking)}
          onCancel={() => handleAction("cancel", selectedBooking)}
          onEdit={() => handleAction("edit", selectedBooking)}
          onDelete={() => handleAction("delete", selectedBooking)}
        />
      )}


      {/* Edit booking modal */}
      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onUpdateSuccess={() => {
            setEditingBooking(null);
            refreshMyBookings(); // refresh table & calendar automatically
          }}
        />
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
