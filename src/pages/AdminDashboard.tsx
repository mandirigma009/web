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

  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoom, setNewRoom] = useState({
    room_number: "",
    room_name: "",
    room_description: "",
    building_name: "",
    floor_number: 1,
  });

  // ✅ now fetched from room_bookings table
  const [myBookings, setMyBookings] = useState<Room[]>([]);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // update every second

    return () => clearInterval(interval); // cleanup on unmount
  }, []);



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

  // ---------- Fetch rooms ----------
  const fetchRooms = async () => {
    try {
      // trigger backend auto-cancel of expired reservations


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

  

  // ---------- Fetch my bookings directly from room_bookings table ----------
 
    const fetchMyBookings = async () => {
 
      try {
             {/* 
                     1. Send current time to backend for auto-cancel
                    await fetch("http://localhost:5000/api/room_bookings/auto-cancel", {
                      method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",

                    body: JSON.stringify({ 
                      currentDateTime: currentTime.toLocaleString("sv-SE", { hour12: false }) 
                      produces "2025-10-06 10:21:43"
                    }),
                  });   
            */}
        const res = await fetch(
          `http://localhost:5000/api/room_bookings/my-bookings/${name}`,
          {
            method: "GET",
            credentials: "include",
          }
        );
        if (!res.ok) throw new Error("Failed to fetch bookings");
        const data = await res.json();
        setMyBookings(data.bookings || []);
      } catch (err) {
        console.error("Error fetching my bookings:", err);
        setMyBookings([]);
      }
    };
 useEffect(() => {
    fetchMyBookings();
  }, [name]);

  
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
const cancelReservation = async (id: number) => {
  try {
    setCancelingId(id);
    const res = await fetch(`http://localhost:5000/api/room_bookings/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Cancel failed");

    // Remove the canceled booking from state
    setMyBookings((prev) => prev.filter((b) => b.id !== id));
    setCancelingId(null);
  } catch (err) {
    console.error("Error canceling booking:", err);
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
//console.log(" Current Time :" + currentTime.toLocaleTimeString())
  // ---------- Render ----------
  return (
    <div>
      {/* Sidebar */}
      <div className="dashboard-sidebar">
         <img src="/images/logo.jpg" alt="School Logo" className="login-logo" />
        {/* Display current date and time */}
    {/*<p>
      Current Time: {currentTime.toLocaleTimeString()} <br />
        Current Date: {currentTime.toLocaleDateString()}
      </p>
    */}
  <p>
    </p>

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
            name={name}
             onBookingSuccess={fetchMyBookings} // ✅ refresh MyBookings after reservation
            openBookingModal={BookingModal}
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
