/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import AcademicStructureModal from "../Modals/AcademicStructureModal";
import TeacherAssignmentModal from "../Modals/TeacherAssignmentModal.tsx";
import ActionMenu from "../../ActionMenu";
import type { ActionKey } from "../../../utils/actionStyles";
import "../../../styles/modal.css";
import "../../../styles/dashboard.css";

type User = {
  id: number;
  name: string;
  role: number;
  department?: string;
  department_id?: number; 
  year_level?: number;
  subjects?: string;       // comma-separated string
  subject_ids?: number[];  // array of assigned subject ids
};

export default function DepartmentTab() {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [usersAssignment, setUsersAssignments] = useState<User[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  const [showAcademicModal, setShowAcademicModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);

  const fetchUsersAssignment = async () => {
    try {
      const res = await fetch("/api/users-assignment", { credentials: "include" });
      const data = await res.json();

      const instructors = (data.users || [])
        .filter((u: User) => u.role === 3)
        .map((u: any) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          department: u.department || "-",
          department_id: u.department_id || null,
          year_level: u.year_level || undefined,
          subjects: u.subjects || "",
          subject_ids: u.subject_ids || [],
     
        }));

console.log("Fetched instructors:", instructors);


      setUsersAssignments(instructors);
    } catch (err) {
      console.error("Error fetching fetchUsersAssignment:", err);
      setUsersAssignments([]);
    }
  };

  useEffect(() => {
    fetchUsersAssignment();
  }, []);

  function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSelectedRowId(null);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={dropdownRef}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2>Teacher Academic Assignment</h2>
        <button className="primary" onClick={() => setShowAcademicModal(true)}>
          Academic Structure
        </button>
      </div>

      {/* Table */}
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Department</th>
            <th>Year</th>
            <th>Assigned Subjects</th>
            <th />
          </tr>
        </thead>

        <tbody>
          {usersAssignment.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: "center" }}>
                No instructors found
              </td>
            </tr>
          ) : (
            usersAssignment.map((u, index) => {
              const prev = usersAssignment[index - 1];
              const isSameGroup = prev && prev.name === u.name && prev.department === u.department;
              const rowSpanCount = usersAssignment.filter(
                (item) => item.name === u.name && item.department === u.department
              ).length;

              return (
                <tr
                  key={`${u.id}-${u.department}-${u.year_level}`}
                  onClick={() => setSelectedRowId(u.id)}
                  className={selectedRowId === u.id ? "highlighted" : ""}
                >
                {!isSameGroup && (
                  <>
                    <td rowSpan={rowSpanCount}>{u.name}</td>
                    <td>{u.department || "-"}</td>
                  </>
                )}

                  <td>{u.year_level ? `${getOrdinal(Number(u.year_level))} Year` : "—"}</td>

                  {/* Assigned Subjects as tags */}
                  
                <td>
                  {u.subjects && u.subjects.trim() !== ""
                    ? u.subjects
                    : "-"}
                </td>

                  <td>
                  <ActionMenu
                    actions={[
                      {
                        key: "edit" as ActionKey,
                        title: "Assign Academic",
                        onClick: () => {
                          setSelectedTeacher(u);
                        },
                      },
                    ]}
                  />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Academic Structure Modal */}
      {showAcademicModal && (
        <AcademicStructureModal onClose={() => setShowAcademicModal(false)} />
      )}

      {/* Teacher Assignment Modal */}
      {selectedTeacher && (
        <TeacherAssignmentModal
          teacher={selectedTeacher}
          onClose={() => setSelectedTeacher(null)}
          onSuccess={() => {
            fetchUsersAssignment();
            setSelectedTeacher(null);
          }}
        />
      )}
    </div>
  );
}