
// src/components/Dashboard/AdminTab.tsx
import type { User } from "../../types";
import { Button } from "../Button";

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
  return (
    <div>
      <h2>User Management</h2>
      <table className="dashboard-table">
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
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                {editingUserId === u.id ? (
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(Number(e.target.value))}
                  >
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                ) : (
                  roleLabels[u.role] || "Unknown"
                )}
              </td>
              <td>
                {editingUserId === u.id ? (
                  <Button variant="primary" onClick={() => handleSaveRole(u.id)}>Save</Button>
                ) : (
                  <Button variant="primary" onClick={() => handleEditClick(u)}>Edit Role</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
