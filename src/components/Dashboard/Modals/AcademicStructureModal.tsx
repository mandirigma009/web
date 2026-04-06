/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import ActionMenu from "../../ActionMenu";
import type { ActionKey } from "../../../utils/actionStyles";

type Department = { id: number; name: string };
type Year = { id: number; department_id: number; year_level: number };
type Section = { id: number; year_id: number; section_name: string };
type Subject = { id: number; year_id: number; name: string };

type Mode = "view" | "add" | "edit";

type BlockProps = {
  label: string;
  items: { id: number; name: string }[];
  selectedId: number | "";
  onSelect: (id: number | "") => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  inputValue: string;
  setInputValue: (v: string) => void;
  onAdd: (name: string, parentId?: number) => Promise<void>;
  onEdit: (id: number, name: string, parentId?: number) => Promise<void>;
  onDelete: (id: number, parentId?: number) => Promise<void>;
  disabled?: boolean;
  parentId?: number;
};

// Convert number → ordinal string
function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function CrudBlock({
  label,
  items,
  selectedId,
  onSelect,
  mode,
  setMode,
  inputValue,
  setInputValue,
  onAdd,
  onEdit,
  onDelete,
  disabled,
  parentId,
}: BlockProps) {
  const selectedItem = items.find((i) => i.id === selectedId);
const [, setWarning] = useState("");

  useEffect(() => {
    if (mode === "edit" && selectedItem) setInputValue(selectedItem.name);
    else if (mode === "add") setInputValue("");
  }, [mode]);

const save = async () => {
  const value = inputValue.trim();
  if (!value) return;

  // Check for duplicate
  const duplicate = items.some(
    (item) =>
      item.name.toLowerCase() === value.toLowerCase() &&
      item.id !== selectedId
  );
  if (duplicate) {
  alert(`${label} "${value}" already exists.`);
  return;
}

  setWarning(""); // clear warning if valid

  if (mode === "add") await onAdd(value, parentId);
  else if (mode === "edit" && selectedId !== "") await onEdit(selectedId, value, parentId);

  setMode("view");
  setInputValue("");
};

  const remove = async () => {
    if (selectedId === "") return;
    await onDelete(selectedId, parentId);
    onSelect("");
    setInputValue("");
    setMode("view");
  };

  const actions = [
    ...(selectedItem && mode === "view"
      ? [
          { key: "edit" as ActionKey, title: `Edit ${label}`, onClick: () => setMode("edit") },
          { key: "delete" as ActionKey, title: `Delete ${label}`, onClick: remove },
        ]
      : []),
    ...(mode !== "view"
      ? [
          { key: "save" as ActionKey, title: "OK", onClick: save },
          { key: "cancel" as ActionKey, title: "Cancel", onClick: () => setMode("view") },
        ]
      : []),
  ];

  return (
    <div className="mt-4">
      <label className="block mb-1 font-medium">{label}</label>
      <select
        className="border rounded px-2 py-2 w-full"
        value={selectedId || ""}
        onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : "")}
        disabled={disabled}
      >
        <option value="">-- Select {label} --</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {label === "Year" ? getOrdinal(Number(item.name)) + " Year" : item.name}
          </option>
        ))}
      </select>

      {(mode === "add" || mode === "edit") && (
        <input
          className="border rounded px-2 py-2 w-full mt-2"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`Enter ${label}`}
        />
        
      )}
    

        {mode === "view" && !disabled && (
          <button className="btn-primary mt-2" onClick={() => setMode("add")}>
            + Add {label}
          </button>
        )}

      <div className="flex justify-end mt-2">
        <ActionMenu actions={actions} />
      </div>
    </div>
  );
}

// ======================== AcademicStructureModal ========================

type AcademicStructureModalProps = {
  onClose: () => void;
  onSuccess?: () => void;
};

type Entity = "departments" | "years" | "sections" | "subjects";

