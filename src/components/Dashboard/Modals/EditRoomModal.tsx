// src/components/Dashboard/EditRoomModal.tsx
import { Button } from "../../Button";
import type { Room } from "../../../types";
import { useState } from "react";

interface EditRoomModalProps {
  room: Room;
  onClose: () => void;
  onSuccess: (updatedRoom: Room) => void;
}

export default function EditRoomModal({ room, onClose, onSuccess }: EditRoomModalProps) {
  const [editedRoom, setEditedRoom] = useState<Room>({ ...room });
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateRoom = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedRoom),
      });

      if (!res.ok) throw new Error(await res.text());
      const updated: Room = await res.json();
      onSuccess(updated);
      onClose();
    } catch (err) {
      console.error("EditRoomModal save error", err);
      alert("Failed to save room");
    } finally {
      setIsSaving(false);
    }
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
            setEditedRoom({ ...editedRoom, floor_number: Math.max(1, Number(e.target.value)) })
          }
          className="w-full mb-3 p-2 border rounded"
        />

        {/* Chairs and Equipment */}
        <label># Chairs:</label>
        <input
          type="number"
          min={0}
          value={editedRoom.chairs}
          onChange={(e) => setEditedRoom({ ...editedRoom, chairs: Math.max(0, Number(e.target.value)) })}
        />

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: "12px" }}>
          <label>
            <input
              type="checkbox"
              checked={editedRoom.has_tv === 1}
              onChange={(e) => setEditedRoom({ ...editedRoom, has_tv: e.target.checked ? 1 : 0 })}
            /> TV
          </label>

          <label>
            <input
              type="checkbox"
              checked={editedRoom.has_projector === 1}
              onChange={(e) => setEditedRoom({ ...editedRoom, has_projector: e.target.checked ? 1 : 0 })}
            /> Projector
          </label>

          <label>
            <input
              type="checkbox"
              checked={editedRoom.has_table === 1}
              onChange={(e) => setEditedRoom({ ...editedRoom, has_table: e.target.checked ? 1 : 0 })}
            /> Table
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15px" }}>
          <Button variant="primary" onClick={handleUpdateRoom} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
