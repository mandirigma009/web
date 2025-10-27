import { useState, useEffect } from "react";
import type { Room } from "../../../types";
import { formatToPhilippineDate } from "../../../../server/utils/dateUtils.ts";
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

dayjs.extend(utc);
dayjs.extend(timezone);

interface RejectedTabProps {
  rejectedBookings: Room[];
  userRole: number;
}

export default function RejectedTab({ rejectedBookings, userRole }: RejectedTabProps) {
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [selectedBooking, setSelectedBooking] = useState<Room | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  // -----------------------------
  // Format time for table/calendar
  const formatTimePH = (start: string, end: string) => {
    const s = start.length === 5 ? `${start}:00` : start;
    const e = end.length === 5 ? `${end}:00` : end;
    return `${s} - ${e}`;
  };

  // -----------------------------
  // Calendar events
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
          title: `${b.room_name} – ${formatTimePH(b.reservation_start || "", b.reservation_end || "")}`,
          start: startPH.toDate(),
          end: endPH.toDate(),
          backgroundColor: "#dc3545",
          borderColor: "#dc3545",
        };
      } catch (err) {
        console.error("⚠️ Failed to parse reservation for calendar:", b, err);
        return null;
      }
    })
    .filter(Boolean);

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
                    <th>Room #</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Building</th>
                    <th>Floor</th>
                    <th>Date Reserved</th>
                    <th>Time</th>
                    <th>Notes</th>
                    <th>Reserved By</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Rejected / Canceled At</th>
                  </tr>
                </thead>
                <tbody>
                  {rejectedBookings.map((booking) => (
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
                      <td>
                        {booking.date_reserved ? formatToPhilippineDate(booking.date_reserved) : "—"}
                      </td>
                      <td>
                        {booking.reservation_start && booking.reservation_end
                          ? formatTimePH(booking.reservation_start, booking.reservation_end)
                          : "—"}
                      </td>
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
        <div style={{ marginTop: "20px" }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, bootstrap5Plugin]}
            themeSystem="bootstrap5"
            initialView="dayGridMonth"
            height="auto"
            events={events}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            eventClick={(info) => {
              const bookingId = Number(info.event.id);
              const booking = rejectedBookings.find((b) => b.id === bookingId);
              if (booking) setSelectedBooking(booking);
            }}
          />
        </div>
      )}

      {selectedBooking && (
        <CalendarEventsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          formatTimePH={formatTimePH}
          // Rejected tab → only Close button, so no extra props needed
        />
      )}
    </div>
  );
}
