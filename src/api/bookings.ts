import { supabase, toApiError } from './supabase';
import type { BookingStatus, Participant, Training } from '../types';

export async function getTraining(id: string): Promise<Training | null> {
  const { data, error } = await supabase
    .from('trainings')
    .select('*, organizer:profiles!trainings_organizer_id_fkey(name, rating, avatar_url)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw toApiError(error);
  return data as Training | null;
}

export async function getParticipants(trainingId: string): Promise<Participant[]> {
  const { data, error } = await supabase.rpc('get_participants', { p_training_id: trainingId });
  if (error) throw toApiError(error);
  return (data ?? []) as Participant[];
}

export async function getMyStatus(trainingId: string, userId: string): Promise<BookingStatus | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('status')
    .eq('training_id', trainingId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw toApiError(error);
  return (data?.status as BookingStatus | undefined) ?? null;
}

/** Атомарний запис (RPC з блокуванням рядка). Повторний виклик повертає поточний статус. */
export async function bookTraining(trainingId: string): Promise<BookingStatus> {
  const { data, error } = await supabase.rpc('book_training', { p_training_id: trainingId });
  if (error) throw toApiError(error);
  return data as BookingStatus;
}

export async function cancelBooking(trainingId: string): Promise<{ late: boolean }> {
  const { data, error } = await supabase.rpc('cancel_booking', { p_training_id: trainingId });
  if (error) throw toApiError(error);
  return data as { late: boolean };
}
