
import type { Room } from "../../../types";
import ReservationTable from "../Modals/ReservationTable";


interface MyBookingsTabProps {
  myBookings: Room[];
  cancelingId: number | null;
  cancelReservation: (id: number) => void;
  formatDate: (dateStr: string) => string;
  formatTime: (start: string, end: string, dateStr: string) => string;
  refreshMyBookings: () => void;
  userRole: number; // add userRole prop
}

export default function MyBookingsTab({
  myBookings,
  cancelReservation,
  formatDate,
  formatTime,
  refreshMyBookings,
  userRole,

}: 

MyBookingsTabProps) {


//console.log("UserRole in MybookingsTab: ", userRole)

  return (
    <>
      <ReservationTable
        reservations={myBookings}
        userRole={userRole}
        cancelReservation={cancelReservation}
        formatDate={formatDate}
        formatTime={formatTime}
        refreshMyBookings = {refreshMyBookings}
        isMyBookings={true}
      />

    </>
  );
}
