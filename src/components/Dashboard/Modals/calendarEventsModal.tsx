// src/components/Dashboard/CalendarEventsModal.tsx
import { formatToPhilippineDate } from "../../../../server/utils/dateUtils";
import type { Room } from "../../../types.tsx";
import "../../../styles/modal.css";
import "../../../styles/dashboard.css";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

interface CalendarEventsModalProps {
  booking: Room;
  onClose: () => void;
  formatTimePH: (start: string, end: string, dateStr?: string) => string;
  userRole: "admin" | "teacher" | "user";
  activeTab: string; // "pending" | "approved" | "rejected"
   onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onCancel?: (id: number) => void;
  onEdit?: (booking: Room) => void; // opens EditBookingModal
  refreshViews?: () => void; // refresh calendar/table if needed
  onDelete?: (id: number) => void;
}

export default function CalendarEventsModal({
  booking,
  onClose,
  formatTimePH,
  userRole,
  activeTab,
  onApprove,
  onReject,
  onDelete,
  onCancel,
  onEdit,
}: CalendarEventsModalProps) {
  const isCancelable = (booking: Room) => {
    if (userRole === "admin") return true;
    if (userRole === "teacher") {
      const nowPH = dayjs().tz("Asia/Manila");
      const dateUTC = dayjs.utc(booking.date_reserved);
      const datePH = dateUTC.tz("Asia/Manila");
      const startTime =
        booking.reservation_start.length === 5
          ? `${booking.reservation_start}:00`
          : booking.reservation_start;
      const combinedPH = dayjs.tz(
        `${datePH.format("YYYY-MM-DD")}T${startTime}`,
        "Asia/Manila"
      );
      return combinedPH.diff(nowPH, "minute") >= 30;
    }
    return false;
  };

  return (
    <div className="modal-overlay">
        
      <div className="modal-content" >
        <button
            onClick={onClose}
            className="close-button"
            style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "transparent",
                border: "none",
                fontSize: "1.5rem",
                fontWeight: "bold",
                cursor: "pointer",
                color: "#555",
            }}
            title="Close"
            >
            ×
            </button>
<div
    className="modal-body"
    style={{
      maxHeight: "600px",
      overflowY: "auto",
      marginBottom: "60px", // space for footer
    }}
  >
        <h4 className="flex items-center justify-center">Reservation Details</h4>

        {/* Room & Booking details */}
        <p><strong>Room Number:</strong> {booking.room_number}</p>
        <p><strong>Room Name:</strong> {booking.room_name}</p>
        <p><strong>Building:</strong> {booking.building_name}</p>
        <p><strong>Floor:</strong> {booking.floor_number}</p>
        <p>
          <strong>Description:</strong> {booking.room_description || "No description"}
          <br />
          <span style={{ fontSize: "0.9em", color: "#000" }}>
            {booking.chairs ? `${booking.chairs} Chair${booking.chairs > 1 ? "s" : ""}` : "No Chairs"},{" "}
            TV: {booking.has_tv ? "Yes" : "No"} | Tables: {booking.has_table ? "Yes" : "No"} | Projector: {booking.has_projector ? "Yes" : "No"}
          </span>
        </p>

        <p><strong>Reserved By:</strong> {booking.reserved_by}</p>
        <p><strong>Status:</strong> {booking.status}</p>
        <p><strong>Date:</strong> {formatToPhilippineDate(booking.date_reserved)}</p>
        <p><strong>Time:</strong> {formatTimePH(booking.reservation_start, booking.reservation_end, booking.date_reserved)}</p>

        {booking.notes && <p><strong>Notes:</strong> {booking.notes}</p>}
        {booking.reject_reason && <p><strong>Reason:</strong> {booking.reject_reason}</p>}
</div>
        {/* --- ACTION BUTTONS --- */}
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
          {/* Admin Buttons for Pending */}
          {userRole === "admin" && activeTab === "pending" && (
            <>
              <button className="btn btn-success btn-sm"   onClick={async () => {
                        if (onApprove) await onApprove(booking.id);
                        onClose();
                        }}>Approve</button>
              <button className="btn btn-danger btn-sm" onClick={async () => { if (onReject) await onReject( booking.id);  onClose() }}>Reject</button>
            </>
          )}

          {/* Teacher Buttons for Pending */}
          {userRole === "teacher" && activeTab === "pending" && (
          
 <div
    className="modal-footer"
    style={{
      position: "absolute",
      bottom: "15px",
      left: "0",
      width: "100%",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0 30px", // add side space
      boxSizing: "border-box",
    }}
  >
    {/* Left: Cancel Button */}
    <button
      className="btn btn-outline-danger btn-sm"
      disabled={!isCancelable(booking)}
      title={
        isCancelable(booking)
          ? "Cancel this booking"
          : "You can only cancel at least 30 minutes before start time."
      }
      onClick={async () => {
        if (onDelete) await onDelete(booking.id);
        onClose();
      }}
    >
      Cancel
    </button>

    {/* Right: Edit Button */}
    <button
      className="btn btn-success btn-sm"
      onClick={async () => {
        if (onEdit) await onEdit(booking);
        onClose();
      }}
    >
      Edit
    </button>
  </div>

           
          )}

          {/* Cancel for Approved */}
          {activeTab === "approved" && (
            <button className="btn btn-warning btn-sm" onClick= { async () => { if (onCancel) await onCancel( booking.id);  onClose() }}>Cancel Reservation</button>
          )}

          {/* Always show Close
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
           */}
        </div>
      </div>
    </div>
  );
}
