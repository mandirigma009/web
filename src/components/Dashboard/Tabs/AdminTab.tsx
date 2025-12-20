// src/components/Dashboard/AdminTab.tsx
import { useState, useEffect, useRef } from "react";
import type { User } from "../../../types";
import "../../../styles/modal.css";
import "../../../styles/dashboard.css";
import AddUserModal from "../Modals/AddUserModal";

interface AdminTabProps {
  users: User[];
  currentUserRole: number; // Added to check if current user is admin
  editingUserId: number | null;
  selectedRole: number;
  roleLabels: Record<number, string>;
  handleEditClick: (user: User) => void;
  handleSaveRole: (id: number) => void;
  setSelectedRole: (role: number) => void;

}

export default function AdminTab({
  users,
  currentUserRole,
  editingUserId,
  selectedRole,
  roleLabels,
  handleEditClick,
  handleSaveRole,
  setSelectedRole,

}: AdminTabProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
   const [localUsers, setLocalUsers] = useState<User[]>(users);

  // Outside click to unhighlight
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSelectedRowId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete user");

      alert("User deleted!");

      // Refresh user list
   users.filter((u) => u.id !== userId);
      setSelectedRowId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete user");
    }
  };

    const fetchUsers = async () => {
    const res = await fetch("http://localhost:5000/api/users");
    const data = await res.json();
    setLocalUsers(data);
  };

  return (
    <div ref={dropdownRef}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>User Management</h2>
        {currentUserRole === 1 && (
          <button className="primary" onClick={() => setShowAddModal(true)}>
            Add User
          </button>
        )}
      </div>

      <table id="my-bookings-table" className="dashboard-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr
              key={u.id}
              onClick={() => setSelectedRowId(u.id)}
              className={selectedRowId === u.id ? "highlighted" : ""}
            >
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                {editingUserId === u.id ? (
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(Number(e.target.value))}
                  >
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : (
                  roleLabels[u.role] || "Unknown"
                )}
              </td>
              <td>
                <select
                  className="border rounded px-2 py-1"
                  onClick={() => setSelectedRowId(u.id)}
                  onChange={async (e) => {
                    const action = e.target.value;

                    if (action === "edit") {
                      handleEditClick(u);
                      setSelectedRowId(u.id);
                    } else if (action === "save") {
                      await handleSaveRole(u.id);
                      setSelectedRowId(null);
                    } else if (action === "delete") {
                      await handleDeleteUser(u.id);
                    }

                    e.target.value = ""; // reset dropdown
                  }}
                  defaultValue=""
                >
                  <option value="">-- Select Action --</option>
                  {editingUserId === u.id ? (
                    <option value="save">Save</option>
                  ) : (
                    <option value="edit">Edit Role</option>
                  )}
                  <option value="delete">Delete User</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchUsers} // ✅ refresh table
        />
      )}
    </div>
  );
}
