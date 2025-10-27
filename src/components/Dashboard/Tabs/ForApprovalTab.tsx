// src/components/Dashboard/ForApprovalTab.tsx
import { useState } from "react";
import type { Room } from "../../../types.tsx";
import EditBookingModal from "../Modals/EditBookingModal.tsx";
import ReservationTable from "../Modals/ReservationTable.tsx";
import { formatToPhilippineDate } from "../../../../server/utils/dateUtils.ts";
import "../../../styles/dashboard.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface ForApprovalTabProps {
  pendingBookings: Room[];
  refreshPendingBookings: () => void;
  userRole: number;
}

export default function ForApprovalTab({
  pendingBookings,
  refreshPendingBookings,
  userRole,
}: ForApprovalTabProps) {
  const [editingBooking, setEditingBooking] = useState<Room | null>(null);

  const handleApprove = async (bookingId: number) => {
    try {
      toast.success("Please wait!");
      const res = await fetch(
        `http://localhost:5000/api/room_bookings/approve/${bookingId}`,
        { method: "PUT" }
      );
      console.log("res : ", res)
      if (!res.ok) throw new Error("Failed to approve booking");
      toast.success("Reservation approved successfully!");
      refreshPendingBookings();
    } catch (err) {
      console.error("Approve error:", err);
      alert("Failed to approve booking.");
    }
  };

  const handleReject = async (bookingId: number) => {
    try {
      toast.success("Please wait!");
      
      const res = await fetch(
        `http://localhost:5000/api/room_bookings/reject/${bookingId}`,
        { method: "PUT" }
      );
      if (!res.ok) throw new Error("Failed to reject booking");
      toast.success("Reservation Rejected!");
      refreshPendingBookings();
    } catch (err) {
      console.error("Reject error:", err);
      alert("Failed to reject booking.");
    }
  };


  // ✅ Cancel booking (delete permanently)
  const handleCancel = async (bookingId: number) => {
  
toast.success("Please wait!");
    try {
      const res = await fetch(
        `http://localhost:5000/api/room_bookings/${bookingId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete booking");
      //alert("Reservation has been permanently deleted.");
      toast.success("Reservation has been permanently deleted!");
      refreshPendingBookings();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete reservation.");
    }
  };


  return (
    <>
      <ReservationTable
        reservations={pendingBookings}
        userRole={userRole}
        editBooking={setEditingBooking}
        approveBooking={handleApprove}
        cancelReservation={handleCancel}
        rejectBooking={handleReject}
        isForApproval={true} 
        formatDate={(d) => formatToPhilippineDate(d)} // ✅ use PH date formatting
        formatTime={(s, e, d) =>
          `${s} - ${e} (${formatToPhilippineDate(d)})` // optional: show PH date
        }
      />

      {/* EDIT MODAL */}
      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onUpdateSuccess={() => {
            setEditingBooking(null);
            refreshPendingBookings();
          }}
        />
      )}
        <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}
