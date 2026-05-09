import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Catalog from './Catalog';
import apiClient from '../api/apiClient';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';

vi.mock('lucide-react', () => ({
  Scissors: () => <div data-testid="icon-scissors" />,
  Package: () => <div data-testid="icon-package" />,
  Edit2: () => <div data-testid="icon-edit" />,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: any) => {
      const map: Record<string, string> = {
        'catalog.title': 'Products & Services',
        'catalog.categories': 'Categories',
        'catalog.newService': 'New service',
        'catalog.newProduct': 'New product',
        'catalog.tabServices': 'Services',
        'catalog.tabProducts': 'Products',
        'catalog.colService': 'Service',
        'catalog.colDuration': 'Duration',
        'catalog.colPrice': 'Price',
        'catalog.colBookedWk': 'Booked / wk',
        'catalog.colProduct': 'Product',
        'catalog.colSku': 'SKU',
        'catalog.colStock': 'Stock',
        'catalog.colSoldWk': 'Sold / wk',
        'catalog.inactive': 'Inactive',
        'catalog.outOfStock': 'Out of stock',
        'catalog.lowStock': 'Low',
        'catalog.editService': 'Edit service',
        'catalog.editProduct': 'Edit product',
        'common.loading': 'Loading...',
      };
      if (typeof fallback === 'string') return map[key] || fallback;
      return map[key] || key;
    },
  }),
}));

vi.mock('../api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../hooks/useAuth', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({
    user: { id: 1, username: 'admin', role: 'OWNER', shop_id: 1 },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const MOCK_SERVICES = [
  { id: 1, name: 'Fade', price: 25, duration_minutes: 30, is_active: true },
  { id: 2, name: 'Beard Trim', price: 15, duration_minutes: 15, is_active: true },
];

const MOCK_PRODUCTS = [
  { id: 1, name: 'Pomade', price: 18, stock: 0, min_stock_threshold: 5 },
  { id: 2, name: 'Shampoo', price: 12, stock: 3, min_stock_threshold: 5 },
  { id: 3, name: 'Conditioner', price: 14, stock: 20, min_stock_threshold: 5 },
];

const renderCatalog = () =>
  render(
    <MemoryRouter initialEntries={['/catalog']}>
      <AuthProvider>
        <Routes>
          <Route path="/catalog" element={<Catalog />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

describe('Catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/services') return Promise.resolve({ data: MOCK_SERVICES });
      if (url === '/inventory') return Promise.resolve({ data: MOCK_PRODUCTS });
      return Promise.resolve({ data: [] });
    });
  });

  it('renders services tab by default and shows service rows', async () => {
    renderCatalog();
    await waitFor(() => expect(screen.getByText('Fade')).toBeTruthy());
    expect(screen.getByText('Beard Trim')).toBeTruthy();
    expect(screen.getByText('30 min')).toBeTruthy();
    expect(screen.getByText('15 min')).toBeTruthy();
  });

  it('header counts reflect the mocked data lengths', async () => {
    renderCatalog();
    await waitFor(() => expect(screen.getByText('Fade')).toBeTruthy());
    expect(screen.getByText(/2 services/i)).toBeTruthy();
    expect(screen.getByText(/3 products/i)).toBeTruthy();
  });

  it('switching to Products tab shows product rows with SKU codes', async () => {
    renderCatalog();
    await waitFor(() => expect(screen.getByText('Fade')).toBeTruthy());
    fireEvent.click(screen.getByRole('tab', { name: /products/i }));
    await waitFor(() => expect(screen.getByText('Pomade')).toBeTruthy());
    expect(screen.getByText('BBS-0001')).toBeTruthy();
    expect(screen.getByText('Conditioner')).toBeTruthy();
  });

  it('out-of-stock product shows danger chip; low-stock shows warn chip', async () => {
    renderCatalog();
    await waitFor(() => expect(screen.getByText('Fade')).toBeTruthy());
    fireEvent.click(screen.getByRole('tab', { name: /products/i }));
    await waitFor(() => expect(screen.getByText('Pomade')).toBeTruthy());

    const dangerChip = screen.getByText('Out of stock');
    expect(dangerChip.className).toContain('chip-danger');

    const warnChip = screen.getByText('Low (3)');
    expect(warnChip.className).toContain('chip-warn');
  });
});
