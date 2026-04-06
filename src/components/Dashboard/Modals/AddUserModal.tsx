/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Button } from "../../Button";

interface AddUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Department {
  id: number;
  name: string;
}

export default function AddUserModal({ onClose, onSuccess }: AddUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await fetch("/api/departments");
        const text = await res.text();

        if (!res.ok) {
          throw new Error(text || "Failed to load departments");
        }

        const data = JSON.parse(text);
        setDepartments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch departments:", err);
        alert("Failed to load departments");
      }
    };

    loadDepartments();
  }, []);

  const generatePassword = (length = 8) => {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const special = "!@#$%^&*()";

    const getRandom = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
    const passwordChars = [
      getRandom(lowercase),
      getRandom(uppercase),
      getRandom(numbers),
      getRandom(special),
    ];

    const allChars = lowercase + uppercase + numbers + special;
    while (passwordChars.length < length) {
      passwordChars.push(getRandom(allChars));
    }

    for (let i = passwordChars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
    }

    return passwordChars.join("");
  };

  const handleSubmit = async () => {
    if (!name || !email || !departmentId) {
      alert("Name, Email, and Department are required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password: generatePassword(),
          role: 3,
          department_id: Number(departmentId),
          isAdminCreated: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add user");

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Add User</h3>

        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />

        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />

        <label>Department</label>
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">Select Department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <div style={{ marginTop: "15px", display: "flex", justifyContent: "space-between" }}>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
          <Button variant="secondary" className="btn-cancel" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}