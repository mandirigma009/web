// src/components/Dashboard/RoomsTab.tsx
import { useState, useRef, useEffect } from "react";
import type { Room } from "../../types";
import { Button } from "../Button";
import ReservationModal from "./ReservationModal";
import EditRoomModal from "./EditRoomModal";
import AddRoomModal from "./AddRoomModal";
import UpdateStatusModal from "./UpdateStatusModal"; // ✅ new modal
import "./RoomsTab.css";

interface RoomsTabProps {
  rooms: Room[];
  userRole: number | null;
  name: string;
  onBookingSuccess?: () => void;
  formatDate: (dateStr: string) => string;
  formatTime: (start: string, end: string, dateStr: string) => string;
}

export default function RoomsTab({
  rooms,
  name,
  userRole,
  onBookingSuccess,
}: RoomsTabProps) {
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [highlightedRowId, setHighlightedRowId] = useState<number | null>(null);
  const [roomList, setRoomList] = useState<Room[]>(rooms);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusRoom, setStatusRoom] = useState<Room | null>(null);

  useEffect(() => {
    setRoomList(rooms);
  }, [rooms]);

  // Add room modal state
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);

  // Edit room modal state
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Dropdown state

  const dropdownRef = useRef<HTMLDivElement>(null);

  const room = roomList.find((r) => r.id === Number(selectedRoom));
  const roomStatus = room?.status;

  // Close dropdown + unhighlight when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
  
        setHighlightedRowId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Unhighlight row when clicking anywhere except <select>
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target instanceof HTMLSelectElement)) {
        setHighlightedRowId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Update room in local list after editing
  const handleEditSuccess = (updatedRoom: Room) => {
    setRoomList((prev) =>
      prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r))
    );
    setShowEditModal(false);
  };

  // Delete room from local list after deleting
  const handleDeleteRoom = (roomId: number) => {
    setRoomList((prev) => prev.filter((r) => r.id !== roomId));
  };

  // Add room success callback (auto-refresh)
  const handleAddRoomSuccess = (addedRoom: Room) => {
    setRoomList((prev) => [...prev, addedRoom]);
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Rooms</h2>
        {[1, 2].includes(userRole!) && (
          <Button variant="primary" onClick={() => setShowAddRoomModal(true)}>
            ➕ Add Room
          </Button>
        )}
      </div>

      {/* Building / Floor / Room selectors */}
      <div className="mb-4">
        <label className="block mb-1 font-medium">Building:</label>
        <select
          value={selectedBuilding}
          onChange={(e) => {
            setSelectedBuilding(e.target.value);
            setSelectedFloor("");
            setSelectedRoom("");
          }}
        >
          <option value="">-- Select Building --</option>
          {[...new Set(roomList.map((r) => r.building_name))].map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <label className="block mb-1 font-medium">Floor:</label>
        <select
          value={selectedFloor}
          onChange={(e) => {
            setSelectedFloor(e.target.value);
            setSelectedRoom("");
          }}
          disabled={!selectedBuilding}
        >
          <option value="">-- Select Floor --</option>
          {[
            ...new Set(
              roomList
                .filter((r) => r.building_name === selectedBuilding)
                .map((r) => r.floor_number)
                .filter((f) => f > 0)
            ),
          ].map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <label className="block mb-1 font-medium">Room:</label>
        <select
          value={selectedRoom}
          onChange={(e) => setSelectedRoom(e.target.value)}
          disabled={!selectedFloor}
        >
          <option value="">-- Select Room --</option>
          {roomList
            .filter(
              (r) =>
                r.building_name === selectedBuilding &&
                String(r.floor_number) === selectedFloor
            )
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.room_name}
              </option>
            ))}
        </select>

        {roomStatus === 1 && [1, 2, 3].includes(userRole!) && (
          <Button
            variant="primary"
            onClick={() => {
              setSelectedBuilding("");
              setSelectedFloor("");
              setSelectedRoom("");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Room details */}
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Room Number</th>
            <th>Name</th>
            <th>Description</th>
            <th>Floor</th>
            <th>Building</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {roomList
            .filter(
              (r) =>
                (!selectedBuilding || r.building_name === selectedBuilding) &&
                (!selectedFloor || String(r.floor_number) === selectedFloor) &&
                (!selectedRoom || r.id === Number(selectedRoom))
            )
            .map((r) => (
              <tr
                key={r.id}
                className={highlightedRowId === r.id ? "highlighted-row" : ""}
              >
                <td>{r.room_number}</td>
                <td>{r.room_name}</td>
                <td>{r.room_description}</td>
                <td>{r.floor_number}</td>
                <td>{r.building_name}</td>
                <td>
                  {r.status === 1 && "Available"}
                  {r.status === 2 && "Fully Booked"}
                  {r.status === 3 && "Under Maintenance"}
                  {r.status === 4 && "N/A"}
                </td>
                    <td>
                      <label className="sr-only">Action</label>

                      {([1, 2].includes(userRole!) ? (
                        // Roles 1 or 2: full dropdown
                        <select
                          className="border rounded px-2 py-1"
                          onClick={() => setHighlightedRowId(r.id)}
                          onChange={async (e) => {
                            const action = e.target.value;

                            if (action === "edit") {
                              setEditRoom(r);
                              setShowEditModal(true);
                              setHighlightedRowId(r.id);
                            } else if (action === "book") {
                              setSelectedRoom(String(r.id));
                              setShowReservationModal(true);
                              setHighlightedRowId(r.id);
                            } else if (action === "status") {
                              setStatusRoom(r);
                              setShowStatusModal(true);
                              setHighlightedRowId(r.id);
                            } else if (action === "delete") {
                              if (confirm(`Are you sure you want to delete ${r.room_name}?`)) {
                                try {
                                  const res = await fetch(`/api/rooms/${r.id}`, { method: "DELETE" });
                                  if (res.ok) {
                                    alert("Room deleted!");
                                    handleDeleteRoom(r.id);
                                  }
                                } catch (err) {
                                  console.error(err);
                                  alert("Failed to delete room.");
                                }
                              }
                              setHighlightedRowId(r.id);
                            }

                            e.target.value = "";
                          }}
                          defaultValue=""
                        >
                          <option value="">-- Select Action --</option>
                          <option value="edit">Edit Room</option>
                          {r.status === 1 && <option value="book">Book Room</option>}
                          <option value="delete">Delete Room</option>
                          <option value="status">Update Status</option>
                        </select>
                      ) : userRole === 3 ? (
                        // Role 3: only book option
                        r.status === 1 && (
                          <select
                            className="border rounded px-2 py-1"
                            onClick={() => setHighlightedRowId(r.id)}
                            onChange={(e) => {
                              if (e.target.value === "book") {
                                setSelectedRoom(String(r.id));
                                setShowReservationModal(true);
                                setHighlightedRowId(r.id);
                              }
                              e.target.value = "";
                            }}
                            defaultValue=""
                          >
                            <option value="">-- Select Action --</option>
                            <option value="book">Book Room</option>
                          </select>
                        )
                      ) : null /* Role 4 or others see nothing */)}
                    </td>

              </tr>
            ))}
        </tbody>
      </table>

      {/* Update Status Modal */}
      {showStatusModal && statusRoom && (
        <UpdateStatusModal
          room={statusRoom}
          onClose={() => setShowStatusModal(false)}
          onUpdateStatusSuccess={(updatedRoom) => {
            setRoomList((prev) =>
              prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r))
            );
          }}
        />
      )}

      {/* Reservation modal */}
      {showReservationModal && selectedRoom && (
        <ReservationModal
          roomId={Number(selectedRoom)}
          building={room?.building_name || ""}
          floor={room?.floor_number || ""}
          roomName={room?.room_name || ""}
          roomNumber={room?.room_number || ""}
          roomDesc={room?.room_description || ""}
          reservedBy={name}
          onClose={() => setShowReservationModal(false)}
          onSuccess={() => {
            setSelectedBuilding("");
            setSelectedFloor("");
            setSelectedRoom("");
            setShowReservationModal(false);
            if (onBookingSuccess) onBookingSuccess();
          }}
        />
      )}

      {/* Edit Room modal */}
      {showEditModal && editRoom && (
        <EditRoomModal
          room={editRoom}
          onClose={() => setShowEditModal(false)}
          onSuccess={(updatedRoom) => handleEditSuccess(updatedRoom)}
        />
      )}

      {/* Add Room modal */}
      {showAddRoomModal && (
        <AddRoomModal
          onClose={() => setShowAddRoomModal(false)}
          onAddRoomSuccess={handleAddRoomSuccess}
        />
      )}
    </div>
  );
}
