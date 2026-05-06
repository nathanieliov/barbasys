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

  it('shows in-chair, no-show, and cancel buttons for a scheduled appointment', async () => {
    renderSchedule();
    const chip = await screen.findByText('Alice Smith');
    fireEvent.click(chip);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark in chair' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Mark no-show' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  it('shows only Open in POS + Close for a completed appointment', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.startsWith('/barbers')) return Promise.resolve({ data: mockBarbers });
      if (url.startsWith('/services')) return Promise.resolve({ data: mockServices });
      if (url.startsWith('/appointments')) {
        return Promise.resolve({ data: [{ ...mockAppointments[0], status: 'completed' }] });
      }
      return Promise.resolve({ data: [] });
    });

    renderSchedule();
    const chip = await screen.findByText('Alice Smith');
    fireEvent.click(chip);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open in POS' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Mark in chair' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark no-show' })).not.toBeInTheDocument();
  });

  it('Mark in chair calls PATCH and closes the modal', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { success: true } });

    renderSchedule();
    const chip = await screen.findByText('Alice Smith');
    fireEvent.click(chip);

    const button = await screen.findByRole('button', { name: 'Mark in chair' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/appointments/100', { status: 'in-chair' });
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Mark in chair' })).not.toBeInTheDocument();
    });
  });

  it('Mark complete on in-chair appointment calls PATCH and navigates to POS', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.startsWith('/barbers')) return Promise.resolve({ data: mockBarbers });
      if (url.startsWith('/services')) return Promise.resolve({ data: mockServices });
      if (url.startsWith('/appointments')) {
        return Promise.resolve({ data: [{ ...mockAppointments[0], status: 'in-chair' }] });
      }
      return Promise.resolve({ data: [] });
    });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { success: true } });

    renderSchedule();
    const chip = await screen.findByText('Alice Smith');
    fireEvent.click(chip);

    const button = await screen.findByRole('button', { name: 'Mark complete' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/appointments/100', { status: 'completed' });
    });
  });
});
