/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/Dashboard/RoomsTab.tsx
import { useState, useEffect } from "react";
import type { Room, Building } from "../../../types";
import { Button } from "../../Button";
import ReservationModal from "../Modals/ReservationModal";
import EditRoomModal from "../Modals/EditRoomModal";
import AddRoomModal from "../Modals/AddRoomModal";
import UpdateStatusModal from "../Modals/UpdateStatusModal";
import "../../../styles/dashboard.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import BuildingModal from "../Modals/BuildingModal";
import ActionMenu from "../../ActionMenu";
import type { ActionKey } from "../../../utils/actionStyles";
import "../../../styles/App.css";
import { FaPlus, FaDoorOpen, FaBuilding } from "react-icons/fa";


interface RoomsTabProps {
  rooms: Room[];
  userRole: number;
  name: string;
  id: number | null;
  onBookingSuccess?: () => void;
  formatDate: (dateStr: string) => string;
  formatTime: (start: string, end: string, dateStr: string) => string;
  isAdmin?: boolean;
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
  const [roomList, setRoomList] = useState<Room[]>(rooms);
  const [allBuildings, setAllBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showBuildingModal, setShowBuildingModal] = useState(false);

  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusRoom, setStatusRoom] = useState<Room | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const room = roomList.find((r) => r.id === Number(selectedRoom));
 
  const [searchQuery, setSearchQuery] = useState("");
const [searchBy, setSearchBy] = useState<
  "room_number" | "room_name" | "building" | "capacity" | "floor"
>("room_number");

