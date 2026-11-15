import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useUser } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { StaleBanner } from '../../components/ui/StaleBanner';
import { fieldClass } from '../../components/ui/fieldClass';
import { getMessages, isMember, markChatRead, participantsLabel, sendMessage, type ChatMessage } from '../../api/chat';
import { getParticipants, getTraining } from '../../api/bookings';
import { formatWhen } from '../../lib/dates';
import type { Participant, Training } from '../../types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'forbidden' }
  | { status: 'ok'; training: Training; participants: Participant[] };

function shortName(name: string) {
  const [first, last] = name.trim().split(/\s+/);
  return last ? `${first} ${last.charAt(0)}.` : (first ?? name);
}

export function ChatPage() {
  const { id = '' } = useParams();
  const user = useUser();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      if (!(await isMember(id, user.id))) return setState({ status: 'forbidden' });
      const [training, participants, msgs] = await Promise.all([getTraining(id), getParticipants(id), getMessages(id)]);
      if (!training) return setState({ status: 'error', message: 'Тренування не знайдено' });
      setState({ status: 'ok', training, participants });
      setMessages(msgs);
      markChatRead(id);
    } catch (e) {
      setState((s) => (s.status === 'ok' ? s : { status: 'error', message: (e as Error).message }));
    }
  }, [id, user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const participants = useMemo(() => (state.status === 'ok' ? state.participants : []), [state]);
  const organizerId = state.status === 'ok' ? state.training.organizer_id : null;

  const onChange = useCallback(
    (p: { new: Record<string, unknown> }) => {
      const m = p.new as unknown as ChatMessage;
      const author = participants.find((x) => x.user_id === m.user_id);
      setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, { ...m, author: author ? { name: author.name } : null }]));
      markChatRead(id);
    },
    [participants, id],
  );

  const { stale } = useRealtime(
    `chat-${id}`,
    state.status === 'ok' ? [{ table: 'messages', event: 'INSERT', filter: `training_id=eq.${id}` }] : [],
    onChange,
    load,
  );

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await sendMessage(id, body);
      setText(''); // текст очищаємо лише після успіху — при обриві мережі він не губиться
      if (stale) load();
    } catch (err) {
      setSendError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const back = (
    <Link to={`/training/${id}`} className="mb-4 inline-block text-p font-bold text-accent hover:underline">
      ← Назад
    </Link>
  );

  if (state.status === 'loading')
    return (<>{back}<div role="status" aria-label="Завантаження" className="flex flex-col gap-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-16 w-3/4" /><Skeleton className="ml-auto h-16 w-2/3" /></div></>);
  if (state.status === 'forbidden')
    return (<>{back}<EmptyState title="Чат доступний лише Організатору й підтвердженим учасникам" /></>);
  if (state.status === 'error') return (<>{back}<ErrorState message={state.message} onRetry={load} /></>);

  const t = state.training;
  const shortTitle = t.title.split(' у ')[0]?.split(' на ')[0] ?? t.title;

  return (
    <div className="flex min-h-[calc(100dvh-11rem)] flex-col">
      <StaleBanner show={stale} />
      {back}
      <h1 className="text-h4 break-words">{shortTitle} · чат</h1>
      <p className="mt-2 text-p font-normal text-muted">
        {participantsLabel(participants.length)} · {formatWhen(t.starts_at).toLowerCase()}
      </p>

      <ol aria-label="Повідомлення" aria-live="polite" className="mt-6 flex flex-1 flex-col gap-4">
        {messages.length === 0 && <li className="text-p font-normal text-muted">Повідомлень ще немає. Напишіть першим!</li>}
        {messages.map((m) => {
          const mine = m.user_id === user.id;
          const name = shortName(m.author?.name ?? 'Колишній учасник');
          return (
            <li key={m.id} className={`flex max-w-[78%] flex-col gap-1 animate-fade-up ${mine ? 'self-end items-end' : 'self-start'}`}>
              {!mine && (
                <span className="text-p font-normal text-muted">
                  {name}
                  {m.user_id === organizerId && ' · організатор'}
                </span>
              )}
              {/* Текст повідомлення — звичайний текстовий вузол React (екранується), без dangerouslySetInnerHTML. */}
              <p
                className={`whitespace-pre-wrap break-words rounded-2xl px-5 py-3 text-[15px] ${
                  mine ? 'bg-accent text-accent-fg' : 'border border-line-off bg-surface'
                }`}
              >
                <span className="sr-only">{mine ? 'Ви: ' : `${name}: `}</span>
                {m.body}
              </p>
            </li>
          );
        })}
        <div ref={bottom} />
      </ol>

      <form onSubmit={send} className="sticky bottom-20 mt-6 flex flex-col gap-2 bg-page pt-2">
        <label htmlFor="chat-input" className="text-p text-muted">Повідомлення</label>
        <div className="flex gap-3">
          <input
            id="chat-input"
            value={text}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
            className={`h-12 min-w-0 flex-1 ${fieldClass()}`}
            autoComplete="off"
          />
          <Button type="submit" loading={sending} disabled={!text.trim()}>
            Надіслати
          </Button>
        </div>
        {sendError && <p role="alert" className="text-p text-danger">{sendError}</p>}
      </form>
    </div>
  );
}
