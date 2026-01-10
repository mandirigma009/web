import { useState } from "react";
import type { Room } from "../../../types.tsx";
import EditBookingModal from "../Modals/EditBookingModal.tsx";
import ReservationTable from "../Modals/ReservationTable.tsx";
import CalendarEventsModal from "../Modals/calendarEventsModal.tsx";
import "../../../styles/dashboard.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";



interface ForApprovalTabProps {
  pendingBookings: Room[];
  refreshPendingBookings: () => void; // parent fetch function
  userRole: (number);
    currentUserId: number | null;
}

export default function ForApprovalTab({ pendingBookings, refreshPendingBookings, userRole, currentUserId }: ForApprovalTabProps) {
  const [editingBooking, setEditingBooking] = useState<Room | null>(null);
  const [calendarBooking, setCalendarBooking] = useState<Room | null>(null);

  const handleApprove = async (id: number) => {
    toast.success("Please wait!");
    await fetch(`http://localhost:5000/api/room_bookings/approve/${id}`, { method: "PUT" });
    refreshPendingBookings();
  };

  const handleReject = async (id: number) => {
    toast.success("Please wait!");
    await fetch(`http://localhost:5000/api/room_bookings/reject/${id}`, { method: "PUT" });
    refreshPendingBookings();
  };

  const handleCancel = async (id: number) => {
    toast.success("Please wait!");
    await fetch(`http://localhost:5000/api/room_bookings/${id}`, { method: "DELETE" });
    refreshPendingBookings();
  };

  return (
    <>
      <div className="flex justify-between items-center mb-3">
      
      
      </div>

      <ReservationTable
        reservations={pendingBookings}
        userRole={userRole}
        currentUserId={currentUserId}
        editBooking={setEditingBooking}
        approveBooking={handleApprove}
        deleteReservation={handleCancel}
        rejectBooking={handleReject}
        isForApproval
        formatTime={(s, e) => `${s} - ${e}`}
        refreshMyBookings={refreshPendingBookings}
        openCalendar={setCalendarBooking}
      />

      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onUpdateSuccess={() => {
            setEditingBooking(null);
            refreshPendingBookings(); // refresh table + calendar
          }}
        />
      )}

      {calendarBooking && (
        <CalendarEventsModal
          booking={calendarBooking}
          onClose={() => setCalendarBooking(null)}
          formatTimePH={(s, e) => `${s} - ${e}`}
          userRole={userRole}
          activeTab="pending"
          onApprove={handleApprove}
          onReject={handleReject}
          onCancel={handleCancel}
          onEdit={setEditingBooking}
        />
      )}

      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}
