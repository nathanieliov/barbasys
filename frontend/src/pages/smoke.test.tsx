import { describe, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import { SettingsProvider } from '../hooks/useSettings';
import apiClient from '../api/apiClient';

import Customers from './Customers';
import Settings from './Settings';
import SalesHistory from './SalesHistory';
import Shifts from './Shifts';
import Reports from './Reports';
import Users from './Users';
import Analytics from './Analytics';
import MySchedule from './MySchedule';

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
    t: (key: string, fallback?: any) => (typeof fallback === 'string' ? fallback : key),
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

function wrap(ui: React.ReactNode) {
  return (
    <MemoryRouter>
      <AuthProvider>
        <SettingsProvider>{ui}</SettingsProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Page smoke tests — Phase F coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { success: true } });
    vi.mocked(apiClient.put).mockResolvedValue({ data: { success: true } });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { success: true } });
  });

  it.each([
    ['Customers', Customers],
    ['Settings', Settings],
    ['SalesHistory', SalesHistory],
    ['Shifts', Shifts],
    ['Reports', Reports],
    ['Users', Users],
    ['Analytics', Analytics],
    ['MySchedule', MySchedule],
  ])('renders %s without crashing', (_name, Page) => {
    render(wrap(<Page />));
  });
});
