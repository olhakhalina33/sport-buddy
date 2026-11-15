import { useEffect, useRef, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../api/supabase';

export interface TableSub {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

type Payload = RealtimePostgresChangesPayload<Record<string, unknown>>;

/**
 * Підписка на зміни таблиць через Supabase Realtime.
 * Повертає `stale = true`, коли канал або мережа впали; після відновлення викликає onReconnect
 * (перечитати дані, бо події за час обриву втрачено). Відписується при виході з екрана.
 */
export function useRealtime(
  key: string,
  subs: TableSub[],
  onChange: (p: Payload) => void,
  onReconnect: () => void,
) {
  const [stale, setStale] = useState(false);
  const cb = useRef({ onChange, onReconnect });
  cb.current = { onChange, onReconnect };
  const subsKey = JSON.stringify(subs);

  useEffect(() => {
    // Перша готовність теж вважається «відновленням»: між першим завантаженням даних і моментом,
    // коли сервер реально почав надсилати postgres_changes, події могли загубитись (див. DEV_LOG №4).
    let wasDown = true;
    const down = () => {
      wasDown = true;
      setStale(true);
    };
    const up = () => {
      setStale(false);
      if (wasDown) {
        wasDown = false;
        cb.current.onReconnect();
      }
    };

    // SUBSCRIBED означає лише підключення до каналу; фільтр postgres_changes готовий,
    // коли сервер надсилає system-подію {extension: 'postgres_changes', status: 'ok'}.
    let channel = supabase
      .channel(`${key}:${Math.random().toString(36).slice(2)}`)
      .on('system' as never, {}, (p: { extension?: string; status?: string }) => {
        if (p.extension !== 'postgres_changes') return;
        if (p.status === 'ok') {
          if (navigator.onLine) up();
        } else down();
      });
    for (const s of JSON.parse(subsKey) as TableSub[]) {
      channel = channel.on(
        'postgres_changes' as never,
        { event: s.event ?? '*', schema: 'public', table: s.table, filter: s.filter },
        (p: Payload) => cb.current.onChange(p),
      );
    }
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') down();
      // 'SUBSCRIBED' не обробляємо — чекаємо system-подію готовності (вище).
    });

    const onOffline = () => down();
    const onOnline = () => {
      // Мережа повернулась: банер зникне після готовності каналу; дані перечитуємо одразу.
      cb.current.onReconnect();
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    if (!navigator.onLine) down();

    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      supabase.removeChannel(channel);
    };
  }, [key, subsKey]);

  return { stale };
}
