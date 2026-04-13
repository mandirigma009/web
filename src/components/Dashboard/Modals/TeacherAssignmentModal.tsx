/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import ActionMenu from "../../ActionMenu";

type Teacher = {
  id: number;
  name: string;
  department_id?: number;
  department?: string;
  year_id?: number;
  subject_ids?: number[];
  subjects?: string;
  year_level?: string | number;
};

type Department = { id: number; name: string };
type Year = { id: number; department_id: number; year_level: number };
type Subject = { id: number; year_id: number; name: string };

type Props = {
  teacher: Teacher;
  onClose: () => void;
  onSuccess: () => void;
};

export default function TeacherAssignmentModal({ teacher, onClose, onSuccess }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | "">("");
  const [selectedYearId, setSelectedYearId] = useState<number | "">("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);

  const [initialized, setInitialized] = useState(false);

  const [originalDepartmentId, setOriginalDepartmentId] = useState<number | null>(null);
  const [previousYearId, setPreviousYearId] = useState<number | null>(null);

  // ---------------- FETCH FUNCTIONS ----------------
  const fetchDepartments = async (): Promise<Department[]> => {
    const res = await fetch("/api/departments", { credentials: "include" });
    const data: Department[] = await res.json();
    setDepartments(data);
    return data;
  };

  const fetchYears = async (departmentId: number): Promise<Year[]> => {
    const res = await fetch(`/api/years/${departmentId}`, { credentials: "include" });
    const data: Year[] = await res.json();
    setYears(data);
    return data;
  };

  const fetchSubjects = async (yearId: number): Promise<Subject[]> => {
    const res = await fetch(`/api/subjects/${yearId}`, { credentials: "include" });
    const data: Subject[] = await res.json();
    setSubjects(data);
    return data;
  };

  // ---------------- INITIALIZATION ----------------
const initializeSelections = async (teacher: Teacher) => {
  if (!departments.length) return;

  const department = departments.find(
    d => d.id === teacher.department_id || d.name === teacher.department
  );

  if (!department) return;

  setOriginalDepartmentId(department.id);
  setSelectedDepartmentId(department.id);

  const yearData = await fetchYears(department.id);

  let preselectedYearId: number | "" = "";

  if (teacher.year_id) {
    preselectedYearId = teacher.year_id;
  } else if (teacher.year_level) {
    const year = yearData.find(
      y => String(y.year_level) === String(teacher.year_level)
    );
    if (year) preselectedYearId = year.id;
  }

  setSelectedYearId(preselectedYearId);
  setPreviousYearId(preselectedYearId || null);

  if (preselectedYearId) {
    const subjData = await fetchSubjects(preselectedYearId);

    let preselectedSubjectIds: number[] = [];

    if (teacher.subject_ids?.length) {
      preselectedSubjectIds = teacher.subject_ids.filter(id =>
        subjData.some(s => s.id === id)
      );
    }

    setSelectedSubjectIds(preselectedSubjectIds);
  }

  setInitialized(true);
};



  // ---------------- INITIAL FETCH ----------------
  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (departments.length) initializeSelections(teacher);
  }, [teacher, departments]);

  // ---------------- HANDLE DEPARTMENT CHANGE ----------------
useEffect(() => {
  if (!initialized || !selectedDepartmentId) return;

      fetchYears(Number(selectedDepartmentId));
  }, [selectedDepartmentId]);

  // ---------------- HANDLE YEAR CHANGE ----------------



  // ---------------- SUBJECT TOGGLE ----------------
  const handleSubjectToggle = (subjectId: number) => {
    setSelectedSubjectIds(prev =>
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    );
  };

  // ---------------- SAVE ----------------
  const saveAssignments = async () => {
    if (!selectedDepartmentId) return alert("Department is required");
    if (!selectedYearId) return alert("Year is required");
    if (!selectedSubjectIds.length) return alert("Select at least 1 subject");

    // 1️⃣ Delete all assignments that do NOT belong to the new department
    if (originalDepartmentId && originalDepartmentId !== selectedDepartmentId) {
      await fetch(`/api/teachers/${teacher.id}/assignment?exclude_department=${selectedDepartmentId}`, {
        method: "DELETE",
        credentials: "include",
      });
    }

    // 2️⃣ Save new assignment
    const res = await fetch(`/api/teachers/${teacher.id}/assignment`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
        body: JSON.stringify({
          department_id: Number(selectedDepartmentId),
          previous_year_id: previousYearId,
          year_id: Number(selectedYearId),
          subject_ids: selectedSubjectIds,
        }),
    });

if (!res.ok) return alert("Failed to save assignment");

setPreviousYearId(Number(selectedYearId));
onSuccess();
  };

  // ---------------- CLEAR ALL ----------------
const clearCurrentAssignment = async () => {
  if (!selectedDepartmentId || !selectedYearId) {
    return alert("Select department and year first");
  }

  if (!confirm("Delete selected assignment only?")) return;

  const res = await fetch(
    `/api/teachers/${teacher.id}/assignment?department_id=${selectedDepartmentId}&year_id=${selectedYearId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!res.ok) return alert("Failed to delete assignment");

  setSelectedSubjectIds([]);
  onSuccess();
};

  return (
    <div className="modal-overlay">
      <div className="modal-content bg-white rounded shadow-lg p-6 max-w-lg mx-auto">
        <button onClick={onClose} className="modal-close-btn">Close</button>
        <h3 className="text-lg font-semibold mb-4">
          Assign Academic Structure → {teacher.name}
        </h3>

        {/* Department */}
        <label>Department</label>
        <select
          className="w-full border rounded px-2 py-2 mb-4"
          value={selectedDepartmentId}
          onChange={e => setSelectedDepartmentId(Number(e.target.value))}
        >
          <option value="">Select Department</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {/* Year */}
        <label>Year</label>
        <select
          className="w-full border rounded px-2 py-2 mb-4"
          value={selectedYearId}
              onChange={async e => {
                const newYearId = Number(e.target.value);

                // save old year before switching
                setPreviousYearId(
                  selectedYearId !== "" ? Number(selectedYearId) : null
                );

                // update year
                setSelectedYearId(newYearId);

                // VERY IMPORTANT: clear old subjects immediately
                setSelectedSubjectIds([]);
                setSubjects([]);

                // fetch ONLY subjects for selected new year
                if (newYearId) {
                  const newSubjects = await fetchSubjects(newYearId);
                  setSubjects(newSubjects);
                }
              }}
          disabled={!selectedDepartmentId}
        >
          <option value="">Select Year</option>
          {years.map(y => (
            <option key={y.id} value={y.id}>Year {y.year_level}</option>
          ))}
        </select>

        {/* Subjects */}
        <label>Subjects</label>
        <div className="border rounded p-3 max-h-48 overflow-y-auto">
          {subjects.length === 0 ? (
            <p>No subjects found</p>
          ) : (
            <table className="w-full table-auto">
              <tbody>
                {subjects.map(s => (
                  <tr key={s.id} className="border-b">
                    <td className="py-1 px-2">
                      <input
                        type="checkbox"
                        checked={selectedSubjectIds.includes(s.id)}
                        onChange={() => handleSubjectToggle(s.id)}
                      />
                    </td>
                    <td className="py-1 px-2">{s.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end mt-4">
          <ActionMenu
            actions={[
              { key: "save", title: "Save Assignment", onClick: saveAssignments },
              { key: "delete", title: "Clear All", onClick: clearCurrentAssignment },
            ]}
          />
        </div>
      </div>
    </div>
  );
}