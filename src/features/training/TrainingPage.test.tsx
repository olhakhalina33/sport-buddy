import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const card = vi.hoisted(() => ({ data: null as unknown }));

vi.mock('./useTrainingCard', () => ({
  useTrainingCard: () => ({ state: { status: 'ok', data: card.data }, reload: async () => undefined }),
}));
vi.mock('../../hooks/useAuth', () => ({ useUser: () => ({ id: 'viewer', profile: null }) }));
vi.mock('../../hooks/useRealtime', () => ({ useRealtime: () => ({ stale: false }) }));
vi.mock('../../api/chat', () => ({ newLabel: () => '', unreadCount: async () => 0 }));
vi.mock('../../components/map/MapView', () => ({ MapView: () => null }));
vi.mock('./BookingPanel', () => ({ BookingPanel: () => null }));

import { TrainingPage } from './TrainingPage';

function setTraining(over: Record<string, unknown> = {}) {
  card.data = {
    training: {
      id: 't1', title: 'Велоспорт', sport: 'cycling', level: 'beginner', starts_at: '2030-01-01T10:00:00Z',
      capacity: 10, confirmed_count: 0, organizer_id: 'org', join_mode: 'auto', place_name: 'Київ',
      lat: 50, lng: 30, description: null, status: 'open',
      organizer: { name: 'Назар', rating: null, avatar_url: null, level: 'beginner' },
      ...over,
    },
    participants: [],
    myStatus: null,
  };
}

const renderPage = () => render(<MemoryRouter><TrainingPage /></MemoryRouter>);

describe('TrainingPage', () => {
  beforeEach(() => setTraining());

  it('BUG-US2.4-TEXT-01: «Вільно: N з M»', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Учасники · Вільно: 9 з 10');
  });
  it('BUG-US2.4-TEXT-01: «Місць немає» без «(N з M)»', () => {
    setTraining({ capacity: 2, confirmed_count: 1 });
    renderPage();
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Учасники · Місць немає');
  });
});
