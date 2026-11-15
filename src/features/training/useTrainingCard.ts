import { useCallback, useEffect, useState } from 'react';
import { getMyStatus, getParticipants, getTraining } from '../../api/bookings';
import type { BookingStatus, Participant, Training } from '../../types';

export interface CardData {
  training: Training;
  participants: Participant[];
  myStatus: BookingStatus | null;
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'notfound' }
  | { status: 'ok'; data: CardData };

/** Дані картки. `reload()` перечитує все з сервера (використовується після дій і Realtime-подій). */
export function useTrainingCard(id: string, userId: string) {
  const [state, setState] = useState<State>({ status: 'loading' });

  const reload = useCallback(async () => {
    try {
      const [training, participants, myStatus] = await Promise.all([
        getTraining(id),
        getParticipants(id),
        getMyStatus(id, userId),
      ]);
      if (!training) setState({ status: 'notfound' });
      else setState({ status: 'ok', data: { training, participants, myStatus } });
    } catch (e) {
      // Якщо дані вже показані — лишаємо їх (банер про неактуальність показує інший шар).
      setState((s) => (s.status === 'ok' ? s : { status: 'error', message: (e as Error).message }));
      throw e;
    }
  }, [id, userId]);

  useEffect(() => {
    setState({ status: 'loading' });
    reload().catch(() => undefined);
  }, [reload]);

  return { state, reload };
}
