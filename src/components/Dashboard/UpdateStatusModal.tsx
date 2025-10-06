import { useState } from "react";
import { Button } from "../Button";
import type { Room } from "../../types";

interface UpdateStatusModalProps {
  room: Room;
  onClose: () => void;
  onUpdateStatusSuccess: (updatedRoom: Room) => void;
}

export default function UpdateStatusModal({
  room,
  onClose,
  onUpdateStatusSuccess,
}: UpdateStatusModalProps) {
  const [newStatus, setNewStatus] = useState(room.status);

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/rooms/${room.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const updatedRoom = await res.json();
        onUpdateStatusSuccess(updatedRoom); // 🔥 updates RoomsTab
        onClose();
      } else {
        alert("Failed to update room status.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating room status.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="flex items-center justify-center">Update Room Status</h3>

        <label>Status:</label>
        <select
          value={newStatus}
          onChange={(e) => setNewStatus(Number(e.target.value))}
        >
          <option value="1">Available</option>
          <option value="3">Maintenance</option>
          <option value="4">N/A</option>
        </select>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15px" }}>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
