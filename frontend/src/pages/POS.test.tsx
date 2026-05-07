import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import POS from './POS';
import apiClient from '../api/apiClient';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import { SettingsProvider } from '../hooks/useSettings';

vi.mock('../api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: any, params?: any) => {
      const text = typeof fallback === 'string' ? fallback : key;
      if (params && typeof params === 'object') {
        return text.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? '');
      }
      return text;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const mockBarbers = [{ id: 1, fullname: 'Carlos', name: 'Carlos', barber_id: 1 }];
const mockServices = [{ id: 10, name: 'Cut', duration_minutes: 30, price: 25 }];

function setupApiMocks() {
  vi.mocked(apiClient.get).mockImplementation((url: string) => {
    if (url.startsWith('/settings')) return Promise.resolve({ data: { default_tax_rate: '0' } });
    if (url.startsWith('/barbers')) return Promise.resolve({ data: mockBarbers });
    if (url.startsWith('/services')) return Promise.resolve({ data: mockServices });
    if (url.startsWith('/inventory')) return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
  vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, saleId: 42 } });
}

function renderPOS() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SettingsProvider>
          <POS />
        </SettingsProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('POS receipt feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks();
  });

  it('renders POS page with services tab', async () => {
    renderPOS();
    await waitFor(() => {
      expect(screen.getByText('Cut')).toBeInTheDocument();
    });
  });
});