export default function AcademicStructureModal({ onClose, onSuccess }: AcademicStructureModalProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | "">("");
  const [selectedYearId, setSelectedYearId] = useState<number | "">("");
  const [selectedSectionId, setSelectedSectionId] = useState<number | "">("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | "">("");

  const [departmentInput, setDepartmentInput] = useState("");
  const [yearInput, setYearInput] = useState("");
  const [sectionInput, setSectionInput] = useState("");
  const [subjectInput, setSubjectInput] = useState("");

  const [departmentMode, setDepartmentMode] = useState<Mode>("view");
  const [yearMode, setYearMode] = useState<Mode>("view");
  const [sectionMode, setSectionMode] = useState<Mode>("view");
  const [subjectMode, setSubjectMode] = useState<Mode>("view");

  const entityStateMap: Record<Entity, any> = {
    departments: { data: departments, setData: setDepartments, selectedId: selectedDepartmentId, setSelectedId: setSelectedDepartmentId, input: departmentInput, setInput: setDepartmentInput, mode: departmentMode, setMode: setDepartmentMode },
    years: { data: years, setData: setYears, selectedId: selectedYearId, setSelectedId: setSelectedYearId, input: yearInput, setInput: setYearInput, mode: yearMode, setMode: setYearMode },
    sections: { data: sections, setData: setSections, selectedId: selectedSectionId, setSelectedId: setSelectedSectionId, input: sectionInput, setInput: setSectionInput, mode: sectionMode, setMode: setSectionMode },
    subjects: { data: subjects, setData: setSubjects, selectedId: selectedSubjectId, setSelectedId: setSelectedSubjectId, input: subjectInput, setInput: setSubjectInput, mode: subjectMode, setMode: setSubjectMode },
  };

  
  const fetchEntity = async (entity: Entity, parentId?: number) => {
    try {
      const url = entity === "departments" ? "/api/departments" : `/api/${entity}/${parentId}`;
      const res = await fetch(url);
      const data = await res.json();

      
      entityStateMap[entity].setData(Array.isArray(data) ? data : []);
    } catch {
      entityStateMap[entity].setData([]);
    }
  };

  const handleCrud = async (
    entity: Entity,
    action: "add" | "edit" | "delete",
    value?: string,
    id?: number,
    parentId?: number
  ) => {
    const state = entityStateMap[entity];
    const trimmedValue = value?.trim() || "";

    if ((action === "add" || action === "edit") && !trimmedValue) return;
    if (action !== "delete" && !parentId && entity !== "departments") return;

    const payloadMap: Record<Entity, any> = {
      departments: { name: trimmedValue },
      years: { department_id: parentId, year_level: Number(trimmedValue) },
      sections: { year_id: parentId, section_name: trimmedValue },
      subjects: { year_id: parentId, name: trimmedValue },
    };

    const methodMap: Record<typeof action, string> = {
      add: "POST",
      edit: "PUT",
      delete: "DELETE",
    };

    const urlMap = {
      departments: "/api/departments",
      years: "/api/years",
      sections: "/api/sections",
      subjects: "/api/subjects",
    };

    const url =
      action === "add"
        ? urlMap[entity]
        : `${urlMap[entity]}/${id}`;

   const res = await fetch(url, {
  method: methodMap[action],
  headers: action !== "delete" ? { "Content-Type": "application/json" } : undefined,
  body: action !== "delete" ? JSON.stringify(payloadMap[entity]) : undefined,
});

const data = await res.json();

// Check backend duplicate
if (data.duplicate) {
  alert(data.message);
  return;
}

    await fetchEntity(entity, parentId);

    if (action === "delete") state.setSelectedId("");
    if (action === "edit" && entity === "years") state.setSelectedId(id!);

    state.setInput("");
    onSuccess?.();
  };

  useEffect(() => { fetchEntity("departments"); }, []);
  useEffect(() => {
    if (selectedDepartmentId) fetchEntity("years", selectedDepartmentId);
    else {
      setYears([]); setSelectedYearId("");
      setSections([]); setSelectedSectionId("");
      setSubjects([]); setSelectedSubjectId("");
    }
  }, [selectedDepartmentId]);
  useEffect(() => {
    if (selectedYearId) {
      fetchEntity("sections", selectedYearId);
      fetchEntity("subjects", selectedYearId);
    } else {
      setSections([]); setSelectedSectionId("");
      setSubjects([]); setSelectedSubjectId("");
    }
  }, [selectedYearId]);

  /* -------------------- RENDER -------------------- */
  return (
    <div className="modal-overlay">
      <div className="modal-content bg-white rounded shadow-md max-w-lg mx-auto p-6">
        <button onClick={onClose} className="modal-close-btn">Close</button>
        <h3 className="mb-4 text-lg font-semibold">Manage Academic Structure</h3>

        <CrudBlock
          label="Department"
          items={departments.map(d => ({ id: d.id, name: d.name }))}
          selectedId={selectedDepartmentId}
          onSelect={setSelectedDepartmentId}
          mode={departmentMode}
          setMode={setDepartmentMode}
          inputValue={departmentInput}
          setInputValue={setDepartmentInput}
          onAdd={(v) => handleCrud("departments", "add", v)}
          onEdit={(id, v) => handleCrud("departments", "edit", v, id)}
          onDelete={(id) => handleCrud("departments", "delete", undefined, id)}
        />

        <CrudBlock
          label="Year"
          items={years.map(y => ({ id: y.id, name: y.year_level.toString() }))}
          selectedId={selectedYearId}
          onSelect={setSelectedYearId}
          mode={yearMode}
          setMode={setYearMode}
          inputValue={yearInput}
          setInputValue={setYearInput}
          onAdd={(v) => handleCrud("years", "add", v, undefined, selectedDepartmentId || undefined)}
          onEdit={(id, v) => handleCrud("years", "edit", v, id, selectedDepartmentId || undefined)}
          onDelete={(id) => handleCrud("years", "delete", undefined, id, selectedDepartmentId || undefined)}
          disabled={!selectedDepartmentId}
          parentId={selectedDepartmentId || undefined}
        />

        <CrudBlock
          label="Section"
          items={sections.map(s => ({ id: s.id, name: s.section_name }))}
          selectedId={selectedSectionId}
          onSelect={setSelectedSectionId}
          mode={sectionMode}
          setMode={setSectionMode}
          inputValue={sectionInput}
          setInputValue={setSectionInput}
          onAdd={(v) => handleCrud("sections", "add", v, undefined, selectedYearId || undefined)}
          onEdit={(id, v) => handleCrud("sections", "edit", v, id, selectedYearId || undefined)}
          onDelete={(id) => handleCrud("sections", "delete", undefined, id, selectedYearId || undefined)}
          disabled={!selectedYearId}
          parentId={selectedYearId || undefined}
        />

        <CrudBlock
          label="Subject"
          items={subjects.map(s => ({ id: s.id, name: s.name }))}
          selectedId={selectedSubjectId}
          onSelect={setSelectedSubjectId}
          mode={subjectMode}
          setMode={setSubjectMode}
          inputValue={subjectInput}
          setInputValue={setSubjectInput}
          onAdd={(v) => handleCrud("subjects", "add", v, undefined, selectedYearId || undefined)}
          onEdit={(id, v) => handleCrud("subjects", "edit", v, id, selectedYearId || undefined)}
          onDelete={(id) => handleCrud("subjects", "delete", undefined, id, selectedYearId || undefined)}
          disabled={!selectedYearId}
          parentId={selectedYearId || undefined}
        />
      </div>
    </div>
  );
}