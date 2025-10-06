// src/components/Dashboard/AddRoomModal.tsx
import { Button } from "../Button";
import type { Room } from "../../types";
import { useState } from "react";

interface AddRoomModalProps {
  onClose: () => void;
  onAddRoomSuccess: (newRoom: Room) => void; // callback to update RoomsTab
}

export default function AddRoomModal({ onClose, onAddRoomSuccess }: AddRoomModalProps) {
  const [newRoom, setNewRoom] = useState<Room>({
    id: Date.now(), // temporary id for local state; replace with API id if you have backend
    room_number: "",
    room_name: "",
    room_description: "",
    building_name: "",
    floor_number: 1,
    status: 1,
  });

  const handleSaveRoom = async () => {
    try {
      // Example API call (replace with your backend endpoint)
      // const res = await fetch("/api/rooms", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(newRoom),
      // });
      // const savedRoom = await res.json();

      // For now, use local newRoom
      onAddRoomSuccess(newRoom); // auto-refresh RoomsTab
      onClose(); // close modal
    } catch (err) {
      console.error(err);
      alert("Failed to add room.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="flex items-center justify-center">Add New Room</h3>

        <label>Room Number:</label>
        <input
          type="text"
          value={newRoom.room_number}
          onChange={(e) => setNewRoom({ ...newRoom, room_number: e.target.value })}
        />

        <label>Room Name:</label>
        <input
          type="text"
          value={newRoom.room_name}
          onChange={(e) => setNewRoom({ ...newRoom, room_name: e.target.value })}
        />

        <label>Description:</label>
        <textarea
          value={newRoom.room_description}
          onChange={(e) => setNewRoom({ ...newRoom, room_description: e.target.value })}
        />

        <label>Building:</label>
        <input
          type="text"
          value={newRoom.building_name}
          onChange={(e) => setNewRoom({ ...newRoom, building_name: e.target.value })}
        />

        <label>Floor:</label>
        <input
          type="number"
          value={newRoom.floor_number}
          min={1}
          onChange={(e) =>
            setNewRoom({ ...newRoom, floor_number: Math.max(1, Number(e.target.value)) })
          }
        />

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15px" }}>
          <Button variant="primary" onClick={handleSaveRoom}>Save Room</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
