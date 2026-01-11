// src/components/Dashboard/AdminTab.tsx
import { useState, useEffect, useRef } from "react";
import type { User } from "../../../types";
import "../../../styles/modal.css";
import "../../../styles/dashboard.css";
import AddUserModal from "../Modals/AddUserModal";
import ActionMenu from "../../ActionMenu";
import type { ActionKey } from "../../../utils/actionStyles";
import { FaPlus } from "react-icons/fa";

interface AdminTabProps {
  users?: User[];
  editingUserId: number | null;
  selectedRole: number;
  handleEditClick: (user: User) => void;
  handleSaveRole: (id: number) => void;
  setSelectedRole: (role: number) => void;
  currentUserRole: number; // Current logged-in user's role
  roleLabels: Record<number, string>;
}

export default function AdminTab({ currentUserRole, roleLabels }: AdminTabProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [localUsers, setLocalUsers] = useState<User[]>([]);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setLocalUsers(data.users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

  // Delete user
  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      alert("User deleted!");
      fetchUsers();
      setSelectedRowId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete user");
    }
  };

  // Activate user
  const handleActivateUser = async (userId: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/users/${userId}/activate`, { method: "PUT" });
      if (!res.ok) throw new Error("Failed to activate user");
      alert("User activated!");
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert("Error activating user");
    }
  };

  // Reject user
const handleRejectUser = async (userId: number) => {
  try {
    const res = await fetch(`http://localhost:5000/api/users/${userId}/reject`, {
      method: "PUT",
    });
    if (!res.ok) throw new Error("Failed to reject user");
    fetchUsers();
  } catch (err) {
    console.error(err);
    alert("Failed to reject user");
  }
};




  // Save role immediately when changed
  const handleSaveRole = async (userId: number, newRole: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error("Failed to update role");

      // Update local state immediately
      setLocalUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user))
      );
    } catch (err) {
      console.error(err);
      alert("Error updating role");
    }
  };

  return (
    <div ref={dropdownRef}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>User Management</h2>
        {currentUserRole === 1 && (
          <button className="primary" onClick={() => setShowAddModal(true)}>
            <FaPlus />
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
            <th>Verified</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {localUsers.map((u) => (
            <tr
              key={u.id}
              onClick={() => setSelectedRowId(u.id)}
              className={selectedRowId === u.id ? "highlighted" : ""}
            >
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                {currentUserRole === 1 ? (
                  <select
                    value={u.role}
                    onChange={async (e) => {
                      const newRole = Number(e.target.value);
                      await handleSaveRole(u.id, newRole);
                    }}
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
              <td>{Number(u.verified) === 1 ? "Yes" : "No"}</td>

                <td className="text-center">
                  {u.status === "pending" && (
                    <div className="flex flex-col items-center gap-2">
                      <span className="font-semibold text-orange-600">Pending</span>

                      {(currentUserRole === 1 || currentUserRole === 2) && (
                       <ActionMenu
                          actions={[
                            {
                              key: "approve" as ActionKey,
                              title: "Activate User",
                              onClick: () => handleActivateUser(u.id),
                            },
                            {
                              key: "reject" as ActionKey,
                              title: "Reject User",
                              onClick: () => handleRejectUser(u.id),
                            },
                          ]}
                        />

                      )}
                    </div>
                  )}

                  {u.status === "active" && (
                    <div className="flex justify-center">
                      <span className="font-semibold text-green-600">Active</span>
                    </div>
                  )}

                  {u.status === "rejected" && (
                    <div className="flex flex-col items-center gap-2">
                      <span className="font-semibold text-red-600">Rejected</span>

                      {(currentUserRole === 1 || currentUserRole === 2) && (
                        <ActionMenu
                          actions={[
                            {
                              key: "approve" as ActionKey,
                              title: "Activate User",
                              onClick: () => handleActivateUser(u.id),
                            },
                          ]}
                        />

                      )}
                    </div>
                  )}
                </td>



            <td>
             <ActionMenu
                actions={[
                  {
                    key: "delete" as ActionKey,
                    title: "Delete User",
                    onClick: async () => {
                      await handleDeleteUser(u.id);
                      setSelectedRowId(null);
                    },
                  },
                ]}
              />

          </td>

            </tr>
          ))}
        </tbody>
      </table>

      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} onSuccess={fetchUsers} />}
    </div>
  );
}
