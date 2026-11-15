import { supabase, toApiError } from './supabase';
import type { AppNotification, BookingStatus, JoinMode, RequestItem, SkillLevel, Sport, Training } from '../types';

export interface CreateTrainingInput {
  title: string;
  sport: Sport;
  level: SkillLevel;
  startsAt: Date;
  placeName: string;
  lat: number;
  lng: number;
  capacity: number;
  description: string;
  joinMode: JoinMode;
}

export async function createTraining(i: CreateTrainingInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_training', {
    p_sport: i.sport,
    p_level: i.level,
    p_starts_at: i.startsAt.toISOString(),
    p_place_name: i.placeName,
    p_lat: i.lat,
    p_lng: i.lng,
    p_capacity: i.capacity,
    p_description: i.description || null,
    p_join_mode: i.joinMode,
    p_title: i.title || null,
  });
  if (error) throw toApiError(error);
  return data as string;
}

export interface OrganizerTraining extends Training {
  bookings: RequestItem[];
}

/** Мої майбутні тренування як Організатора разом із заявками (RLS віддає заявки лише Організатору). */
export async function getMyOrganizedTrainings(userId: string): Promise<OrganizerTraining[]> {
  const { data, error } = await supabase
    .from('trainings')
    .select(
      '*, bookings(id, training_id, user_id, status, created_at, user:profiles!bookings_user_id_fkey(name, level, rating, avatar_url))',
    )
    .eq('organizer_id', userId)
    .eq('status', 'open')
    .gt('starts_at', new Date().toISOString())
    .order('starts_at');
  if (error) throw toApiError(error);
  return (data ?? []) as OrganizerTraining[];
}

export interface MyBooking {
  id: string;
  status: BookingStatus;
  training: Pick<Training, 'id' | 'title' | 'starts_at' | 'status'>;
}

export async function getMyBookings(userId: string): Promise<MyBooking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, status, training:trainings(id, title, starts_at, status)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw toApiError(error);
  return ((data ?? []) as unknown as MyBooking[]).filter((b) => b.training);
}

export async function decideBooking(bookingId: string, approve: boolean): Promise<BookingStatus> {
  const { data, error } = await supabase.rpc('decide_booking', { p_booking_id: bookingId, p_approve: approve });
  if (error) throw toApiError(error);
  return data as BookingStatus;
}

export async function removeParticipant(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_participant', { p_booking_id: bookingId });
  if (error) throw toApiError(error);
}

export async function getNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, training_id, text, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw toApiError(error);
  return (data ?? []) as AppNotification[];
}

export async function countUnreadNotifications(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw toApiError(error);
  return count ?? 0;
}

export async function markNotificationsRead(): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (error) throw toApiError(error);
}
