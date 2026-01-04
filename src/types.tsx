// src/types.tsx
export interface User {
 
  status: string;
  verified: number;
  id: number;
  name: string;
  email: string;
  role: number;
}

export interface Room {
  has_tv: number;
  chairs: number;
  has_projector: number;
  has_table: number;
  id: number;
  name: string;
  room_number: string;
  notes: string;
  room_name: string;
  room_description: string;
  user_id: number;
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
  reject_reason: string;
}
