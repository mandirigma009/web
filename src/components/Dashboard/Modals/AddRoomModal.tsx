// src/components/Dashboard/AddRoomModal.tsx
import { useState } from "react";
import { Button } from "../../Button";
import type { Room } from "../../../types";

interface AddRoomModalProps {
 
  onClose: () => void;
  onAddRoomSuccess: (newRoom: Room) => void;
}

export default function AddRoomModal({  onClose, onAddRoomSuccess }: AddRoomModalProps) {
  const [newRoom, setnewRoom] = useState({
    room_number: "",
    room_name: "",
    room_description: "",
    building_name: "",
    floor_number: 1,
    status: 1,
    chairs: 0,
    has_tv: false,
    has_projector: false,
    has_table: false,
  });


  const validate = () => newRoom.room_number.trim() && newRoom.room_name.trim() && newRoom.building_name.trim();

  const handleSaveRoom = async () => {
    if (!validate()) {
      alert("Please fill required fields: room number, name, building.");
      return;
    }

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRoom),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved: Room = await res.json();
      onAddRoomSuccess(saved);
      onClose();
      setnewRoom({
        room_number: "",
        room_name: "",
        room_description: "",
        building_name: "",
        floor_number: 1,
        status: 1,
        chairs: 0,
        has_tv: false,
        has_projector: false,
        has_table: false,
      });
    } catch (err) {
      console.error(err);
      alert("Failed to add room: " + (err instanceof Error ? err.message : ""));
    } finally {
   ;
    }
  };

  


  return (
      <div className="modal-overlay">
      <div className="modal-content">
         <h3 className="flex items-center justify-center">Add New Room</h3>
        <label>Room Number *</label>
        <input value={newRoom.room_number} onChange={(e) => setnewRoom({ ...newRoom, room_number: e.target.value })} />

        <label>Room Name *</label>
        <input value={newRoom.room_name} onChange={(e) => setnewRoom({ ...newRoom, room_name: e.target.value })} />

        <label>Description</label>
        <textarea value={newRoom.room_description} onChange={(e) => setnewRoom({ ...newRoom, room_description: e.target.value })} />

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label>Building *</label>
            <input value={newRoom.building_name} onChange={(e) => setnewRoom({ ...newRoom, building_name: e.target.value })} />
          </div>
          <div style={{ width: 120 }}>
            <label>Floor</label>
            <input type="number" min={1} value={newRoom.floor_number} onChange={(e) => setnewRoom({ ...newRoom, floor_number: Math.max(1, Number(e.target.value)) })} />
          </div>
        </div>

        <label># Chairs</label>
        <input type="number" min={0} value={newRoom.chairs} onChange={(e) => setnewRoom({ ...newRoom, chairs: Math.max(0, Number(e.target.value)) })} />

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label><input type="checkbox" checked={newRoom.has_tv} onChange={(e) => setnewRoom({ ...newRoom, has_tv: e.target.checked })} /> TV</label>
          <label><input type="checkbox" checked={newRoom.has_projector} onChange={(e) => setnewRoom({ ...newRoom, has_projector: e.target.checked })} /> Projector</label>
          <label><input type="checkbox" checked={newRoom.has_table} onChange={(e) => setnewRoom({ ...newRoom, has_table: e.target.checked })} /> Table</label>
        </div>

        <label>Status</label>
        <select value={newRoom.status} onChange={(e) => setnewRoom({ ...newRoom, status: Number(e.target.value) })}>
          <option value={1}>Available</option>
          <option value={2}>Reserved</option>
          <option value={3}>Maintenance</option>
          <option value={4}>Occupied</option>
        </select>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15px" }}>
          <Button variant="primary" onClick={handleSaveRoom}>Save Room</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
      </div>
 
   
  );
}
