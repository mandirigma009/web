// src/components/Dashboard/AdminTab.tsx
import { useState, useEffect, useRef } from "react";
import type { User } from "../../../types";
import "../../../styles/modal.css";
import "../../../styles/dashboard.css";

interface AdminTabProps {
  users: User[];
  editingUserId: number | null;
  selectedRole: number;
  roleLabels: Record<number, string>;
  handleEditClick: (user: User) => void;
  handleSaveRole: (id: number) => void;
  setSelectedRole: (role: number) => void;
}

export default function AdminTab({
  users,
  editingUserId,
  selectedRole,
  roleLabels,
  handleEditClick,
  handleSaveRole,
  setSelectedRole,
}: AdminTabProps) {

  const dropdownRef = useRef<HTMLDivElement>(null);
    const [selectedRowId, setSelectedRowId] = useState<number | null>(null);


    //outside click
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



  // Unhighlight row when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setSelectedRowId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

 // Delete user
const handleDeleteUser = async (userId: number) => {
  console.log("Attempting to delete user with ID:", userId); // 🔹 added log

  if (!confirm("Are you sure you want to delete this user?")) return;

  try {
    const res = await fetch(`http://localhost:5000/api/users/${userId}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete user");

    alert("User deleted!");

    // Remove user from local state
    const index = users.findIndex((u) => u.id === userId);
    if (index !== -1) {
      users.splice(index, 1);
    }

    setSelectedRowId(null);
  } catch (err) {
    console.error(err);
    alert("Failed to delete user");
  }
};

//--------------------------
  return (
    <div ref={dropdownRef}>
      <h2>User Management</h2>
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
    </div>
  );
}
