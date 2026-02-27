export interface User {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  free_number?: number;
  extra_numbers: number[];
  is_admin: boolean;
  is_vip?: boolean;
  created_at: string;
  updated_at: string;
  total_bets?: number;
  total_wins?: number;
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
  raffle_id?: string;
  raffle?: {
    id: string;
    title: string;
    description: string;
    prize: string;
    status?: 'active' | 'finished' | 'cancelled';
  };
}

export interface DrawResult {
  id: string;
  winning_number: number;
  winner_id: string;
  prize_amount: number;
  draw_date: string;
  created_by: string;
  users?: {
    name: string;
    email: string;
  };
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

export interface CruzeiroSettings {
  id: string;
  live_url: string;
  is_live: boolean;
  updated_at: string;
}

export interface YouTubeClip {
  id: string;
  title: string;
  description?: string;
  youtube_url: string;
  thumbnail_url?: string;
  duration?: string;
  is_active: boolean;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface CruzeiroGame {
  id: string;
  opponent: string;
  opponent_logo?: string;
  date: string;
  venue: string;
  score_home?: number;
  score_away?: number;
  status: 'upcoming' | 'finished' | 'live';
  competition: string;
  is_home: boolean;
  banner_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface CruzeiroStanding {
  id: string;
  position: number;
  team: string;
  logo?: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  is_cruzeiro: boolean;
  competition: string;
  last_5?: string;
  prev_position?: number;
  next_opponent?: string;
  created_at: string;
}

export interface Raffle {
  id: string;
  title: string;
  description: string;
  prize: string;
  total_numbers: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  status: 'active' | 'finished' | 'cancelled';
  created_at: string;
  updated_at: string;
  prize_image?: string;
}

export interface BioLink {
  id: string;
  label: string;
  url: string;
  icon?: string;
}

export interface BioProfile {
  id: string;
  user_id: string;
  slug: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  theme_config: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    buttonStyle?: 'solid' | 'outline' | 'ghost';
  };
  custom_links: BioLink[];
  created_at: string;
  updated_at: string;
}


export interface CruzeiroPlayer {
  id: string;
  name: string;
  full_name?: string;
  photo_url?: string;
  position: 'GOL' | 'LAT' | 'ZAG' | 'MEI' | 'ATA';
  number?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}