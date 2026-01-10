
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