import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { BookingStatus, Training } from '../../types';

vi.mock('../../api/bookings', () => ({ bookTraining: vi.fn(async () => 'pending'), cancelBooking: vi.fn(async () => ({ late: false })) }));
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ profile: null }) }));

import { BookingPanel } from './BookingPanel';

const training = {
  id: 't1', level: 'beginner', capacity: 2, confirmed_count: 0, status: 'open', join_mode: 'approval',
  starts_at: '2030-01-01T10:00:00Z',
} as unknown as Training;

const NOTICE = 'Заявку надіслано. Очікуйте рішення Організатора.';

const panel = (myStatus: BookingStatus | null) => (
  <MemoryRouter>
    <BookingPanel training={training} isOrganizer={false} myStatus={myStatus} onChanged={async () => undefined} />
  </MemoryRouter>
);

describe('BookingPanel', () => {
  it('BUG-US2.3-MSG-01: «Очікуйте рішення» зникає, коли статус змінився (realtime)', async () => {
    const { rerender } = render(panel(null));
    fireEvent.click(screen.getByRole('button', { name: 'Забронювати слот' }));
    expect(await screen.findByText(NOTICE)).toBeInTheDocument();

    rerender(panel('pending')); // перечитування після заявки — повідомлення лишається
    expect(screen.getByText(NOTICE)).toBeInTheDocument();

    rerender(panel('confirmed')); // Організатор підтвердив в іншому вікні
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ви записані' })).toBeDisabled();
  });
  it('скасування: «Заявку скасовано.» не зникає до перечитування статусу', async () => {
    const { rerender } = render(panel('confirmed'));
    fireEvent.click(screen.getByRole('button', { name: 'Скасувати заявку' }));
    fireEvent.click(screen.getByRole('button', { name: 'Так, скасувати' }));
    expect(await screen.findByText('Заявку скасовано.')).toBeInTheDocument();
    rerender(panel('cancelled'));
    expect(screen.getByText('Заявку скасовано.')).toBeInTheDocument();
  });
});
