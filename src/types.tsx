
// src/types.tsx
export interface User {
 
  status: string;
  verified: number;
  id: number;
  name: string;
  email: string;
  role: number;
  subjectId: number;
  departmentId: number;
}

export interface Reservation {
  id: number;
  room_id: number;
  status: "pending" | "approved" | "rejected";
  has_conflict: boolean;
 conflict_group_id?: string | number; // optional, only for conflict
  building_id: string | number | readonly string[] | undefined;
  chairs: number;
  has_tv: 0 | 1;
  has_projector: 0 | 1;
  has_table: 0 | 1;
  name: string;
  building: string;
  room_number: string;
  notes: string;
  room_name: string;
  room_description: string;
  user_id: number;
  reservation_status: string;
  building_name: string;
  floor_number: number;
  verified: number;
  date_reserved: string;
  reservation_start: string;
  reservation_end: string;
  reserved_by: string | null;
  created_at: string;
  canceled_at: string;
  rejected_at:  string;
  subject: string;
  reject_reason: string;
  max_capacity: number;

 
}

export interface Building {
  id: number;
  building_name: string;
}



export interface Room {
  room_id: number;
 conflict_group_id?: string | number; // optional, only for conflicts
  has_conflict: boolean;
  building_id: string | number | readonly string[] | undefined;
  chairs: number;
  has_tv: 0 | 1;
  has_projector: 0 | 1;
  has_table: 0 | 1;
  id: number;
  name: string;
  building: string;
  room_number: string;
  notes: string;
  room_name: string;
  room_description: string;
  user_id: number;
  reservation_status: string;
  building_name: string;
  floor_number: number;
  status: number;
  verified: number;
  date_reserved: string;
  reservation_start: string;
  reservation_end: string;
  reserved_by: string | null;
  created_at: string;
  canceled_at: string;
  rejected_at:  string;
  subject: string;
  reject_reason: string;
  max_capacity: number;
  year: string;    
  section: string;
  year_level: string;
  section_name: string;
  year_id: number;
  section_id: number;
}
