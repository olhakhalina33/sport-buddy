// Усі доменні типи — в одному місці.

export type Sport = 'run' | 'tennis' | 'football' | 'cycling';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type JoinMode = 'auto' | 'approval';
export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled';

export interface Profile {
  id: string;
  name: string;
  level: SkillLevel;
  avatar_url: string | null;
  rating: number | null;
}

export interface MiniUser {
  name: string;
  avatar_url: string | null;
}

export interface TrainingListItem {
  id: string;
  title: string;
  sport: Sport;
  level: SkillLevel;
  starts_at: string;
  place_name: string;
  lat: number;
  lng: number;
  capacity: number;
  confirmed_count: number;
  free_seats: number;
  distance_km: number | null;
  avatars: MiniUser[];
}

export interface Training {
  id: string;
  organizer_id: string;
  title: string;
  sport: Sport;
  level: SkillLevel;
  starts_at: string;
  place_name: string;
  lat: number;
  lng: number;
  capacity: number;
  description: string | null;
  join_mode: JoinMode;
  status: 'open' | 'cancelled';
  confirmed_count: number;
  organizer?: Pick<Profile, 'name' | 'rating' | 'avatar_url'>;
}

export interface Participant {
  user_id: string;
  name: string;
  avatar_url: string | null;
  is_organizer: boolean;
}

export interface Booking {
  id: string;
  training_id: string;
  user_id: string;
  status: BookingStatus;
  created_at: string;
}

export interface RequestItem extends Booking {
  user: Pick<Profile, 'name' | 'level' | 'rating' | 'avatar_url'>;
}

export interface Message {
  id: string;
  training_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  training_id: string | null;
  text: string;
  read_at: string | null;
  created_at: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

export type SortMode = 'time' | 'distance';

export interface SearchFilters {
  sports: Sport[];
  levels: SkillLevel[];
  sort: SortMode;
  location: GeoPoint | null;
}
