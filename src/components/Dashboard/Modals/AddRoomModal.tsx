import { useState } from "react";
import { Button } from "../../Button";
import type { Building, Room } from "../../../types";
import "../../../styles/App.css";

interface AddRoomModalProps {
  buildings: Building[];
  onClose: () => void;
  onAddRoomSuccess: (newRoom: Room) => void;
}

export default function AddRoomModal({
  buildings,
  onClose,
  onAddRoomSuccess,
}: AddRoomModalProps) {
  const [newRoom, setNewRoom] = useState({
    room_number: "",
    room_name: "",
    room_description: "",
    building_id: "",
    floor_number: 1,
    status: 1,
    chairs: 0,
    has_tv: false,
    has_projector: false,
    has_table: false,
    max_capacity: 0,
  });

const validate = () =>
  newRoom.room_number.trim() !== "" &&
  newRoom.room_name.trim() !== "" &&
  newRoom.building_id !== "";


  const handleSaveRoom = async () => {
    if (!validate()) {
      alert("Room number, name, and building are required.");
      return;
    }

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newRoom,
          building_id: Number(newRoom.building_id),
        }),
      });

      if (res.status === 409) {
        alert("Room already exists in this building and floor.");
        return;
      }

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const saved: Room = await res.json();
      onAddRoomSuccess(saved);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to add room");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="text-center">Add New Room</h3>

        <label>Room Number *</label>
        <input
          value={newRoom.room_number}
          onChange={(e) =>
            setNewRoom({ ...newRoom, room_number: e.target.value })
          }
        />

        <label>Room Name *</label>
        <input
          value={newRoom.room_name}
          onChange={(e) =>
            setNewRoom({ ...newRoom, room_name: e.target.value })
          }
        />

        <label>Description</label>
        <textarea
          value={newRoom.room_description}
          onChange={(e) =>
            setNewRoom({ ...newRoom, room_description: e.target.value })
          }
        />

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label>Building *</label>
            <select
              value={newRoom.building_id}
              onChange={(e) =>
                setNewRoom({ ...newRoom, building_id: e.target.value })
              }
            >
              <option value="">-- Select Building --</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.building_name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: 120 }}>
            <label>Floor</label>
            <input
              type="number"
              min={1}
              value={newRoom.floor_number}
              onChange={(e) =>
                setNewRoom({
                  ...newRoom,
                  floor_number: Math.max(1, Number(e.target.value)),
                })
              }
            />
          </div>
        </div>

          <label>Max Seat Capacity</label>
          <input
            type="number"
            min={0}
            value={newRoom.max_capacity}
            onChange={(e) =>
              setNewRoom({ ...newRoom, max_capacity: Math.max(0, Number(e.target.value)) })
            }
          />



        <label># available Chairs</label>
        <input
          type="number"
          min={0}
          value={newRoom.chairs}
          onChange={(e) =>
            setNewRoom({
              ...newRoom,
              chairs: Math.max(0, Number(e.target.value)),
            })
          }
        />

        <div style={{ display: "flex", gap: 12 }}>
          <label>
            <input
              type="checkbox"
              checked={newRoom.has_tv}
              onChange={(e) =>
                setNewRoom({ ...newRoom, has_tv: e.target.checked })
              }
            />{" "}
            TV
          </label>

          <label>
            <input
              type="checkbox"
              checked={newRoom.has_projector}
              onChange={(e) =>
                setNewRoom({
                  ...newRoom,
                  has_projector: e.target.checked,
                })
              }
            />{" "}
            Projector
          </label>


          <label>
            <input
              type="checkbox"
              checked={newRoom.has_table}
              onChange={(e) =>
                setNewRoom({ ...newRoom, has_table: e.target.checked })
              }
            />{" "}
            Table
          </label>
        </div>

        <label>Status</label>
        <select
          value={newRoom.status}
          onChange={(e) =>
            setNewRoom({ ...newRoom, status: Number(e.target.value) })
          }
        >
          <option value={1}>Available</option>
          <option value={2}>Reserved</option>
          <option value={3}>Maintenance</option>
          <option value={4}>Occupied</option>
        </select>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <Button variant="primary" onClick={handleSaveRoom}>
            Save Room
          </Button>
          <Button variant="secondary"  className="btn-cancel" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
