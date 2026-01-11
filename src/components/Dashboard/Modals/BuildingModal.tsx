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

  const selectedBuilding = buildings.find((b) => b.id === selectedId);

  /* Fetch buildings */
  useEffect(() => {
    fetch("/api/buildings")
      .then((res) => res.json())
      .then(setBuildings)
      .catch(console.error);
  }, []);

  /* Sync name on select */
  useEffect(() => {
    if (selectedBuilding) {
      setNameInput(selectedBuilding.building_name);
      setMode("view");
    }
  }, [selectedBuilding]);

  /* Save */
  const save = async () => {
    if (!nameInput.trim()) return alert("Building name is required");

    const res = await fetch(
      mode === "add" ? "/api/buildings" : `/api/buildings/${selectedId}`,
      {
        method: mode === "add" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ building_name: nameInput }),
      }
    );

    if (!res.ok) return alert("Failed to save");

    const saved = await res.json();

    setBuildings((prev) =>
      mode === "add"
        ? [...prev, saved]
        : prev.map((b) => (b.id === saved.id ? saved : b))
    );

    onSuccess(saved, mode === "add" ? "add" : "update");

    setSelectedId(saved.id);
    setMode("view");
  };

  /* Delete */
  const remove = async () => {
    if (!selectedId) return;
    if (!confirm("Delete this building?")) return;

    const res = await fetch(`/api/buildings/${selectedId}`, {
      method: "DELETE",
    });

    if (!res.ok) return alert("Delete failed");

    setBuildings((prev) => prev.filter((b) => b.id !== selectedId));
    onSuccess(selectedBuilding!, "delete");

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
            title: "Save",
            onClick: save,
          },
          {
            key: "cancel" as ActionKey,
            title: "Cancel",
            onClick: () => {
              setMode("view");
              setNameInput(selectedBuilding?.building_name || "");
            },
          },
        ]
      : []),

    ...(mode === "view"
      ? [
          {
            key: "add" as ActionKey, 
            title: "Add Building",
            onClick: () => {
              setMode("add");
              setSelectedId("");
              setNameInput("");
            },
          },
        ]
      : []),
  ];

  return (
<div className="modal-overlay">
  <div
    className="modal-content relative bg-white rounded shadow-md max-w-md mx-auto p-6"
    style={{ position: "relative" }} // ensure relative positioning
  >
    {/* Close button */}
    <button
      onClick={onClose}
     className="modal-close-btn"
    >
      Close
    </button>

    <h3 className="mb-4 text-lg font-semibold">Manage Buildings</h3>

    <label>Buildings</label>
    <select
      className="border rounded px-2 py-2 w-full"
      value={selectedId}
      onChange={(e) => setSelectedId(Number(e.target.value))}
      disabled={mode === "add"}
    >
      <option value="">-- Select Building --</option>
      {buildings.map((b) => (
        <option key={b.id} value={b.id}>
          {b.building_name}
        </option>
      ))}
    </select>

    {(mode === "edit" || mode === "add") && (
      <>
        <label className="mt-4 block">Building Name</label>
        <input
          className="border rounded px-2 py-2 w-full"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Enter building name"
        />
      </>
    )}

    <div className="flex justify-end mt-4">
      <ActionMenu actions={actions} />
    </div>
  </div>
</div>


  );
}
