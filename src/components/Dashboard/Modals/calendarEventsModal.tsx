// src/components/Dashboard/CalendarEventsModal.tsx
import { formatToPhilippineDate } from "../../../../server/utils/dateUtils";
import type { Room } from "../../../types.tsx";
import "../../../styles/modal.css";
import "../../../styles/dashboard.css";

interface CalendarEventsModalProps {
  booking: Room;
  onClose: () => void;
  formatTimePH: (start: string, end: string, dateStr?: string) => string;
  userRole: "admin" | "teacher" | "user";
  activeTab: string; // "pending" | "approved" | "rejected"
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onCancel?: (id: number) => void;
  onViewReason?: (id: number) => void;
  onEdit?: (booking: Room) => void; // opens EditBookingModal
  refreshViews?: () => void; // refresh calendar/table if needed
}

export default function CalendarEventsModal({
  booking,
  onClose,
  formatTimePH,
  userRole,
  activeTab,
  onEdit,
  onApprove,
  onReject,
  onCancel,
  onViewReason,
  refreshViews,
}: CalendarEventsModalProps) {
  // --- Handler: Approve ---
  const handleApprove = () => {
    if (onApprove) {
      onApprove(booking.id);
      if (refreshViews) refreshViews();
    }
    onClose();
  };

  // --- Handler: Reject ---
  const handleReject = () => {
    if (onReject) {
      onReject(booking.id);
      if (refreshViews) refreshViews();
    }
    onClose();
  };

  // --- Handler: Cancel ---
  const handleCancel = () => {
    if (onCancel) {
      onCancel(booking.id);
      if (refreshViews) refreshViews();
    }
    onClose();
  };

  // --- Handler: Edit ---
  const handleEdit = () => {
    if (onEdit) {
      onEdit(booking); // opens EditBookingModal
    }
    onClose(); // only close modal, refresh happens after successful edit
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h4 className="flex items-center justify-center">Reservation Details</h4>

        {/* Room details */}
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

        {/* Reservation info */}
        <p><strong>Reserved By:</strong> {booking.reserved_by}</p>
        <p><strong>Status:</strong> {booking.status}</p>
        <p><strong>Date:</strong> {formatToPhilippineDate(booking.date_reserved)}</p>
        <p>
          <strong>Time:</strong> {formatTimePH(booking.reservation_start, booking.reservation_end, booking.date_reserved)}
        </p>

        {booking.notes && <p><strong>Notes:</strong> {booking.notes}</p>}
        {booking.reject_reason && <p><strong>Reason:</strong> {booking.reject_reason}</p>}

        {/* --- ACTION BUTTONS --- */}
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
          {/* Admin Buttons for Pending */}
          {userRole === "admin" && activeTab === "pending" && (
            <>
              <button className="btn btn-success btn-sm" onClick={handleApprove}>
                Approve
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleReject}>
                Reject
              </button>
            </>
          )}

          {/* Teacher Buttons for Pending */}
          {userRole === "teacher" && activeTab === "pending" && (
            <>
              <button className="btn btn-success btn-sm" onClick={handleEdit}>
                Edit
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleCancel}>
                Cancel
              </button>
            </>
          )}

          {/* Cancel for Approved */}
          {activeTab === "approved" && (
            <button className="btn btn-warning btn-sm" onClick={handleCancel}>
              Cancel Reservation
            </button>
          )}

          {/* View Reason for Rejected */}
          {activeTab === "rejected" && (
            <button
              className="btn btn-info btn-sm"
              onClick={() => onViewReason && onViewReason(booking.id)}
            >
              View Reason
            </button>
          )}

          {/* Always show Close */}
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
