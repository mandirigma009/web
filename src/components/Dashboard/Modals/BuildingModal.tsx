/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import type { Building } from "../../../types";
import ActionMenu from "../../ActionMenu";
import type { ActionKey } from "../../../utils/actionStyles";

interface Props {
  onClose: () => void;
  onSuccess: (building: Building, action: "add" | "update" | "delete") => void;
}

export default function BuildingModal({ onClose, onSuccess }: Props) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [nameInput, setNameInput] = useState("");
  const [mode, setMode] = useState<"view" | "add" | "edit">("view");
  const [dropdownTouched, setDropdownTouched] = useState(false);


  const selectedBuilding = buildings.find((b) => b.id === selectedId);

  /* Fetch buildings */
  const fetchBuildings = () => {
    fetch("/api/buildings")
      .then((res) => res.json())
      .then(setBuildings)
      .catch(console.error);
  };

  useEffect(() => {
    fetchBuildings();
  }, []);

  /* Sync name on select */
  useEffect(() => {
    if (selectedBuilding) {
      setNameInput(selectedBuilding.building_name);
      setMode("view");
    } else if (mode === "view") {
      setNameInput("");
    }
  }, [selectedBuilding]);


  const isDuplicateName = (name: string) => {
  const normalized = name.trim().toLowerCase();

  return buildings.some(
    (b) =>
      b.building_name.trim().toLowerCase() === normalized &&
      b.id !== selectedId // allow same record when editing
  );
};


const save = async () => {
  const trimmedName = nameInput.trim();

  if (!trimmedName) {
    alert("Building name is required");
    return;
  }

  if (isDuplicateName(trimmedName)) {
    alert(`Building "${trimmedName}" already exists.`);
    return;
  }

  const res = await fetch(
    mode === "add" ? "/api/buildings" : `/api/buildings/${selectedId}`,
    {
      method: mode === "add" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ building_name: trimmedName }),
    }
  );

  if (!res.ok) return alert("Failed to save");

  const saved: Building = await res.json();

  setBuildings((prev) =>
    mode === "add"
      ? [...prev, saved]
      : prev.map((b) => (b.id === saved.id ? saved : b))
  );

  onSuccess(saved, mode === "add" ? "add" : "update");
   setDropdownTouched(false);
  setSelectedId(saved.id);
  setMode("view");
  setNameInput("");
};




  /* Delete building */
  const remove = async () => {
    if (!selectedId) return;
    if (!confirm("Delete this building?")) return;

    const res = await fetch(`/api/buildings/${selectedId}`, {
      method: "DELETE",
    });

    if (!res.ok) return alert("Delete failed");

    setBuildings((prev) => prev.filter((b) => b.id !== selectedId));
    onSuccess(selectedBuilding!, "delete");
    setDropdownTouched(false);

    setSelectedId("");
    setNameInput("");
    setMode("view");
  };

  /* Action Menu Config */
  const actions = [
    ...(selectedBuilding && mode === "view"
      ? [
          {
            key: "edit" as ActionKey,
            title: "Edit Building",
            onClick: () => setMode("edit"),
          },
          {
            key: "delete" as ActionKey,
            title: "Delete Building",
            onClick: remove,
          },
        ]
      : []),

    ...(mode === "edit" || mode === "add"
      ? [
          {
            key: "save" as ActionKey,
            title: "OK",
            onClick: save,
          },
          {
            key: "cancel" as ActionKey,
            title: "Cancel",
            onClick: () => {
              setMode("view");
              setNameInput(selectedBuilding?.building_name || "");
              setDropdownTouched(false);

            },
          },
        ]
      : []),


  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content relative bg-white rounded shadow-md max-w-md mx-auto p-6">
        <button onClick={onClose} className="modal-close-btn">
          Close
        </button>

        <h3 className="mb-4 text-lg font-semibold">Manage Buildings1</h3>

        {/* Building Dropdown */}
        <label>Buildings</label>
        <select
            className="border rounded px-2 py-2 w-full"
            value={selectedId}
            onChange={(e) => {
              setDropdownTouched(true);
              setSelectedId(Number(e.target.value));
            }}
            onFocus={() => setDropdownTouched(true)}
            disabled={mode === "add"}
          >
            <option value="">-- Select Building --</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.building_name}
              </option>
            ))}
        </select>


        {mode === "view" && !dropdownTouched && (
          <div className="mt-2">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setMode("add");
                setSelectedId("");
                setNameInput("");
                setDropdownTouched(false);
              }}
            >
              + Add Building
            </button>
          </div>
        )}


        {/* Input field only visible in add or edit mode */}
        {(mode === "edit" || mode === "add") && (
          <div className="mt-4">
            <label>Building Name</label>
            <input
              className="border rounded px-2 py-2 w-full"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter building name"
              autoFocus
            />
          </div>
        )}

        <div className="flex justify-end mt-4">
          <ActionMenu actions={actions} />
        </div>
      </div>
    </div>
  );
}
