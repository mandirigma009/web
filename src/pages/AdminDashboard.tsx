// src/pages/AdminDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import { Button } from "../components/Button";
import type { User, Room } from "../types";

// Components
import AdminTab from "../components/Dashboard/AdminTab";
import RoomsTab from "../components/Dashboard/RoomsTab";
import MyBookingsTab from "../components/Dashboard/MyBookingsTab";
import MyProfileTab from "../components/Dashboard/MyProfileTab";
import BookingModal from "../components/Dashboard/BookingModal";
import AddRoomModal from "../components/Dashboard/AddRoomModal";

const roleLabels: Record<number, string> = {
  1: "Admin",
  2: "Staff",
  3: "Reserver",
  4: "Viewer",
};

function Dashboard() {
  const [name, setName] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<
    "Admin" | "Rooms" | "MyProfile" | "MyBookings"
  >("Rooms");
  const [userRole, setUserRole] = useState<number | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");

  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoom, setNewRoom] = useState({
    room_number: "",
    room_name: "",
    room_description: "",
    building_name: "",
    floor_number: 1,
  });

  const [myBookings, setMyBookings] = useState<Room[]>([]);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  const navigate = useNavigate();

  // ---------- Fetch logged-in user ----------
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/me", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) {
          navigate("/login");
          return;
        }
        const data = await res.json();
        setName(data.user.name);
        setUserRole(data.user.role);
        setActiveTab(data.user.role === 1 || data.user.role === 2 ? "Admin" : "Rooms");
      } catch (err) {
        console.error("Error fetching user:", err);
        navigate("/login");
      }
    };
    fetchUser();
  }, [navigate]);

  // ---------- Fetch users (admin only) ----------
  useEffect(() => {
    const fetchUsers = async () => {
      if (userRole && (userRole === 1 || userRole === 2)) {
        try {
          const res = await fetch("http://localhost:5000/api/users", {
            method: "GET",
            credentials: "include",
          });
          if (!res.ok) throw new Error("Failed to fetch users");
          const data = await res.json();
          setUsers(data.users || []);
        } catch (err) {
          console.error("Error fetching users:", err);
        }
      }
    };
    fetchUsers();
  }, [userRole]);

  // ---------- Fetch rooms (includes auto-cancel) ----------
  const fetchRooms = async () => {
    try {
      // trigger backend auto-cancel of expired reservations
      await fetch("http://localhost:5000/api/rooms/auto-cancel", {
        method: "POST",
        credentials: "include",
      });

      const res = await fetch("http://localhost:5000/api/rooms", {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch rooms");
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      setRooms([]);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Update myBookings whenever rooms or name changes
  useEffect(() => {
    setMyBookings(rooms.filter((room) => room.reserved_by === name && room.status === 2));
  }, [rooms, name]);

  // ---------- Logout ----------
  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setName("");
      navigate("/login");
    }
  };

  // ---------- Role editing handlers ----------
  const handleEditClick = (user: User) => {
    setEditingUserId(user.id);
    setSelectedRole(user.role);
  };

  const handleSaveRole = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/users/${id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!res.ok) throw new Error("Failed to update role");

      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: selectedRole } : u)));
      setEditingUserId(null);
    } catch (err) {
      console.error("Error updating role:", err);
      alert("Failed to update role. Check console for details.");
    }
  };

  // ---------- Booking modal handlers ----------
  const openBookingModal = (room: Room) => {
    setSelectedRoom(room);
    setShowBookingModal(true);
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setSelectedRoom(null);
    setDate("");
    setStartTime("");
    setEndTime("");
    setNotes("");
  };

  // Submit booking with same validations as original
  const submitBooking = async () => {
    if (!selectedRoom) return;

    if (!date) {
      alert("Please select a date.");
      return;
    }

    const today = new Date();
    const selectedDate = new Date(date);
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      alert("You cannot book a past date.");
      return;
    }

    if (!startTime || !endTime) {
      alert("Please select both start and end times.");
      return;
    }

    if (endTime <= startTime) {
      alert("End time must be after start time.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/rooms/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          roomId: selectedRoom.id,
          date,
          startTime,
          endTime,
          notes,
          reserved_by: name,
        }),
      });

      if (!res.ok) throw new Error("Booking failed");

      await fetchRooms();
      closeBookingModal();
    } catch (err) {
      console.error("Error booking room:", err);
      alert("Booking failed. Please try again.");
    }
  };

  // ---------- Add room ----------
  const handleAddRoom = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newRoom),
      });

      if (!res.ok) throw new Error("Failed to add room");

      await fetchRooms();
      setShowAddRoomModal(false);
      setNewRoom({
        room_number: "",
        room_name: "",
        room_description: "",
        building_name: "",
        floor_number: 1,
      });
    } catch (err) {
      console.error("Error adding room:", err);
      alert("Failed to add room. Check console for details.");
    }
  };

  // ---------- Cancel reservation ----------
  const cancelReservation = async (roomId: number) => {
    setCancelingId(roomId);
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Cancel failed response:", text);
        throw new Error("Cancel failed");
      }

      await fetchRooms();
    } catch (err) {
      console.error("Error canceling booking:", err);
      alert("Failed to cancel booking. Please check the console for details.");
    } finally {
      setCancelingId(null);
    }
  };

  // ---------- Helpers ----------
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
      .getDate()
      .toString()
      .padStart(2, "0")}-${d.getFullYear()}`;
  };

  const formatTime = (start: string, end: string, dateStr: string) => {
    const dateObj = new Date(dateStr);

    const [startHour, startMin] = start.split(":");
    const [endHour, endMin] = end.split(":");

    const startDate = new Date(dateObj);
    startDate.setHours(Number(startHour), Number(startMin));

    const endDate = new Date(dateObj);
    endDate.setHours(Number(endHour), Number(endMin));

    const options: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    return `${startDate.toLocaleTimeString([], options)} - ${endDate.toLocaleTimeString(
      [],
      options
    )}`;
  };

  // ---------- Render ----------
  return (
    <div>
      {/* Sidebar */}
      <div className="dashboard-sidebar">
        <h2>This is Cleaned Dashboard </h2>

        {userRole && (userRole === 1 || userRole === 2) && (
          <button
            className={activeTab === "Admin" ? "active" : ""}
            onClick={() => setActiveTab("Admin")}
          >
            Admin
          </button>
        )}

        <button
          className={activeTab === "Rooms" ? "active" : ""}
          onClick={() => setActiveTab("Rooms")}
        >
          Rooms
        </button>

        <button
          className={activeTab === "MyBookings" ? "active" : ""}
          onClick={() => setActiveTab("MyBookings")}
        >
          My Bookings
        </button>

        <button
          className={activeTab === "MyProfile" ? "active" : ""}
          onClick={() => setActiveTab("MyProfile")}
        >
          My Profile
        </button>

        <Button variant="secondary" onClick={handleLogout}>
          Log Out
        </Button>
      </div>

      {/* Main content */}
      <div className="dashboard-main">
        <h1 className="flex items-center justify-center ">
          Welcome{name && `, ${name}`}
        </h1>

        {/* Admin Tab */}
        {activeTab === "Admin" && userRole && (userRole === 1 || userRole === 2) && (
          <AdminTab
            users={users}
            editingUserId={editingUserId}
            selectedRole={selectedRole}
            roleLabels={roleLabels}
            handleEditClick={handleEditClick}
            handleSaveRole={handleSaveRole}
            setSelectedRole={setSelectedRole}
          />
        )}

        {/* Rooms Tab */}
        {activeTab === "Rooms" && (
          <RoomsTab
            rooms={rooms}
            userRole={userRole}
            openBookingModal={openBookingModal}
            setShowAddRoomModal={setShowAddRoomModal}
            formatDate={formatDate}
            formatTime={formatTime}
          />
        )}

        {/* My Profile Tab */}
        {activeTab === "MyProfile" && <MyProfileTab />}

        {/* My Bookings Tab */}
        {activeTab === "MyBookings" && (
          <MyBookingsTab
            myBookings={myBookings}
            cancelingId={cancelingId}
            cancelReservation={cancelReservation}
            formatDate={formatDate}
            formatTime={formatTime}
          />
        )}

        {/* Booking Modal */}
        {showBookingModal && selectedRoom && (
          <BookingModal
            selectedRoom={selectedRoom}
            date={date}
            startTime={startTime}
            endTime={endTime}
            notes={notes}
            setDate={setDate}
            setStartTime={setStartTime}
            setEndTime={setEndTime}
            setNotes={setNotes}
            submitBooking={submitBooking}
            closeBookingModal={closeBookingModal}
          />
        )}

        {/* Add Room Modal */}
        {showAddRoomModal && (
          <AddRoomModal
            newRoom={newRoom}
            setNewRoom={setNewRoom}
            handleAddRoom={handleAddRoom}
            setShowAddRoomModal={setShowAddRoomModal}
          />
        )}
      </div>
    </div>
  );
}

export default Dashboard;
