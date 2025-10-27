// src/components/Dashboard/ReservationTable
import { useState, useRef } from "react";
import { formatToPhilippineDate } from "../../../../server/utils/dateUtils.ts";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import bootstrap5Plugin from "@fullcalendar/bootstrap5";
import type { Room } from "../../../types.tsx";
import EditBookingModal from "./EditBookingModal.tsx";
import "../../../styles/modal.css";
import CancelReasonModal from "./CancelReasonModal";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import CalendarEventsModal from "../Modals/calendarEventsModal.tsx";
import "../../../styles/modal.css";
import "../../../styles/dashboard.css";
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";

dayjs.extend(utc);
dayjs.extend(timezone);

interface ReservationTableProps {
  reservations: Room[];
  userRole: number;
  cancelReservation?: (id: number) => void;
  editBooking?: (booking: Room) => void;
  approveBooking?: (id: number) => void;
  rejectBooking?: (id: number) => void;
  formatTime: (start: string, end: string, dateStr: string) => string;
  isForApproval?: boolean;
  isMyBookings?: boolean;
  refreshMyBookings: () => void;
}

export default function ReservationTable({
  reservations,
  userRole,
  cancelReservation,
  editBooking,
  approveBooking,
  rejectBooking,
  isForApproval,
  isMyBookings,
  refreshMyBookings,
}: ReservationTableProps) {
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [editingBooking, setEditingBooking] = useState<Room | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Room | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  const [cancelReasonModal, setCancelReasonModal] = useState<{ id: number | null } | null>(null);

  const formatTimePH = (start: string, end: string) => `${start} - ${end}`;


  // ✅ Cancel modal logic
  const openCancelModal = (id: number) => {
    setCancelReasonModal({ id });
  };

  const handleEditOpen = (booking: Room) => {
  setEditingBooking(booking); // Opens EditBookingModal
  setSelectedBooking(null);   // Just in case — ensures calendar modal closes
};


  const handleCancelWithReason = async (bookingId: number, reason: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/room_bookings/cancel/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reject_reason: reason }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Cancel failed:", errorData);
        alert("Failed to cancel reservation. Please try again.");
        return;
      }

      toast.success("Reservation cancelled successfully!");
      setCancelReasonModal(null);
      refreshMyBookings();
    } catch (err) {
      console.error("⚠️ Error during cancel:", err);
      alert("An error occurred while canceling.");
    }
  };

  // -----------------------------
  // Calendar events
  const events = reservations
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
      } catch (err) {
        console.error("⚠️ Failed to parse reservation for calendar:", b, err);
        return null;
      }
    })
    .filter(Boolean);

  // -----------------------------
  const isCancelable = (booking: Room) => {
    if (userRole === 1) return true;
    if (userRole === 3) {
      const nowPH = dayjs().tz("Asia/Manila");
      const dateUTC = dayjs.utc(booking.date_reserved);
      const datePH = dateUTC.tz("Asia/Manila");
      const startTime = booking.reservation_start.length === 5 ? `${booking.reservation_start}:00` : booking.reservation_start;
      const combinedPH = dayjs.tz(`${datePH.format("YYYY-MM-DD")}T${startTime}`, "Asia/Manila");
      if (!combinedPH.isValid()) return false;
      const diffMinutes = combinedPH.diff(nowPH, "minute");
      return diffMinutes >= 30;
    }
    return false;
  };

  // -----------------------------
  const handleAction = (action: string, booking: Room) => {
    if (action === "edit" && editBooking) editBooking(booking);
    if (action === "approve" && approveBooking) approveBooking(booking.id);
    if (action === "reject" && rejectBooking) rejectBooking(booking.id);
    if (action === "delete" && cancelReservation && isCancelable(booking)) {
      const confirmed = window.confirm("Are you sure you want to cancel this reservation?");
      if (confirmed) cancelReservation(booking.id);
    }
  };

  // ✅ Detect current active tab for modal (based on flags)
  const activeTab = isForApproval ? "pending" : isMyBookings ? "approved" : "rejected"; // adjust as needed

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>
          {isMyBookings
            ? "My Schedules"
            : isForApproval
            ? userRole === 3
              ? "My Pending Reservations"
              : userRole === 1 || userRole === 2
              ? "All Pending Reservations"
              : "Reservations"
            : "Reservations"}
        </h2>

        <button
          className="btn btn-outline-primary btn-sm"
          onClick={() => setViewMode(viewMode === "table" ? "calendar" : "table")}
        >
          {viewMode === "table" ? "📅 Calendar View" : "📋 Table View"}
        </button>
      </div>

      {viewMode === "table" && (
        <>
          {reservations.length === 0 ? (
            <p>No reservations.</p>
          ) : (
            <table className="dashboard-table" id="reservations-table">
              <thead>
                <tr>
                  <th>Room #</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Building</th>
                  <th>Floor</th>
                  <th>Date Reserved</th>
                  <th>Time</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((booking) => (
                  <tr
                    key={booking.id}
                    className={selectedRowId === booking.id ? "highlighted" : ""}
                    onClick={() => setSelectedRowId(booking.id)}
                  >
                    <td>{booking.room_number}</td>
                    <td>{booking.room_name}</td>
                    <td className="text-black">
                      <strong className="text-black">
                        {booking.room_description || "No description"}
                      </strong>
                      <br />
                      <span
                        style={{
                          fontSize: "0.9em",
                          color: selectedRowId === booking.id ? "#fff" : "#000",
                        }}
                      >
                        {booking.chairs ? `${booking.chairs} Chair${booking.chairs > 1 ? "s" : ""}` : "No Chairs"},
                        TV: {booking.has_tv ? "Yes" : "No"} | Tables: {booking.has_table ? "Yes" : "No"} |
                        Projector: {booking.has_projector ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>{booking.building_name}</td>
                    <td>{booking.floor_number}</td>
                    <td>{booking.date_reserved ? formatToPhilippineDate(booking.date_reserved) : "—"}</td>
                    <td>
                      {booking.reservation_start && booking.reservation_end
                        ? formatTimePH(booking.reservation_start, booking.reservation_end)
                        : "—"}
                    </td>
                    <td>{booking.notes || "—"}</td>
                    <td>
                      {isForApproval ? (
                        <>
                          {userRole === 1 || userRole === 2 ? (
                            <select
                              className="border rounded px-2 py-1"
                              onChange={(e) => {
                                handleAction(e.target.value, booking);
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
                              onChange={(e) => {
                                handleAction(e.target.value, booking);
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
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={!isCancelable(booking)}
                          title={
                            isCancelable(booking)
                              ? "Cancel this booking"
                              : "You can only cancel at least 30 minutes before start time."
                          }
                          onClick={() => openCancelModal(booking.id)}
                        >
                          Cancel
                        </button>
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

      {viewMode === "calendar" && (
        <div style={{ marginTop: "20px" }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, bootstrap5Plugin]}
            themeSystem="bootstrap5"
            initialView="dayGridMonth"
            ref={calendarRef}
            height="auto"
            events={events}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            eventClick={(info) => {
              const bookingId = Number(info.event.id);
              const booking = reservations.find((b) => b.id === bookingId);
              if (booking) setSelectedBooking(booking);
            }}
          />
        </div>
      )}

      {/* ✅ Cancel Reason Modal */}
      {cancelReasonModal && cancelReasonModal.id !== null && (
        <CancelReasonModal
          bookingId={cancelReasonModal.id}
          onClose={() => setCancelReasonModal(null)}
          onCancelConfirmed={handleCancelWithReason}
        />
      )}

      {/* ✅ Calendar Events Modal */}
      {selectedBooking && (
        <CalendarEventsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          formatTimePH={formatTimePH}
          userRole={
              userRole === 1 || userRole === 2
                ? "admin"
                : userRole === 3
                ? "teacher"
                : "user"
            }
          activeTab={activeTab}
          onApprove={approveBooking}
          onReject={rejectBooking}
          onCancel={openCancelModal}
          onEdit={handleEditOpen} 
          onViewReason={() => alert(selectedBooking.reject_reason || "No reason provided.")}
        />
      )}

      {editingBooking && editBooking && (
        <EditBookingModal
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onUpdateSuccess={() => setEditingBooking(null)}
        />
      )}

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
