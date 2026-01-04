/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/Dashboard/AddUserModal.tsx
import { useState } from "react";
import { Button } from "../../Button";

interface AddUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddUserModal({ onClose, onSuccess }: AddUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const generatePassword = (length = 8) => {
        const lowercase = "abcdefghijklmnopqrstuvwxyz";
        const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const numbers = "0123456789";
        const special = "!@#$%^&*()";

        if (length < 8) length = 8; // enforce minimum length

        // pick at least 1 from each category
        const getRandom = (chars: string) => chars[Math.floor(Math.random() * chars.length)];

        const passwordChars = [
          getRandom(lowercase),
          getRandom(uppercase),
          getRandom(numbers),
          getRandom(special),
        ];

        // fill the rest randomly
        const allChars = lowercase + uppercase + numbers + special;
        for (let i = passwordChars.length; i < length; i++) {
          passwordChars.push(getRandom(allChars));
        }

        // shuffle to avoid predictable pattern
        for (let i = passwordChars.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
        }

        return passwordChars.join("");
  };


  const handleSubmit = async () => {
    if (!name || !email) {
      alert("Name and Email are required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password: generatePassword(),
          role: 3, // ✅ default role for Add User
         isAdminCreated: true, 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      onSuccess(); // ✅ trigger refresh
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

        <div className="modal-actions">
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
