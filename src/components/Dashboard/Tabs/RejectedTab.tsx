//rejectedTab.tsx

/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react";
import type { Room } from "../../../types";
// @ts-ignore
import { formatToPhilippineDate } from '../../../../server/utils/dateUtils';

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import bootstrap5Plugin from "@fullcalendar/bootstrap5";
import CalendarEventsModal from "../../Dashboard/Modals/calendarEventsModal.tsx";
import "../../../styles/dashboard.css";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "@fullcalendar/bootstrap5";
import "../../../styles/modal.css";
import { format12Hour } from "../../../utils/timeUtils.ts";

dayjs.extend(utc);
dayjs.extend(timezone);

interface RejectedTabProps {
  rejectedBookings: Room[];
  userRole: number;
  
}

export default function RejectedTab({ rejectedBookings}: RejectedTabProps) {
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [selectedBooking, setSelectedBooking] = useState<Room | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const [calendarView, setCalendarView] = useState("dayGridMonth");


  // -----------------------------
  // Sorting setup
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "",
    direction: "asc",
  });

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      } else {
        return { key, direction: "asc" };
      }
    });
  };

  const sortedBookings = [...rejectedBookings].sort((a, b) => {
    const { key, direction } = sortConfig;
    if (!key) return 0;

    const valA = (a as any)[key];
    const valB = (b as any)[key];

    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });





  // -----------------------------
  // Calendar events
