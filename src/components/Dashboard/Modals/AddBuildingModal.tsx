import { useState } from "react";
import { Button } from "../../Button";
import type { Building } from "../../../types";

interface Props {
  onClose: () => void;
  onSuccess: (building: Building) => void;
}

export default function AddBuildingModal({ onClose, onSuccess }: Props) {
  const [building_name, setBuildingName] = useState("");

  const save = async () => {
    if (!building_name.trim()) {
      alert("Building name is required");
      return;
    }

    const res = await fetch("/api/buildings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ building_name }),
    });

    if (!res.ok) {
      alert("Failed to add building");
      return;
    }

    const saved = await res.json();
    onSuccess(saved);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Add Building</h3>

        <label>Building Name *</label>
        <input value={building_name} onChange={(e) => setBuildingName(e.target.value)} />

        <div className="flex justify-between mt-4">
          <Button variant="primary" onClick={save}>Save</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
