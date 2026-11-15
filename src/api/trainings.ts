import { supabase, toApiError } from './supabase';
import { toRpcParams } from '../lib/filters';
import type { SearchFilters, TrainingListItem } from '../types';

export async function searchTrainings(filters: SearchFilters, signal?: AbortSignal): Promise<TrainingListItem[]> {
  let q = supabase.rpc('search_trainings', toRpcParams(filters));
  if (signal) q = q.abortSignal(signal);
  const { data, error } = await q;
  if (error) throw toApiError(error);
  return (data ?? []) as TrainingListItem[];
}
