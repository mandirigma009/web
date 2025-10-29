// src/types.tsx
export interface User {
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
  room_number: string;
  room_name: string;
  room_description: string;
  user_id: number;
  building_name: string;
  floor_number: number;
  status: number;
  date_reserved: string | null;
  reservation_start: string | null;
  reservation_end: string | null;
  reserved_by: string | null;
  created_at: string;
}
