
// src/components/Dashboard/BookingModal.tsx
import type { Room } from "../../types";
import { Button } from "../Button";

interface BookingModalProps {
  selectedRoom: Room;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  setDate: (val: string) => void;
  setStartTime: (val: string) => void;
  setEndTime: (val: string) => void;
  setNotes: (val: string) => void;
  submitBooking: () => void;
  closeBookingModal: () => void;
}

export default function BookingModal({
  selectedRoom,
  date,
  startTime,
  endTime,
  notes,
  setDate,
  setStartTime,
  setEndTime,
  setNotes,
  submitBooking,
  closeBookingModal,
}: BookingModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="flex items-center justify-center ">Book Room: {selectedRoom.room_name}</h3>
        <label>Date:</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <label>Start Time:</label>
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        <label>End Time:</label>
        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        <label>Notes (optional):</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15px" }}>
          <Button variant="primary" onClick={submitBooking}>Confirm Booking</Button>
          <Button variant="secondary" onClick={closeBookingModal}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
