// src/components/Dashboard/MyBookingsTab.tsx
import  { useEffect, useRef, useState } from "react";
import type { Room } from "../../types";
import "./RoomsTab.css";
import EditBookingModal from "./EditBookingModal";

interface MyBookingsTabProps {
  myBookings: Room[];
  cancelingId: number | null;
  cancelReservation: (id: number) => void;
  formatDate: (dateStr: string) => string;
  formatTime: (start: string, end: string, dateStr: string) => string;
 

}

export default function MyBookingsTab({
  myBookings,
  
  cancelReservation,
  formatDate,
  formatTime,
}: MyBookingsTabProps) {
  const [editingBooking, setEditingBooking] = useState<Room | null>(null);
  const [highlightedRowId, setHighlightedRowId] = useState<number | null>(null);
  const handleUpdateSuccess = () => {
    setEditingBooking(null); // Close modal after update  
  };

const dropdownRef = useRef<HTMLDivElement>(null);


  // Close dropdown + unhighlight when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
  
        setHighlightedRowId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Unhighlight row when clicking anywhere except <select>
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target instanceof HTMLSelectElement)) {
        setHighlightedRowId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div>
      <h2>My Bookings</h2>
      {myBookings.length === 0 ? (
        <p>No current bookings.</p>
      ) : (
        <table className="dashboard-table">
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
            {myBookings.map((booking) => (
              <tr  key={booking.id }
                className={highlightedRowId === booking.id ? "highlighted-row" : ""}>
                <td>{booking.room_number}</td>
                <td>{booking.room_name}</td>
                <td>{booking.room_description || "—"}</td>
                <td>{booking.building_name}</td>
                <td>{booking.floor_number}</td>
                <td>{booking.date_reserved ? formatDate(booking.date_reserved) : "—"}</td>
                <td>
                  {booking.reservation_start && booking.reservation_end && booking.date_reserved
                    ? formatTime(booking.reservation_start, booking.reservation_end, booking.date_reserved)
                    : "—"}
                </td>
                <td>{booking.notes || "—"}</td>
                <td>
                  {/* Dropdown actions */}
                  <select 
                    className="border rounded px-2 py-1"
                            onClick={() => setHighlightedRowId(booking.id)}
                            onChange={async (e) => {
                              const action = e.target.value;
                              if (action === "edit") {
                                setEditingBooking(booking);
                                 setHighlightedRowId(booking.id);
                              }
                              else if (action === "delete") {
                                cancelReservation(booking.id)
                                 setHighlightedRowId(booking.id);
                              }
                              e.target.value = "";
                            }}
                            defaultValue=""
                  >
                          Actions 
                            <option value="">---select action---</option>
                            <option value = "edit" >  Edit </option>
                            <option value = "delete"> Cancel </option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Edit Booking Modal */}
      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onUpdateSuccess={handleUpdateSuccess}
        />
      )}
    </div>
  );
}
