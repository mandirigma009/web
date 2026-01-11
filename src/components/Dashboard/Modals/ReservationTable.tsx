/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-expressions */
// src/components/Dashboard/ReservationTable.tsx
import { useState, useRef } from "react";
import { formatToPhilippineDate } from "../../../../server/utils/dateUtils";
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
  formatTime,
}: ReservationTableProps) {
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [editingBooking, setEditingBooking] = useState<Room | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Room | null>(null);
  const [cancelReasonModal, setCancelReasonModal] = useState<{ id: number | null } | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "", direction: "asc" });

  const handleSort = (key: string) => setSortConfig(prev => prev.key === key ? { key, direction: prev.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });

  const activeTab = isForApproval ? "pending" : isMyBookings ? "approved" : "rejected";

  // ----------------------------
  const visibleReservations = (reservations || []).filter(b => {
    if (isMyBookings) {
      if (userRole === 1) return true;
      if (userRole === 3 && currentUserId) return b.user_id === currentUserId;
    }
    return true;
  });

  const sortedReservations = [...visibleReservations].sort((a, b) => {
    const { key, direction } = sortConfig;
    if (!key) return 0;
    const valA = (a as any)[key]; const valB = (b as any)[key];
    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const events = visibleReservations.map(b => {
    try {
      const dateUTC = dayjs.utc(b.date_reserved);
      const datePH = dateUTC.tz("Asia/Manila");
      const startTime = b.reservation_start?.length === 5 ? `${b.reservation_start}:00` : b.reservation_start;
      const endTime = b.reservation_end?.length === 5 ? `${b.reservation_end}:00` : b.reservation_end;
      return {
        id: String(b.id),
        title: `${startTime}-${endTime}`,
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

  // ----------------------------
  const openCancelModal = (id: number) => setCancelReasonModal({ id });
  const handleCancelWithReason = async (bookingId: number, reason: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/room_bookings/cancel/${bookingId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reject_reason: reason })
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); return alert(err.message || "Failed to cancel reservation."); }
      toast.success("Reservation cancelled successfully!");
      setCancelReasonModal(null);
      refreshMyBookings();
    } catch (err) { console.error(err); alert("Error during cancellation."); }
  };

  // ----------------------------
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2>{isMyBookings ? (userRole <= 2 ? "All Bookings" : "My Bookings") : (isForApproval ? (userRole === 3 ? "My Pending Reservations" : "All Pending Reservations") : "Reservations")}</h2>
        <button className="btn btn-outline-primary btn-sm" onClick={() => setViewMode(viewMode === "table" ? "calendar" : "table")}>
          {viewMode === "table" ? "📅 Calendar View" : "📋 Table View"}
        </button>
      </div>

      {/* Table View */}
      {viewMode === "table" && (
        <div style={{ overflowX: "auto", marginTop: "10px", maxHeight: "500px" }}>
          {sortedReservations.length === 0 ? <p>No reservations.</p> :
            <table className="dashboard-table" style={{ width: "100%", marginTop: "10px", minWidth: "1200px" }}>
              <thead>
                <tr>
                  {["room_number", "room_name", "room_description", "building_name", "floor_number", "subject", "date_reserved", "reservation_start", "notes"].map(key => (
                    <th key={key} style={{ whiteSpace: "nowrap" }}>{key}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedReservations.map(booking => (
                  <tr key={booking.id} className={selectedRowId === booking.id ? "highlighted" : ""} onClick={() => setSelectedRowId(booking.id)}>
                    <td>{booking.room_number}</td>
                    <td>{booking.room_name}</td>
                    <td>
                      <strong>{booking.room_description || "No description"}</strong>
                      <br/>
                      <span style={{ fontSize: "0.9em" }}>
                        {booking.chairs ? `${booking.chairs} Chair${booking.chairs > 1 ? "s" : ""}` : "No Chairs"}, TV: {booking.has_tv ? "Yes" : "No"} | Tables: {booking.has_table ? "Yes" : "No"} | Projector: {booking.has_projector ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>{booking.building_name}</td>
                    <td>{booking.floor_number}</td>
                    <td>{booking.subject || "—"}</td>
                    <td>{booking.date_reserved ? formatToPhilippineDate(booking.date_reserved) : "—"}</td>
                    <td>{booking.reservation_start && booking.reservation_end ? `${booking.reservation_start}-${booking.reservation_end}` : "—"}</td>
                    <td>{booking.notes || "—"}</td>
                    <td className="text-center"><ActionMenu actions={getAvailableActions(booking)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </div>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div style={{ marginTop: "20px" }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, bootstrap5Plugin]}
            themeSystem="bootstrap5"
            initialView="dayGridMonth"
            ref={calendarRef}
            height="auto"
            events={events}
            eventDidMount={info => info.el.style.cursor = "pointer"}
            headerToolbar={{ right: "prev,next today", center: "title", left: "dayGridMonth,timeGridWeek,timeGridDay" }}
            eventClick={info => {
              info.jsEvent.preventDefault(); info.jsEvent.stopPropagation();
              const booking = reservations.find(b => b.id === Number(info.event.id));
              if (booking) setSelectedBooking(booking);
            }}
          />
        </div>
      )}

      {/* Modals */}
      {cancelReasonModal?.id && <CancelReasonModal bookingId={cancelReasonModal.id} onClose={() => setCancelReasonModal(null)} onCancelConfirmed={handleCancelWithReason} />}
      {selectedBooking && <CalendarEventsModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} actions={getAvailableActions(selectedBooking)} />}
      {editingBooking && <EditBookingModal booking={editingBooking} onClose={() => setEditingBooking(null)} onUpdateSuccess={() => { setEditingBooking(null); refreshMyBookings(); }} />}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
