import { supabase, toApiError } from './supabase';
import type { Message } from '../types';

export interface ChatMessage extends Message {
  author: { name: string } | null;
}

export async function isMember(trainingId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_member', { p_training: trainingId, p_user: userId });
  if (error) throw toApiError(error);
  return Boolean(data);
}

export async function getMessages(trainingId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, training_id, user_id, body, created_at, author:profiles(name)')
    .eq('training_id', trainingId)
    .order('created_at')
    .limit(300);
  if (error) throw toApiError(error);
  return (data ?? []) as unknown as ChatMessage[];
}

export async function sendMessage(trainingId: string, body: string): Promise<void> {
  const { error } = await supabase.from('messages').insert({ training_id: trainingId, body: body.trim() });
  if (error) throw toApiError(error);
}

export async function markChatRead(trainingId: string): Promise<void> {
  await supabase.rpc('mark_chat_read', { p_training_id: trainingId });
}

export async function unreadCount(trainingId: string): Promise<number> {
  const { data, error } = await supabase.rpc('chat_unread_count', { p_training_id: trainingId });
  if (error) throw toApiError(error);
  return (data as number) ?? 0;
}

/** «4 нових» з правильною формою множини. */
export function newLabel(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} нове`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} нових`;
  return `${n} нових`;
}

export function participantsLabel(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} учасник`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} учасники`;
  return `${n} учасників`;
}
