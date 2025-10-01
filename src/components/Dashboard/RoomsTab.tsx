
// src/components/Dashboard/RoomsTab.tsx
import type { Room } from "../../types";
import { Button } from "../Button";

interface RoomsTabProps {
  rooms: Room[];
  userRole: number | null;
  openBookingModal: (room: Room) => void;
  setShowAddRoomModal: (show: boolean) => void;
  formatDate: (dateStr: string) => string;
  formatTime: (start: string, end: string, dateStr: string) => string;
}

export default function RoomsTab({
  rooms,
  userRole,
  openBookingModal,
  setShowAddRoomModal,
  formatDate,
  formatTime,
}: RoomsTabProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Rooms</h2>
        {[1, 2].includes(userRole!) && (
          <Button variant="primary" onClick={() => setShowAddRoomModal(true)}>➕ Add Room</Button>
        )}
      </div>
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Room #</th>
            <th>Name</th>
            <th>Description</th>
            <th>Building</th>
            <th>Floor</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id}>
              <td>{room.room_number}</td>
              <td>{room.room_name}</td>
              <td>{room.room_description || "—"}</td>
              <td>{room.building_name}</td>
              <td>{room.floor_number}</td>
              <td>
                {room.status === 1 && "Available"}
                {room.status === 2 && room.date_reserved && room.reservation_start && room.reservation_end
                  ? `Reserved by ${room.reserved_by} on ${formatDate(room.date_reserved)} at ${formatTime(room.reservation_start, room.reservation_end, room.date_reserved)}`
                  : room.status === 2
                  ? "Reserved"
                  : ""}
                {room.status === 3 && "Under Maintenance"}
                {room.status === 4 && "Blocked"}
              </td>
              <td>
                {room.status === 1 && [1, 2, 3].includes(userRole!) && (
                  <Button variant="primary" onClick={() => openBookingModal(room)}>Book</Button>
                )}
                {[1, 2].includes(userRole!) && (
                  <Button onClick={() => alert("Edit not implemented")}>Edit</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
