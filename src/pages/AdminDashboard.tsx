import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";

interface User {
  id: number;
  name: string;
  email: string;
  role: number;
}

// Define role mapping once
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
  const navigate = useNavigate();

  // Fetch logged-in user
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
      } catch (err) {
        console.error("Error fetching user:", err);
        navigate("/login");
      }
    };

    fetchUser();
  }, [navigate]);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/users", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch users");

        const data = await res.json();
        setUsers(data.users);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };

    fetchUsers();
  }, []);

  const handleLogout = async () => {
    await fetch("http://localhost:5000/api/logout", {
      method: "POST",
      credentials: "include",
    });

    setName("");
    navigate("/login");
  };

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

      const text = await res.text();
      console.log("Response text:", text);

      if (!res.ok) throw new Error("Failed to update role");

      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role: selectedRole } : u))
      );
      setEditingUserId(null);
    } catch (err) {
      console.error("Error updating role:", err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="flex items-center justify-center text-xl font-bold mb-4">
        Welcome to Admin's Dashboard {name && `, ${name}`}
      </h1>

      <Button variant="secondary" onClick={handleLogout}>
        Log Out
      </Button>

      <h2 className="text-lg font-semibold mt-6 mb-2">User Management</h2>

      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">ID</th>
            <th className="border p-2">Name</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Role</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td className="border p-2">{u.id}</td>
              <td className="border p-2">{u.name}</td>
              <td className="border p-2">{u.email}</td>
              <td className="border p-2">
                {editingUserId === u.id ? (
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(Number(e.target.value))}
                    className="border rounded p-1"
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
              <td className="border p-2">
                {editingUserId === u.id ? (
                  <Button variant="primary" onClick={() => handleSaveRole(u.id)}>
                    Save
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => handleEditClick(u)}>
                    Edit Role
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Dashboard;
