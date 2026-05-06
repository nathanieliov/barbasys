import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Schedule from './Schedule';
import apiClient from '../api/apiClient';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import { SettingsProvider } from '../hooks/useSettings';

vi.mock('../api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: any) => (typeof fallback === 'string' ? fallback : key),
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const mockBarbers = [
  { id: 1, fullname: 'Carlos Mendez', name: 'Carlos' },
];
const mockServices = [
  { id: 10, name: 'Haircut', duration_minutes: 30, price: 25 },
];
const mockAppointments = [
  {
    id: 100,
    barber_id: 1,
    service_id: 10,
    customer_id: 5,
    customer_name: 'Alice Smith',
    start_time: '2026-05-06T10:00:00',
    status: 'scheduled',
    notes: null,
  },
];

function setupApiMocks() {
  vi.mocked(apiClient.get).mockImplementation((url: string) => {
    if (url.startsWith('/barbers')) return Promise.resolve({ data: mockBarbers });
    if (url.startsWith('/services')) return Promise.resolve({ data: mockServices });
    if (url.startsWith('/appointments')) return Promise.resolve({ data: mockAppointments });
    return Promise.resolve({ data: [] });
  });
}

function renderSchedule() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SettingsProvider>
          <Schedule />
        </SettingsProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Schedule appointment detail modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks();
  });

  it('opens the appointment detail modal when an appointment chip is clicked', async () => {
    renderSchedule();

    const chip = await screen.findByText('Alice Smith');
    fireEvent.click(chip);

    // Modal title should appear (customer name as title)
    await waitFor(() => {
      expect(screen.getAllByText('Alice Smith').length).toBeGreaterThan(1); // chip + modal title
    });
  });
});
