/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/Dashboard/AdminTab.tsx
import { useEffect, useRef, useState } from "react";
import type { User } from "../../../types";
import "../../../styles/modal.css";
import "../../../styles/dashboard.css";
import AddUserModal from "../Modals/AddUserModal";
import ActionMenu from "../../ActionMenu";
import type { ActionKey } from "../../../utils/actionStyles";

interface AdminTabProps {
  currentUserRole: number;
  roleLabels: Record<number, string>;
  setActiveTab: (tab: "Admin" | "Rooms" | "ForApproval" | "Rejected") => void;
  id: number | null;
}





interface AdminMetrics {
  activeUsers: number;
  pendingUsers: number;
  pendingBookings: number;
  availableRooms: number;
}

export default function AdminTab({
  currentUserRole,
  roleLabels,
  setActiveTab,
  id,
}: AdminTabProps) {

  const dropdownRef = useRef<HTMLDivElement>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [metrics, setMetrics] = useState<AdminMetrics>({
    activeUsers: 0,
    pendingUsers: 0,
    pendingBookings: 0,
    availableRooms: 0,
  });

  // ------------------ Fetch Users ------------------
  const fetchUsers = async () => {
    try {
      const res = await fetch(" /api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  // ------------------ Fetch Metrics ------------------
  const fetchAdminMetrics = async () => {
    try {
      const res = await fetch(` /api/admin/metrics?userRole=${currentUserRole}&userId=${id}`, {
  credentials: "include",
});

      if (!res.ok) throw new Error("Failed to fetch admin metrics");
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      console.error("Error fetching admin metrics:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAdminMetrics();
    const interval = setInterval(fetchAdminMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  // ------------------ Outside Click ------------------
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSelectedRowId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ------------------ User Actions ------------------
  const handleDeleteUser = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    fetchUsers();
  };

  const handleActivateUser = async (id: number) => {
    await fetch(`/api/users/${id}/activate`, { method: "PUT" });
    fetchUsers();
    fetchAdminMetrics();
  };

  const handleRejectUser = async (id: number) => {
    await fetch(`/api/users/${id}/reject`, { method: "PUT" });
    fetchUsers();
    fetchAdminMetrics();
  };

  const handleSaveRole = async (id: number, role: number) => {
    await fetch(`/api/users/${id}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    fetchUsers();
  };

  // ------------------ Metric Cards ------------------
  const metricCards = [
    { label: "Active Users", value: metrics.activeUsers, tab: "Admin" },
    { label: "Pending Reservations", value: metrics.pendingBookings, tab: "ForApproval" },
    { label: "Available Rooms", value: metrics.availableRooms, tab: "Rooms" },
    { label: "Pending User Approvals", value: metrics.pendingUsers, tab: "Admin" },
  ];

  return (
    <div ref={dropdownRef}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2>User Management</h2>
        {currentUserRole === 1 && (
          <button className="primary" onClick={() => setShowAddModal(true)}>
            Add User
          </button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="dashboard-metrics-grid">
        {metricCards.map((m, i) => (
          <div
            key={i}
            className="metric-card"
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (m.tab) setActiveTab(m.tab as any); // <-- call parent to switch tab
            }}
          >
            <h4>{m.label}</h4>
            <strong>{m.value}</strong>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Verified</th>
            <th>Status</th>
            <th />
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
                {currentUserRole === 1 ? (
                  <select
                    value={u.role}
                    onChange={(e) => handleSaveRole(u.id, Number(e.target.value))}
                  >
                    {Object.entries(roleLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                ) : (
                  roleLabels[u.role]
                )}
              </td>
              <td>{u.verified ? "Yes" : "No"}</td>
              <td>{u.status}</td>
              <td>

                  <ActionMenu
                    actions={
                      [
                        // Pending → Activate
                        u.status === "pending" && {
                          key: "approve" as ActionKey,
                          title: "Activate",
                          onClick: () => handleActivateUser(u.id),
                        },

                        // Pending → Reject
                        u.status === "pending" && {
                          key: "reject" as ActionKey,
                          title: "Re-Approve",
                          onClick: () => handleRejectUser(u.id),
                        },

                        // Rejected → Accept again
                        u.status === "rejected" && {
                          key: "approve" as ActionKey,
                          title: "Accept",
                          onClick: () => handleActivateUser(u.id),
                        },

                        // Always → Delete
                        {
                          key: "delete" as ActionKey,
                          title: "Delete",
                          onClick: () => handleDeleteUser(u.id),
                        },
                      ].filter(
                        (a): a is { key: ActionKey; title: string; onClick: () => Promise<void> } =>
                          Boolean(a)
                      )
                    }
                  />


              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchUsers();
            fetchAdminMetrics();
          }}
        />
      )}
    </div>
  );
}
