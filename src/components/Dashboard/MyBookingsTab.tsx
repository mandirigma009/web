
// src/components/Dashboard/MyBookingsTab.tsx
import type { Room } from "../../types";
import { Button } from "../Button";

interface MyBookingsTabProps {
  myBookings: Room[];
  cancelingId: number | null;
  cancelReservation: (id: number) => void;
  formatDate: (dateStr: string) => string;
  formatTime: (start: string, end: string, dateStr: string) => string;
}

export default function MyBookingsTab({
  myBookings,
  cancelingId,
  cancelReservation,
  formatDate,
  formatTime,
}: MyBookingsTabProps) {
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {myBookings.map((booking) => (
              <tr key={booking.id}>
                <td>{booking.room_number}</td>
                <td>{booking.room_name}</td>
                <td>{booking.room_description || "—"}</td>
                <td>{booking.building_name}</td>
                <td>{booking.floor_number}</td>
                <td>{booking.date_reserved ? formatDate(booking.date_reserved) : "—"}</td>
                <td>{booking.reservation_start && booking.reservation_end && booking.date_reserved ? formatTime(booking.reservation_start, booking.reservation_end, booking.date_reserved) : "—"}</td>
                <td>
                  <Button
                    variant="danger"
                    onClick={() => cancelReservation(booking.id)}
                    disabled={cancelingId === booking.id}
                  >
                    {cancelingId === booking.id ? "Canceling..." : "Cancel"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