// -----------------------------
// Calendar events (structured, future-proof)
const events = rejectedBookings
  .map((b) => {
    try {
      const dateUTC = dayjs.utc(b.date_reserved);
      const datePH = dateUTC.tz("Asia/Manila");

      const startTime =
        b.reservation_start && b.reservation_start.length === 5
          ? `${b.reservation_start}:00`
          : b.reservation_start || "00:00:00";
      const endTime =
        b.reservation_end && b.reservation_end.length === 5
          ? `${b.reservation_end}:00`
          : b.reservation_end || "00:00:00";

      const startPH = dayjs.tz(`${datePH.format("YYYY-MM-DD")}T${startTime}`, "Asia/Manila");
      const endPH = dayjs.tz(`${datePH.format("YYYY-MM-DD")}T${endTime}`, "Asia/Manila");

      return {
        id: String(b.id),
        title: b.room_name, // Room name only
        start: startPH.toDate(),
        end: endPH.toDate(),
        backgroundColor: "#dc3545",
        borderColor: "#dc3545",
        extendedProps: {
          building: b.building_name,
          fullLabel: `${b.room_name} - ${b.building_name}`,
          reservationId: b.id,
        },
      };
    } catch (err) {
      console.error("⚠️ Failed to parse reservation for calendar:", b, err);
      return null;
    }
  })
  .filter((e) => e !== null);

  // -----------------------------
  // Deselect row on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const table = document.getElementById("my-bookings-table");
      if (table && !table.contains(event.target as Node)) {
        setSelectedRowId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // -----------------------------
  // Table headers with arrows
  const headers = [
    { key: "room_number", label: "Room #" },
    { key: "room_name", label: "Name" },
    { key: "room_description", label: "Description" },
    { key: "building_name", label: "Building" },
    { key: "floor_number", label: "Floor" },
    { key: "date_reserved", label: "Date Reserved" },
    { key: "reservation_start", label: "Reservation Time" },
    { key: "notes", label: "Notes" },
    { key: "reserved_by", label: "Reserved By" },
    { key: "status", label: "Status" },
    { key: "reject_reason", label: "Reason" },
    { key: "rejected_at", label: "Rejected / Canceled At" },
  ];



  useEffect(() => {
    const handleResize = () => {
      setCalendarView(() => {
        if (window.innerWidth < 640) return "timeGridDay";
        if (window.innerWidth < 1024) return "timeGridWeek";
        return "dayGridMonth";
      });
  
      // 👇 Force rerender
      const api = calendarRef.current?.getApi();
      if (api) {
        api.updateSize();
      }
    };
  
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Rejected / Canceled Bookings</h2>
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={() => setViewMode(viewMode === "table" ? "calendar" : "table")}
        >
          {viewMode === "table" ? "📅 Calendar View" : "📋 Table View"}
        </button>
      </div>

      {viewMode === "table" && (
        <>
          {rejectedBookings.length === 0 ? (
            <p>No rejected or canceled bookings.</p>
          ) : (
            <div style={{ overflowX: "auto", marginTop: "10px", maxHeight: "500px" }}>
              <table
                id="my-bookings-table"
                className="dashboard-table"
                style={{ width: "100%", marginTop: "10px", minWidth: "1200px" }}
              >
                <thead>
                   
                  <tr>
                    {headers.map(({ key, label } ) => (
                     
                      <th key={key} style={{ whiteSpace: "nowrap" }}>
                        <div >
                          <span>{label}   {"    "}</span>
  
                            <span
                              style={{
                                fontSize: "10px",
                                opacity: sortConfig.key === key && sortConfig.direction === "asc" ? 1 : 0.3,
                              }}
                              onClick={() => handleSort(key)}
                            >
                              ▲
                            </span>
                            <span
                              style={{
                                fontSize: "10px",
                                opacity: sortConfig.key === key && sortConfig.direction === "desc" ? 1 : 0.3,
                              }}
                              onClick={() => handleSort(key)}
                            >
                              ▼
                            </span>
                        
                        </div>
                      </th>
                    ))}
                  </tr>
                  
                </thead>
                
                <tbody>
                  {sortedBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className={selectedRowId === booking.id ? "highlighted" : ""}
                    >
                      <td>{booking.room_number}</td>
                      <td>{booking.room_name}</td>
                      <td className="text-black">
                        <div>
                          <strong className="text-black">{booking.room_description || "No description"}</strong>
                          <br />
                          <span
                            style={{
                              fontSize: "0.9em",
                              color: selectedRowId === booking.id ? "#fff" : "#000",
                            }}
                          >
                            {booking.chairs ? `${booking.chairs} Chair${booking.chairs > 1 ? "s" : ""}` : "No Chairs"},
                            TV: {booking.has_tv ? "Yes" : "No"} | Tables: {booking.has_table ? "Yes" : "No"} |
                            Projector: {booking.has_projector ? "Yes" : "No"}
                          </span>
                        </div>
                      </td>
                      <td>{booking.building_name}</td>
                      <td>{booking.floor_number}</td>
                      <td>{booking.date_reserved ? formatToPhilippineDate(booking.date_reserved) : "—"}</td>
                      <td>{booking.reservation_start && booking.reservation_end ? `${format12Hour(booking.reservation_start)} - ${format12Hour(booking.reservation_end)}` : "—"}</td>
                      <td>{booking.notes || "—"}</td>
                      <td>{booking.reserved_by || "—"}</td>
                      <td>{booking.status || "Rejected"}</td>
                      <td>{booking.reject_reason || "—"}</td>
                      <td>
                        {booking.rejected_at
                          ? formatToPhilippineDate(booking.rejected_at)
                          : booking.canceled_at
                          ? formatToPhilippineDate(booking.canceled_at)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

              {viewMode === "calendar" && (
                <div style={{ marginTop: 20 }}>
                  <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, bootstrap5Plugin]}
                    themeSystem="bootstrap5"
                    initialView={calendarView}
                    height="auto"
                    events={events}
                    headerToolbar={{
                      left: "dayGridMonth,timeGridWeek,timeGridDay",
                      center: "title",
                      right: "prev,next today",
                    }}
                    slotLabelFormat={{ hour: "numeric", minute: "2-digit", hour12: true }}
                    eventTimeFormat={{ hour: "numeric", minute: "2-digit", hour12: true }}

                    /* ---------------- RESPONSIVE EVENT RENDERER ---------------- */
                    
                      eventContent={(arg) => {
                        const start = arg.event.start;
                        const end = arg.event.end;

                        const shortStart = start?.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const shortEnd = end?.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        const roomName = arg.event.title; // already only room name
                        const building = arg.event.extendedProps.building;
                        const tooltipText = `${shortStart} - ${shortEnd}\n${roomName} - ${building}`;

                        const isMobile = calendarView === "timeGridDay";

                        // 📱 MOBILE → Room name only
                        if (isMobile) {
                          return (
                            <div title={tooltipText} style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                              {roomName}
                            </div>
                          );
                        }

                        // 💻 DESKTOP → Time + Room name
                        return (
                          <div title={tooltipText} style={{ padding: "2px" }}>
                            <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                              {shortStart} - {shortEnd}
                            </div>
                            <div style={{ fontWeight: 600 }}>{roomName}</div>
                          </div>
                        );
                      }}
                    /* Cursor Pointer */
                    eventDidMount={(info) => {
                      info.el.style.cursor = "pointer";
                    }}

                    eventClick={(info) => {
                      info.jsEvent.preventDefault();
                      info.jsEvent.stopPropagation();
                      const booking = rejectedBookings.find(
                        (b) => b.id === Number(info.event.id)
                      );
                      if (booking) setSelectedBooking(booking);
                    }}

                    dateClick={(info) => setSelectedDate(info.dateStr)}

                    dayCellClassNames={(arg) =>
                      dayjs(arg.date).format("YYYY-MM-DD") === selectedDate
                        ? ["selected-day"]
                        : []
                    }
                  />
                </div>
              )}

        {selectedBooking && (
          <CalendarEventsModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            actions={[]}   // ✅ required prop
          />
        )}

    </div>
  );
}
