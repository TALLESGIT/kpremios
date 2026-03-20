export interface User {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  free_number?: number;
  extra_numbers: number[];
  is_admin: boolean;
  is_vip?: boolean;
  vip_expires_at?: string;
  vip_granted_at?: string;
  vip_type?: 'free' | 'paid';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  club_slug?: string;
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

export interface MatchSettings {
  id: string;
  live_url: string;
  is_live: boolean;
  team_name?: string;
  brand_color?: string;
  updated_at: string;
  club_slug?: string;
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
  club_slug?: string;
}

export interface MatchGame {
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
  api_fixture_id?: number;
  api_league_id?: number;
  api_home_team_id?: number;
  api_away_team_id?: number;
  created_at: string;
  updated_at?: string;
  club_slug: string;
}

export interface MatchStanding {
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
  is_primary_team: boolean;
  competition: string;
  last_5?: string;
  prev_position?: number;
  next_opponent?: string;
  created_at: string;
  club_slug: string;
}

export interface TeamPlayer {
  id: string;
  name: string;
  full_name?: string;
  photo_url?: string;
  position: 'GOL' | 'LAT' | 'ZAG' | 'MEI' | 'ATA';
  number?: number;
  is_active: boolean;
  team_name?: string;
  created_at: string;
  updated_at: string;
  club_slug: string;
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

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  image_url: string;
  description?: string;
  category: 'jersey' | 'exclusive' | 'casual' | 'accessories';
  is_available: boolean;
  stock: number;
  weight_g?: number;
  width_cm?: number;
  height_cm?: number;
  length_cm?: number;
  is_free_shipping?: boolean;
  free_shipping_states?: string[];
  gallery_urls?: string[];
  available_sizes?: string[];
  target_audience?: 'masculino' | 'feminino' | 'kids' | 'unissex';
  is_coming_soon?: boolean;
}

export interface ShippingRate {
  id: string;
  state_code: string;
  base_cost: number;
  estimated_days: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
}

export interface MatchPool {
  id: string;
  match_id?: string;
  match_title: string;
  home_team: string;
  away_team: string;
  home_team_logo?: string;
  away_team_logo?: string;
  is_active: boolean;
  result_home_score: number | null;
  result_away_score: number | null;
  total_participants: number;
  total_pool_amount: number;
  winners_count: number;
  prize_per_winner: number;
  accumulated_amount: number;
  club_slug: string;
  created_at: string;
  live_stream_id?: string;
}