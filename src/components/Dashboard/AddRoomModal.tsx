// src/components/Dashboard/AddRoomModal.tsx
import { Button } from "../Button";

interface AddRoomModalProps {
  newRoom: {
    room_number: string;
    room_name: string;
    room_description: string;
    building_name: string;
    floor_number: number;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setNewRoom: (room: any) => void;
  handleAddRoom: () => void;
  setShowAddRoomModal: (show: boolean) => void;
}

export default function AddRoomModal({
  newRoom,
  setNewRoom,
  handleAddRoom,
  setShowAddRoomModal,
}: AddRoomModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="flex items-center justify-center ">Add New Room</h3>
        <label>Room Number:</label>
        <input type="text" value={newRoom.room_number} onChange={(e) => setNewRoom({ ...newRoom, room_number: e.target.value })} />
        <label>Room Name:</label>
        <input type="text" value={newRoom.room_name} onChange={(e) => setNewRoom({ ...newRoom, room_name: e.target.value })} />
        <label>Description:</label>
        <textarea value={newRoom.room_description} onChange={(e) => setNewRoom({ ...newRoom, room_description: e.target.value })} />
        <label>Building:</label>
        <input type="text" value={newRoom.building_name} onChange={(e) => setNewRoom({ ...newRoom, building_name: e.target.value })} />
        <label>Floor:</label>
        <input type="number" value={newRoom.floor_number} onChange={(e) => setNewRoom({ ...newRoom, floor_number: Number(e.target.value) })} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15px" }}>
          <Button variant="primary" onClick={handleAddRoom}>Save Room</Button>
          <Button variant="secondary" onClick={() => setShowAddRoomModal(false)}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
