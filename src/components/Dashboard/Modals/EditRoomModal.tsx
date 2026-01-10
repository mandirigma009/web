/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/Dashboard/EditRoomModal.tsx
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../Button";
import type { Room } from "../../../types";
import "../../../styles/modal.css";

interface Building {
  building_name: ReactNode;
  id: number;
  name: string;
}

interface Props {
  room: Room;
  onClose: () => void;
  onSuccess: (room: Room) => void;
}

export default function EditRoomModal({ room, onClose, onSuccess }: Props) {
  const [editedRoom, setEditedRoom] = useState<Room>({ ...room });
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/buildings")
      .then((r) => r.json())
      .then(setBuildings);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedRoom),
      });

      if (!res.ok) throw new Error();
      onSuccess(await res.json());
      onClose();
    } catch {
      alert("Failed to update room");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Edit Room</h3>

        <label>Room Number</label>
        <input value={editedRoom.room_number}
          onChange={(e) => setEditedRoom({ ...editedRoom, room_number: e.target.value })} />

        <label>Room Name</label>
        <input value={editedRoom.room_name}
          onChange={(e) => setEditedRoom({ ...editedRoom, room_name: e.target.value })} />

        <label>Description</label>
        <textarea value={editedRoom.room_description}
          onChange={(e) => setEditedRoom({ ...editedRoom, room_description: e.target.value })} />

        <label>Building</label>
        <select
          value={editedRoom.building_id}
          onChange={(e) =>
            setEditedRoom({ ...editedRoom, building_id: Number(e.target.value) })
          }
        >
         <option value="">-- Select Building --</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.building_name}
                </option>
          ))}
        </select>

        <label>Floor</label>
        <input type="number" min={1}
          value={editedRoom.floor_number}
          onChange={(e) =>
            setEditedRoom({ ...editedRoom, floor_number: Math.max(1, +e.target.value) })
          }
        />

        <label>Max Seat Capacity</label>
          <input
            type="number"
            min={0}
            value={editedRoom.max_capacity}
            onChange={(e) =>
              setEditedRoom({
                ...editedRoom,
                max_capacity: Math.max(0, Number(e.target.value)),
              })
            }
          />


        <label>Available Chairs</label>
        <input type="number" min={0}
          value={editedRoom.chairs}
          onChange={(e) =>
            setEditedRoom({ ...editedRoom, chairs: Math.max(0, +e.target.value) })
          }
        />

        <div className="flex gap-3">
          {["tv", "projector", "table"].map((item) => (
            <label key={item}>
              <input
                type="checkbox"
                checked={Boolean((editedRoom as any)[`has_${item}`])}
                onChange={(e) =>
                  setEditedRoom({
                    ...editedRoom,
                    [`has_${item}`]: e.target.checked ? 1 : 0,
                  })
                }
              /> {item.toUpperCase()}
            </label>
          ))}
        </div>

       <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
