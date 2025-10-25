import React from "react";
import { formatToPhilippineDate } from "../../../../server/utils/dateUtils";
import type { Room } from "../../../types.tsx";

interface CalendarEventsModalProps {
  booking: Room;
  onClose: () => void;
  formatTimePH: (start: string, end: string, dateStr: string) => string;
}

export default function CalendarEventsModal({ booking, onClose, formatTimePH }: CalendarEventsModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h4  className="flex items-center justify-center">Reservation Details</h4>
        <p><strong>Room Number :</strong> {booking.room_number}</p>
        <p><strong>Room Name :</strong> {booking.room_name}</p>
        <p><strong>Building :</strong> {booking.building_name}</p>
        <p><strong>Floor :</strong> {booking.floor_number}</p>
        <p><strong>Room Description :</strong> {booking.room_description}
            <span style={{ fontSize: "0.9em", color: "#000" }}>
                 {booking.chairs ? `${booking.chairs} Chair${booking.chairs > 1 ? "s" : ""}` : "No Chairs"},
                  TV: {booking.has_tv ? "Yes" : "No"} |{" "}
                  Tables: {booking.has_table ? "Yes" : "No"} |{" "}
                  Projector: {booking.has_projector ? "Yes" : "No"}
            </span>
        </p>
        <p><strong>Reserved by :</strong> {booking.reserved_by}</p>
        <p><strong>Status :</strong> {booking.status}</p>
        <p><strong>Date :</strong> {formatToPhilippineDate(booking.date_reserved)}</p>
        <p><strong>Time :</strong> {formatTimePH(booking.reservation_start, booking.reservation_end, booking.date_reserved)}</p>
        {booking.notes && <p><strong>Notes:</strong> {booking.notes}</p>}
        {booking.reject_reason && <p><strong>Cancel Reason:</strong> {booking.reject_reason}</p>}

        <button className="btn btn-secondary btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
