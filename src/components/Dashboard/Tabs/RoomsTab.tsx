// src/components/Dashboard/RoomsTab.tsx
import { useState, useEffect } from "react";
import type { Room } from "../../../types";
import { Button } from "../../Button";
import ReservationModal from "../Modals/ReservationModal";
import AddRoomModal from "../Modals/AddRoomModal";
import UpdateStatusModal from "../Modals/UpdateStatusModal";
import "../../../styles/dashboard.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


interface RoomsTabProps {
  rooms: Room[];
  userRole: number | null;
  name: string;
  id: number | null;
  onBookingSuccess?: () => void;
  formatDate: (dateStr: string) => string;
  formatTime: (start: string, end: string, dateStr: string) => string;
  isAdmin?: boolean;
  tables?: number;     
  chairs?: number;      
  projectors?: number;  
  tv?: number; 
  refreshPendingBookings: () => void;
  refreshMyBookings: () => void;
}

export default function RoomsTab({
  rooms,
  name,
  id,
  userRole,
  onBookingSuccess,
  isAdmin = false,
   refreshPendingBookings,
  refreshMyBookings,
}: RoomsTabProps) {
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [highlightedRowId, setHighlightedRowId] = useState<number | null>(null);
  const [roomList, setRoomList] = useState<Room[]>(rooms);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusRoom, setStatusRoom] = useState<Room | null>(null);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);


  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  const room = roomList.find((r) => r.id === Number(selectedRoom));
  const roomStatus = room?.status;

  useEffect(() => {
    setRoomList(rooms);
  }, [rooms]);



  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const table = document.getElementById("my-bookings-table");
      if (table && !table.contains(event.target as Node)) {
        setSelectedRowId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleDeleteRoom = (roomId: number) => {
    setRoomList((prev) => prev.filter((r) => r.id !== roomId));
  };

  const handleAddRoomSuccess = (addedRoom: Room) => {
    setRoomList((prev) => [...prev, addedRoom]);
  };
//console.log("currentUserId roomsTab:", id)
  return (
    <div className="text-black">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-black">Rooms</h2>
        {(isAdmin || [1, 2].includes(userRole!)) && (
          <Button
            variant="primary"
            onClick={() => setShowAddRoomModal(true)}
            
          >
            ➕ Add Room
          </Button>
        )}
      </div>

      {/* Selectors */}
      <div className="mb-4 text-black">
        <label className="block mb-1 font-medium text-black">Building:</label>
        <select
          className="text-black bg-white border rounded px-2 py-1"
          value={selectedBuilding}
          onChange={(e) => {
            setSelectedBuilding(e.target.value);
            setSelectedFloor("");
            setSelectedRoom("");
          }}
        >
          <option value="">-- Select Building --</option>
          {[...new Set(roomList.map((r) => r.building_name))].map((b) => (
            <option key={b} value={b} className="text-black">
              {b}
            </option>
          ))}
        </select>

        <label className="block mb-1 font-medium text-black mt-2">Floor:</label>
        <select
          className="text-black bg-white border rounded px-2 py-1"
          value={selectedFloor}
          onChange={(e) => {
            setSelectedFloor(e.target.value);
            setSelectedRoom("");
          }}
          disabled={!selectedBuilding}
        >
          <option value="">-- Select Floor --</option>
          {[...new Set(
            roomList
              .filter((r) => r.building_name === selectedBuilding)
              .map((r) => r.floor_number)
              .filter((f) => f > 0)
          )].map((f) => (
            <option key={f} value={f} className="text-black">
              {f}
            </option>
          ))}
        </select>

        <label className="block mb-1 font-medium text-black mt-2">Room:</label>
        <select
          className="text-black bg-white border rounded px-2 py-1"
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
              <option key={r.id} value={r.id} className="text-black">
                {r.room_name}
              </option>
            ))}
        </select>

        {roomStatus === 1 && (isAdmin || [1, 2, 3].includes(userRole!)) && (
          <Button
            variant="primary"
            className="text-black mt-2"
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

      {/* Table */}

          <div style={{ overflowX: "auto", marginTop: "10px", maxHeight: "500px" }}>
              <table
                id="my-bookings-table"
                className="dashboard-table"
                style={{ width: "100%", marginTop: "10px", minWidth: "1200px" }}
              >
        <thead>
          <tr>
            <th className="text-black">Room Number</th>
            <th className="text-black">Name</th>
            <th className="text-black">Description</th>
            <th className="text-black">Floor</th>
            <th className="text-black">Building</th>
            <th className="text-black">Status</th>
            <th className="text-black">Action</th>
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
                onClick={() => setSelectedRowId(r.id)}
                className={selectedRowId === r.id ? "highlighted" : ""}
              >
                <td className="text-black">{r.room_number}</td>
                <td className="text-black">{r.room_name}</td>
                <td className="text-black">
                  <div>
                    <strong className="text-black">{r.room_description || "No description"}</strong><br></br>
                   <span
                            style={{
                              fontSize: "0.9em",
                              color: selectedRowId === r.id ? "#fff" : "#000",
                            }}
                          >
                      {r.chairs ? `${r.chairs} Chair${r.chairs > 1 ? "s" : ""}` : "No Chairs"},
                      TV: {r.has_tv ? "Yes" : "No"} |{" "}
                      Tables: {r.has_table ? "Yes" : "No"} |{" "}
                      Projector: {r.has_projector ? "Yes" : "No"}
                    </span>
                  </div>
                </td>
                <td className="text-black">{r.floor_number}</td>
                <td className="text-black">{r.building_name}</td>
                <td className="text-black">
                  {r.status === 1 && "Available"}
                  {r.status === 2 && "Fully Booked"}
                  {r.status === 3 && "Under Maintenance"}
                  {r.status === 4 && "N/A"}
                </td>
                <td>
                  {(isAdmin || [1, 2].includes(userRole!)) ? (
                    <select
                      className="text-black bg-white border rounded px-2 py-1"
                      onClick={() => setHighlightedRowId(r.id)}
                      onChange={async (e) => {
                        const action = e.target.value;
                        if (action === "edit") {
                          setEditRoom(r);
                          setShowEditModal(true);
                        } else if (action === "book") {
                          setSelectedRoom(String(r.id));
                          setShowReservationModal(true);
                        } else if (action === "status") {
                          setStatusRoom(r);
                          setShowStatusModal(true);
                        } else if (action === "delete") {
                          if (
                            confirm(`Are you sure you want to delete ${r.room_name}?`)
                          ) {
                            try {
                              const res = await fetch(`/api/rooms/${r.id}`, {
                                method: "DELETE",
                              });
                              if (res.ok) {
                                alert("Room deleted!");
                                handleDeleteRoom(r.id);
                              }
                            } catch (err) {
                              console.error(err);
                              alert("Failed to delete room.");
                            }
                          }
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
                  ) : (
                    userRole === 3 &&
                    r.status === 1 && (
                      <select
                        className="text-black bg-white border rounded px-2 py-1"
                        onClick={() => setHighlightedRowId(r.id)}
                        onChange={(e) => {
                          if (e.target.value === "book") {
                            setSelectedRoom(String(r.id));
                            setShowReservationModal(true);
                          }
                          e.target.value = "";
                        }}
                        defaultValue=""
                      >
                        <option value="">-- Select Action --</option>
                        <option value="book">Book Room</option>
                      </select>
                    )
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
</div>
      {/* Modals */}
      {showStatusModal && statusRoom && (
        <UpdateStatusModal
          room={statusRoom}
          onClose={() => setShowStatusModal(false)}
          onUpdateStatusSuccess={(updatedRoom) =>
            setRoomList((prev) =>
              prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r))
            )
          }
        />
      )}

      {showReservationModal && selectedRoom && (
        <ReservationModal
          roomId={Number(selectedRoom)}
          building={room?.building_name || ""}
          floor={room?.floor_number || ""}
          currentUserId={id}
          roomName={room?.room_name || ""}
          roomNumber={room?.room_number || ""}
          roomDesc={room?.room_description || ""}
          reservedBy={name}
          userRole={userRole!} 
          chairs={room?.chairs}
          has_tv={room?.has_tv}
          has_table={room?.has_table}
          has_projector={room?.has_projector}
          onClose={() => setShowReservationModal(false)}
          onSuccess={() => {
            setSelectedBuilding("");
            setSelectedFloor("");
            setSelectedRoom("");
            setShowReservationModal(false);
            onBookingSuccess?.();
           
          }}
           refreshPendingBookings={refreshPendingBookings}
    refreshMyBookings={refreshMyBookings}
        />
      )}



      {showAddRoomModal && (
        <AddRoomModal
          onClose={() => setShowAddRoomModal(false)}
          onAddRoomSuccess={handleAddRoomSuccess}
        />
      )}
      
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
