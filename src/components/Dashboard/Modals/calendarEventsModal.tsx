/* eslint-disable @typescript-eslint/ban-ts-comment */
// src/components/Dashboard/Modals/CalendarEventsModal.tsx
import "../../../styles/modal.css";
import type { Room } from "../../../types.tsx";
import ActionMenu from "../../../components/ActionMenu.tsx";
// @ts-ignore
import { formatToPhilippineDate } from '../../../../server/utils/dateUtils';
import { format12Hour } from "../../../utils/timeUtils.ts";

interface CalendarEventsModalProps {
  booking: Room;
  onClose: () => void;
  actions: {
    key: "approve" | "reject" | "edit" | "delete" | "cancel";
    onClick: () => void;
    disabled?: boolean;
    title?: string;
  }[];
}

export default function CalendarEventsModal({
  booking,
  onClose,
  actions,
}: CalendarEventsModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Close button in top-right */}
        <button
          onClick={onClose}
          className="btn-cancel"
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "transparent",
            border: "none",
            fontSize: "1.5rem",
            fontWeight: "bold",
            cursor: "pointer",
            color: "red",
          }}
          title="Close"
        >
          ×
        </button>

        <div className="modal-body">
          <h4 className="flex items-center justify-center">Reservation Details</h4>

          <p><strong>Room:</strong> {booking.room_number} - {booking.room_name}</p>
          <p><strong>Building:</strong> {booking.building_name}</p>
          <p><strong>Floor:</strong> {booking.floor_number}</p>
          <p><strong>Max Seats:</strong> {booking.max_capacity}</p>
          <p><strong>Subject:</strong> {booking.subject}</p>
          <p><strong>Status:</strong> {booking.status}</p>
           <p><strong>Date:</strong> {formatToPhilippineDate(booking?.date_reserved)}</p>
          <p>
            <strong>Time:</strong> {format12Hour(booking.reservation_start)} - {format12Hour(booking.reservation_end)} <br/>
            {booking.chairs ? `${booking.chairs} Chair${booking.chairs > 1 ? "s" : ""}` : "No Chairs"}, 
            TV: {booking.has_tv ? "Yes" : "No"} | Tables: {booking.has_table ? "Yes" : "No"} | Projector: {booking.has_projector ? "Yes" : "No"}
          </p>
          {booking.notes && <p><strong>Notes:</strong> {booking.notes}</p>}
          {booking.reject_reason && <p><strong>Reason:</strong> {booking.reject_reason}</p>}
        </div>

        {/* Action buttons */}
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            gap: "0.5rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {actions.length > 0 ? <ActionMenu actions={actions} /> : <span>—</span>}
        </div>
      </div>
    </div>
  );
}
