/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/AdminDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import { Button } from "../components/Button";
import type { User, Room } from "../types";
import "../styles/modal.css";
import "../styles/dashboard.css";
import {
  FaCheckCircle,
  FaDoorOpen,
  FaUsers,
  FaCalendarCheck,
  FaTimesCircle,
  FaSignOutAlt,
} from "react-icons/fa";

// Components
import AdminTab from "../components/Dashboard/Tabs/AdminTab";
import RoomsTab from "../components/Dashboard/Tabs/RoomsTab";
import MyBookingsTab from "../components/Dashboard/Tabs/MyBookingsTab";
import MyProfileTab from "../components/Dashboard/Tabs/MyProfileTab";
import ForApprovalTab from "../components/Dashboard/Tabs/ForApprovalTab";
import RejectedTab from "../components/Dashboard/Tabs/RejectedTab";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const roleLabels: Record<number, string> = {
  2: "Staff",
  3: "Reserver",
  4: "Viewer",
};

function Dashboard() {
  const [name, setName] = useState<string>("");
  const [id, setId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<
    "Admin" | "Rooms" | "MyProfile" | "MyBookings" | "ForApproval" | "Rejected"
  >("Rooms");
  const [userRole, setUserRole] = useState<number | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myBookings, setMyBookings] = useState<Room[]>([]);
  const [pendingBookings, setPendingBookings] = useState<Room[]>([]);
  const [rejectedBookings, setRejectedBookings] = useState<Room[]>([]);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [, setCurrentTime] = useState(new Date());
  const [loadingUser, setLoadingUser] = useState(true);
  const metrics = {
  activeUsers: users.length,
  pendingUsers: users.filter(u => u.role === 3).length, // example
  pendingBookings: pendingBookings.length,
  availableRooms: rooms.filter(r => r.status === 1).length,
};


  const navigate = useNavigate();

  // ---------- Clock ----------
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

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
        setId(data.user.id);
        setActiveTab(
          data.user.role === 1 || data.user.role === 2 ? "Admin" : "Rooms"
        );
      } catch (err) {
        console.error("Error fetching user:", err);
        navigate("/login");
      } finally {
        setLoadingUser(false);
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

  // ---------- Fetch my bookings ----------
  const fetchMyBookings = async () => {
    if (!id) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/room_bookings/my-bookings/${id}`,
        { method: "GET", credentials: "include" }
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
    if (id) fetchMyBookings();
  }, [id]);

  // ---------- Fetch pending bookings (ForApprovalTab) ----------
  const fetchPendingBookings = async () => {
    if (!id || !userRole) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/room_bookings/pending?userRole=${userRole}&userId=${id}`,
        { method: "GET", credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch pending bookings");
      const data = await res.json();
      setPendingBookings(data.bookings || []);
    } catch (err) {
      console.error("Error fetching pending bookings:", err);
      setPendingBookings([]);
    }
  };

  useEffect(() => {
    if (id && userRole) fetchPendingBookings();
  }, [id, userRole]);

  // ---------- Fetch rejected bookings ----------
  const fetchRejectedBookings = async () => {
    if (!id || !userRole) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/room_bookings/rejected?userRole=${userRole}&userId=${id}`,
        { method: "GET", credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch rejected bookings");
      const data = await res.json();
      setRejectedBookings(data.bookings || []);
    } catch (err) {
      console.error("Error fetching rejected bookings:", err);
      setRejectedBookings([]);
    }
  };

  useEffect(() => {
    if (id && userRole) fetchRejectedBookings();
  }, [id, userRole]);

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

  // ---------- Role editing ----------
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

      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role: selectedRole } : u))
      );
      setEditingUserId(null);
    } catch (err) {
      console.error("Error updating role:", err);
      alert("Failed to update role. Check console for details.");
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
    return `${startDate.toLocaleTimeString([], options)} - ${endDate.toLocaleTimeString([], options)}`;
  };

  if (loadingUser) return <div>Loading...</div>;

  // ---------- Render ----------
  return (
    <div className={`dashboard-container ${sidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
      {/* Sidebar */}
      <div className="dashboard-sidebar">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          ☰
        </button>
        <img src="/images/logo.png" alt="School Logo" className="login-logo" />
        <ToastContainer position="top-right" autoClose={5000} />

        {/* Admin-only menu options */}
        {userRole && (userRole === 1 || userRole === 2) && (
          <>
            <button
              className={`sidebar-btn ${activeTab === "Admin" ? "active" : ""}`}
              onClick={() => setActiveTab("Admin")}
            >
              <span className="icon"><FaUsers /></span>
              <span className="label">Management Users</span>
            </button>
          </>
        )}

        {/* For Approval menu */}
        {userRole && userRole !== 4 && (
        <button
          className={`sidebar-btn ${activeTab === "ForApproval" ? "active" : ""}`}
          onClick={() => setActiveTab("ForApproval")}
        >
          <span className="icon"><FaCheckCircle /></span>
          <span className="label">For Approval</span>
        </button>
)}
        <button
          className={`sidebar-btn ${activeTab === "Rooms" ? "active" : ""}`}
          onClick={() => setActiveTab("Rooms")}
        >
          <span className="icon"><FaDoorOpen /></span>
          <span className="label">Rooms</span>
        </button>

        <button
          className={`sidebar-btn ${activeTab === "MyBookings" ? "active" : ""}`}
          onClick={() => setActiveTab("MyBookings")}
        >
          <span className="icon"><FaCalendarCheck /></span>
          <span className="label">{userRole === 1 || userRole === 2 ? "All Reservations" : "My Reservations"}</span>
        </button>
{userRole && userRole !== 4 && (
        <button
          className={`sidebar-btn ${activeTab === "Rejected" ? "active" : ""}`}
          onClick={() => setActiveTab("Rejected")}
        >
          <span className="icon"><FaTimesCircle /></span>
          <span className="label">Rejected</span>
        </button>
)}
        <Button className='sidebar-btn' variant="secondary" onClick={handleLogout}>
          <span className="icon"><FaSignOutAlt /></span>
          <span className="label">Log Out</span>
        </Button>
      </div>

      {/* Main content */}
      <div className="dashboard-main">
        <h1 className="flex items-center justify-center">
          Welcome{name && `, ${name}`}
        </h1>

        {/* Tabs */}
        {userRole !== null && activeTab === "Admin" && (userRole === 1 || userRole === 2) && (
          <AdminTab
            users={users}
            editingUserId={editingUserId}
            selectedRole={selectedRole}
            roleLabels={roleLabels}
            handleEditClick={handleEditClick}
            handleSaveRole={handleSaveRole}
            setSelectedRole={setSelectedRole}
            setActiveTab = {setActiveTab}
            currentUserRole={userRole}
          />
        )}

        {userRole !== null && activeTab === "ForApproval" && (userRole !=  4) && (
          <ForApprovalTab
            pendingBookings={pendingBookings}
            refreshPendingBookings={fetchPendingBookings}
            userRole={userRole}
            currentUserId={id}
          />
        )}

        {userRole !== null && activeTab === "Rooms" && (
          <RoomsTab
            rooms={rooms}
            userRole={userRole}
            name={name}
            id={id}
            onBookingSuccess={fetchMyBookings}
            formatDate={formatDate}
            formatTime={formatTime}
            refreshPendingBookings={fetchPendingBookings}
            refreshMyBookings={fetchMyBookings}
              metrics={metrics} // pass metrics here
    setActiveTab={setActiveTab} // so cards can switch tab
          />
        )}

        {activeTab === "MyProfile" && <MyProfileTab />}

        {userRole !== null && activeTab === "MyBookings" && (
          <MyBookingsTab
            myBookings={myBookings}
            cancelingId={cancelingId}
            cancelReservation={cancelReservation}
            formatDate={formatDate}
            formatTime={formatTime}
            userRole={userRole}
            refreshMyBookings={fetchMyBookings}
            currentUserId={id}
          />
        )}

        {userRole !== null && activeTab === "Rejected" && (userRole !=  4) && (
          <RejectedTab
            rejectedBookings={rejectedBookings}
            userRole={userRole}
          />
        )}
      </div>
    </div>
  );
}

export default Dashboard;
