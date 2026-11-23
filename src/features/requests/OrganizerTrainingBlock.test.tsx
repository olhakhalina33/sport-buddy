import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { OrganizerTraining } from '../../api/organizer';

vi.mock('../../api/organizer', () => ({ decideBooking: vi.fn(), removeParticipant: vi.fn() }));

import { OrganizerTrainingBlock } from './OrganizerTrainingBlock';

const user = { name: 'Вітас', level: 'beginner', rating: null, avatar_url: null };
const training = {
  id: 't1',
  title: 'Біг вдвох',
  starts_at: '2030-01-01T10:00:00Z',
  capacity: 5,
  confirmed_count: 1,
  bookings: [
    { id: 'b1', training_id: 't1', user_id: 'u1', status: 'pending', created_at: '', user },
    { id: 'b2', training_id: 't1', user_id: 'u2', status: 'confirmed', created_at: '', user: { ...user, name: 'Олена' } },
  ],
} as unknown as OrganizerTraining;

const renderBlock = () =>
  render(
    <MemoryRouter>
      <OrganizerTrainingBlock training={training} onChanged={async () => undefined} />
    </MemoryRouter>,
  );

describe('OrganizerTrainingBlock', () => {
  it('BUG-US1.2-STATUS-01: статус «Очікує рішення» видимий на картці заявки', () => {
    renderBlock();
    const status = screen.getByText('Очікує рішення');
    expect(status).not.toHaveClass('sr-only');
    expect(status).toHaveClass('text-warning');
  });
});
