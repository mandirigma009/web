// src/components/Dashboard/EditRoomModal.tsx
import { Button } from "../Button";
import type { Room } from "../../types";
import { useState } from "react";

interface EditRoomModalProps {
  room: Room;
  onClose: () => void;
  onSuccess: (updatedRoom: Room) => void;
}

export default function EditRoomModal({ room, onClose, onSuccess }: EditRoomModalProps) {
  const [editedRoom, setEditedRoom] = useState<Room>({ ...room });

  const handleUpdateRoom = () => {
    // Here you can make your API call to update the room
    // Example:
    // await fetch(`/api/rooms/${editedRoom.id}`, { method: 'PUT', body: JSON.stringify(editedRoom) });
    onSuccess(editedRoom); // Update local state in RoomsTab
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="flex items-center justify-center">Edit Room</h3>

        <label>Room Number:</label>
        <input
          type="text"
          value={editedRoom.room_number}
          onChange={(e) => setEditedRoom({ ...editedRoom, room_number: e.target.value })}
        />

        <label>Room Name:</label>
        <input
          type="text"
          value={editedRoom.room_name}
          onChange={(e) => setEditedRoom({ ...editedRoom, room_name: e.target.value })}
        />

        <label>Description:</label>
        <textarea
          value={editedRoom.room_description}
          onChange={(e) => setEditedRoom({ ...editedRoom, room_description: e.target.value })}
        />

        <label>Building:</label>
        <input
          type="text"
          value={editedRoom.building_name}
          onChange={(e) => setEditedRoom({ ...editedRoom, building_name: e.target.value })}
        />

        <label>Floor:</label>
        <input
          type="number"
          value={editedRoom.floor_number}
          min={1}
          onChange={(e) =>
            setEditedRoom({
              ...editedRoom,
              floor_number: Math.max(1, Number(e.target.value)),
            })
          }
          className="w-full mb-3 p-2 border rounded"
        />

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15px" }}>
          <Button variant="primary" onClick={handleUpdateRoom}>Update Room</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
