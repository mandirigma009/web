
import type { Room } from "../../../types";
import ReservationTable from "../Modals/ReservationTable";
import "../../../styles/dashboard.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";


interface MyBookingsTabProps {
  myBookings: Room[];
  cancelingId: number | null;
  cancelReservation: (id: number) => void;
  formatDate: (dateStr: string) => string;
  formatTime: (start: string, end: string, dateStr: string) => string;
  refreshMyBookings: () => void;
  userRole: (number);
  currentUserId: number | null;
}

export default function MyBookingsTab({
  myBookings,
 // formatDate,
  formatTime,
  refreshMyBookings,
  userRole,
currentUserId
}: 

MyBookingsTabProps) {
/*
  const handleCancelReservation = async (bookingId: number, reason?: string) => {
  try {
    // If reason is provided (from CancelReasonModal), send it to backend
    const body = reason ? { bookingId, reason } : { bookingId };
    const res = await fetch("http://localhost:5000/api/reservations/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success("Reservation cancelled successfully!");
      refreshMyBookings(); // refresh list
    } else {
      const err = await res.json();
      toast.error(err.message || "Failed to cancel reservation.");
    }
  } catch (err) {
    console.error(err);
    toast.error("Server error while cancelling reservation.");
  }
};

*/
//console.log("UserRole in MybookingsTab: ", userRole)

  return (
    <>
      <ReservationTable
        reservations={myBookings}
        userRole={userRole}
        //formatDate={formatDate}
        formatTime={formatTime}
        refreshMyBookings = {refreshMyBookings}
        isMyBookings={true}
        currentUserId={currentUserId}
      />
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}