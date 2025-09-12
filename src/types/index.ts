export interface User {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  free_number?: number;
  extra_numbers: number[];
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface RaffleNumber {
  number: number;
  is_available: boolean;
  selected_by?: string;
  is_free: boolean;
  assigned_at?: string;
}

export interface ExtraNumberRequest {
  id: string;
  user_id: string;
  payment_amount: number;
  requested_quantity: number;
  status: 'pending' | 'approved' | 'rejected';
  payment_proof_url?: string;
  admin_notes?: string;
  assigned_numbers: number[];
  created_at: string;
  updated_at: string;
  processed_by?: string;
  processed_at?: string;
}

export interface DrawResult {
  id: string;
  winning_number: number;
  winner_id: string;
  prize_amount: number;
  draw_date: string;
  created_by: string;
}

export interface AuditLog {
  id: string;
  action: string;
  table_name?: string;
  record_id?: string;
  old_values?: any;
  new_values?: any;
  performed_by: string;
  performed_at: string;
  ip_address?: string;
  user_agent?: string;
}