const [filterHasTable, setFilterHasTable] = useState(false);
const [filterHasProjector, setFilterHasProjector] = useState(false);


  // Fetch buildings
  useEffect(() => {
    fetch("/api/buildings")
      .then((res) => res.json())
      .then((data: Building[]) => setAllBuildings(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setRoomList(rooms);
  }, [rooms]);

  const handleEditSuccess = (updatedRoom: Room) => {
    setRoomList((prev) => prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)));
    setShowEditModal(false);
  };

  const handleAddRoomSuccess = (addedRoom: Room) => {
    setRoomList((prev) => [...prev, addedRoom]);
  };

  const handleDeleteRoom = async (roomId: number) => {
    if (!confirm("Are you sure you want to delete this room?")) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}`, { method: "DELETE" });
      if (res.ok) setRoomList((prev) => prev.filter((r) => r.id !== roomId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete room");
    }
  };



const handleBuildingSuccess = (
  building: Building,
  action: "add" | "update" | "delete"
) => {
  setAllBuildings((prev) => {
    if (action === "add") return [...prev, building];
    if (action === "update")
      return prev.map((b) => (b.id === building.id ? building : b));
    return prev.filter((b) => b.id !== building.id);
  });
};


console.log("userRole : ", userRole)
  return (
    <div className="text-black">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2>Rooms</h2>
        <div className="flex gap-2">
          {(isAdmin || [1, 2].includes(userRole)) && (
            <>

             <Button
                variant="primary"
                title="Add Room"
                onClick={() => setShowAddRoomModal(true)}
              >
                <FaPlus />
                <FaDoorOpen style={{ marginRight: 6 }} />

              </Button>

              <Button
                variant="secondary"
                title="Manage Buildings"
                onClick={() => {
                  setShowBuildingModal(true);
                }}
              >
       
                <FaBuilding /><br></br>
                Manage Buildings
              </Button>


            </>
          )}
        </div>
      </div>

        {/* Selectors */}
      <div className="mb-4 text-black">
        <label className="block mb-1 font-medium text-black">Building:</label>
            <select
              value={selectedBuilding}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedBuilding(id);
                setSelectedFloor("");
                setSelectedRoom("");

                const building = allBuildings.find(b => String(b.id) === id);
                if (building && (isAdmin || [1, 2].includes(userRole))) {

                  setShowBuildingModal(true);
                }
              }}
            >

          <option value="">-- Select Building --</option>
          {allBuildings.map((b) => (
            <option key={b.id} value={b.id} className="text-black">
              {b.building_name}
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
              .filter((r) => String(r.building_id) === selectedBuilding)
              .map((r) => r.floor_number)
              .filter((f) => f > 0)
          )].map((f) => (
            <option key={f} value={f} className="text-black">{f}</option>
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
                String(r.building_id) === selectedBuilding &&
                String(r.floor_number) === selectedFloor
            )
            .map((r) => (
              <option key={r.id} value={r.id} className="text-black">
                {r.room_number}
              </option>
            ))}
        </select>


      </div>

 {/* Search & Filters */}
<div
  className="mb-4 text-black"
  style={{
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "center", // aligns input/select with checkboxes
  }}
>
  {/* Search By */}
  <div style={{ minWidth: 180 }}>
    <label className="block text-sm font-medium mb-1">Search by</label>
    <select
      className="border rounded bg-white w-full h-10 px-2" // fixed height
      value={searchBy}
      onChange={(e) => setSearchBy(e.target.value as any)}
    >
      <option value="room_number">Room Number</option>
      <option value="room_name">Room Name</option>
      <option value="building">Building</option>
      <option value="capacity">Capacity</option>
      <option value="floor">Floor</option>
    </select>
  </div>

  {/* Search Input */}
  <div style={{ minWidth: 260, flexGrow: 1 }}>
    <label className="block text-sm font-medium mb-1">Search</label>
    <input
      type="text"
      placeholder="Type to search..."
      className="border rounded bg-white w-full h-10 px-2" // same height as select
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  </div>

  {/* Filters */}
  <div
    style={{
      display: "flex",
      gap: 16,
      alignItems: "center", // center align checkboxes with input
      paddingTop: 24, // optional: aligns filter text with label baseline
    }}
  >
    <label className="flex items-center gap-1">
      <input
        type="checkbox"
        checked={filterHasTable}
        onChange={(e) => setFilterHasTable(e.target.checked)}
      />
      Tables
    </label>

    <label className="flex items-center gap-1">
      <input
        type="checkbox"
        checked={filterHasProjector}
        onChange={(e) => setFilterHasProjector(e.target.checked)}
      />
      Projector
    </label>
  </div>
          <Button
            variant="primary"
            className="text-black mt-2"
            onClick={() => {
              // Reset selectors
              setSelectedBuilding("");
              setSelectedFloor("");
              setSelectedRoom("");
              // Reset search
              setSearchQuery("");
              setSearchBy("room_number");
              // Reset filters
              setFilterHasTable(false);
              setFilterHasProjector(false);
            }}
          >
            Clear
        </Button>
</div>


  {/* Table */}
<div style={{ overflowX: "auto", maxHeight: "500px" }}>
  <table className="dashboard-table" style={{ width: "100%", minWidth: "1200px" }}>
    <thead>
      <tr>
        <th>Room Number</th>
        <th>Name</th>
        <th>Description</th>
        <th>Floor</th>
        <th>Building</th>
        <th>Capacity</th>
        <th>Status</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      {roomList
        .filter((r) => {
          // Existing selectors
          if (selectedBuilding && r.building_id !== Number(selectedBuilding)) return false;
          if (selectedFloor && String(r.floor_number) !== selectedFloor) return false;
          if (selectedRoom && r.id !== Number(selectedRoom)) return false;

          // Search logic
          if (searchQuery) {
            const q = searchQuery.toLowerCase();

            switch (searchBy) {
              case "room_number":
                if (!String(r.room_number).toLowerCase().includes(q)) return false;
                break;
              case "room_name":
                if (!r.room_name?.toLowerCase().includes(q)) return false;
                break;
              case "capacity":
                if (!String(r.max_capacity ?? "").includes(q)) return false;
                break;
              case "floor":
                if (!String(r.floor_number).includes(q)) return false;
                break;
              case "building": {
                const buildingName =
                  allBuildings.find((b) => b.id === r.building_id)?.building_name || "";
                if (!buildingName.toLowerCase().includes(q)) return false;
                break;
              }
            }
          }

          // Boolean filters
          if (filterHasTable && !r.has_table) return false;
          if (filterHasProjector && !r.has_projector) return false;

          return true;
        })
        .map((r) => (
          <tr key={r.id} onClick={() => setSelectedRowId(r.id)} className={selectedRowId === r.id ? "highlighted" : ""}>
            <td>{r.room_number}</td>
            <td>{r.room_name}</td>
            <td>
              <div>
                <strong>{r.room_description || "No description"}</strong><br />
                <span style={{ fontSize: "0.9em", color: selectedRowId === r.id ? "#fff" : "#000" }}>
                  {r.chairs ? `${r.chairs} Chair${r.chairs > 1 ? "s" : ""}` : "No Chairs"},
                  TV: {r.has_tv ? "Yes" : "No"} | Tables: {r.has_table ? "Yes" : "No"} | Projector: {r.has_projector ? "Yes" : "No"}
                </span>
              </div>
            </td>
            <td>{r.floor_number}</td>
            <td>{allBuildings.find((b) => b.id === r.building_id)?.building_name || "Unknown"}</td>
            <td>{r.max_capacity || 0} persons</td>
            <td>{r.status === 1 ? "Available" : r.status === 2 ? "Fully Booked" : r.status === 3 ? "Under Maintenance" : "N/A"}</td>
            <td>
              <ActionMenu
                actions={[
                  // Role 1 & 2 and admin: edit, delete, update status
                  ...(isAdmin || [1, 2].includes(userRole)
                    ? [
                        {
                          key: "edit" as ActionKey,
                          title: "Edit Room",
                          onClick: () => {
                            setEditRoom(r);
                            setShowEditModal(true);
                          },
                        },
                        {
                          key: "delete" as ActionKey,
                          title: "Delete Room",
                          onClick: () => handleDeleteRoom(r.id),
                        },
                        {
                          key: "approve" as ActionKey,
                          title: "Update Room Status",
                          onClick: () => {
                            setStatusRoom(r);
                            setShowStatusModal(true);
                          },
                        },
                      ]
                    : []),
                  // Role 1, 2, 3: Reserve action (only if status is available)
                  ...(r.status === 1 && [1, 2, 3].includes(userRole)
                    ? [
                        {
                          key: "book" as ActionKey,
                          title: "Reserve Room",
                          onClick: () => {
                            setSelectedRoom(String(r.id));
                            setShowReservationModal(true);
                          },
                        },
                      ]
                    : []),
                ]}
              />
            </td>
          </tr>
        ))}
    </tbody>
  </table>
</div>
   


 
  

      {/* Modals */}
      {showAddRoomModal && (
        <AddRoomModal
          buildings={allBuildings}
          onClose={() => setShowAddRoomModal(false)}
          onAddRoomSuccess={handleAddRoomSuccess}
        />
      )}

{showBuildingModal && (
  <BuildingModal
    onClose={() => setShowBuildingModal(false)}
    onSuccess={handleBuildingSuccess}
  />
)}



      {showEditModal && editRoom && (
        <EditRoomModal
          room={editRoom}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditSuccess}
        />
      )}

      {showReservationModal && selectedRoom && room && (
        <ReservationModal
          roomId={Number(selectedRoom)}
          building={room.building_name}
          floor={room.floor_number}
          max_capacity={room.max_capacity}
          currentUserId={id}
          roomName={room.room_name}
          roomNumber={room.room_number}
          roomDesc={room.room_description}
          reservedBy={name}
          userRole={userRole}
          chairs={room.chairs}
          has_tv={room.has_tv}
          has_table={room.has_table}
          has_projector={room.has_projector}
          onClose={() => setShowReservationModal(false)}
          onSuccess={() => { setSelectedBuilding(""); setSelectedFloor(""); setSelectedRoom(""); onBookingSuccess?.(); }}
          refreshPendingBookings={refreshPendingBookings}
          refreshMyBookings={refreshMyBookings}
        />
      )}

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

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
