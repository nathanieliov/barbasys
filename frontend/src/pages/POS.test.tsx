import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
const mockProducts = [{ id: 20, name: 'Pomade', price: 15, stock: 10 }];

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

function setupApiMocksWithProducts() {
  vi.mocked(apiClient.get).mockImplementation((url: string) => {
    if (url.startsWith('/settings')) return Promise.resolve({ data: { default_tax_rate: '0' } });
    if (url.startsWith('/barbers')) return Promise.resolve({ data: mockBarbers });
    if (url.startsWith('/services')) return Promise.resolve({ data: mockServices });
    if (url.startsWith('/inventory')) return Promise.resolve({ data: mockProducts });
    return Promise.resolve({ data: [] });
  });
  vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, saleId: 42 } });
}

describe('POS tab switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocksWithProducts();
  });

  it('defaults to Services tab with services visible', async () => {
    renderPOS();
    const servicesTab = await screen.findByRole('button', { name: /^services$/i });
    expect(servicesTab).toHaveClass('active');
    expect(await screen.findByText('Cut')).toBeInTheDocument();
  });

  it('clicking Products tab makes it active and hides services', async () => {
    renderPOS();
    await screen.findByText('Cut'); // wait for data load

    const productsTab = screen.getByRole('button', { name: /^products$/i });
    fireEvent.click(productsTab);

    expect(productsTab).toHaveClass('active');
    expect(screen.queryByText('Cut')).not.toBeInTheDocument();
  });

  it('clicking Products tab shows product tiles', async () => {
    renderPOS();
    await screen.findByText('Cut');

    fireEvent.click(screen.getByRole('button', { name: /^products$/i }));

    expect(await screen.findByText('Pomade')).toBeInTheDocument();
  });

  it('clicking a product tile on the Products tab adds it to the cart', async () => {
    renderPOS();
    await screen.findByText('Cut');

    fireEvent.click(screen.getByRole('button', { name: /^products$/i }));
    fireEvent.click(await screen.findByText('Pomade'));

    // Quantity controls only render when the cart has items
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /decrease quantity/i })).toBeInTheDocument();
    });
  });

  it('switching back to Services tab hides products and shows services', async () => {
    renderPOS();
    await screen.findByText('Cut');

    fireEvent.click(screen.getByRole('button', { name: /^products$/i }));
    await screen.findByText('Pomade');

    fireEvent.click(screen.getByRole('button', { name: /^services$/i }));

    expect(await screen.findByText('Cut')).toBeInTheDocument();
    expect(screen.queryByText('Pomade')).not.toBeInTheDocument();
  });
});

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

  // Helper: drive a sale from cart to success state with no contact info.
  // The i18n mock returns the key when no fallback string is supplied to t(),
  // so review/checkout buttons appear with their literal key names. Buttons
  // that pass a fallback render as the fallback (e.g. "Send receipt").
  async function ringUpSaleWithoutContact() {
    renderPOS();
    const tile = await screen.findByText('Cut');
    fireEvent.click(tile);

    // Select a barber — required before checkout can open
    const barberSelect = await screen.findByDisplayValue(/select_professional/i);
    fireEvent.change(barberSelect, { target: { value: '1' } });

    // "Review & Checkout" — t('pos.review_checkout') has no fallback => key text
    const reviewButton = await screen.findByRole('button', {
      name: /review_checkout|review & checkout|review.*checkout/i,
    });
    fireEvent.click(reviewButton);
    // "Complete Payment" — t('pos.complete_payment') has no fallback => key text
    const completeButton = await screen.findByRole('button', {
      name: /complete_payment|complete payment|completar pago/i,
    });
    fireEvent.click(completeButton);
    // Success heading — t('pos.payment_successful') has no fallback => key text
    await screen.findByText(/payment_successful|payment successful|pago exitoso/i);
  }

  it('blocks checkout and shows error when no barber is selected', async () => {
    renderPOS();
    const tile = await screen.findByText('Cut');
    fireEvent.click(tile);

    const reviewButton = await screen.findByRole('button', {
      name: /review_checkout|review & checkout|review.*checkout/i,
    });
    fireEvent.click(reviewButton);

    await screen.findByText(/select_barber_required|select a professional|seleccione un profesional/i);
    expect(screen.queryByText(/complete_payment|complete payment/i)).not.toBeInTheDocument();
  });

  it('shows "no contact info" + Send receipt button when contact was empty', async () => {
    await ringUpSaleWithoutContact();
    expect(screen.getByText(/no contact info captured/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send receipt' })).toBeInTheDocument();
  });

  it('opens the resend modal when Send receipt is clicked', async () => {
    await ringUpSaleWithoutContact();
    fireEvent.click(screen.getByRole('button', { name: 'Send receipt' }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/alice@example/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/\+1 555/)).toBeInTheDocument();
    });
  });

  it('blocks submit when both fields are empty', async () => {
    await ringUpSaleWithoutContact();
    fireEvent.click(screen.getByRole('button', { name: 'Send receipt' }));
    const sendBtn = await screen.findByRole('button', { name: 'Send' });
    fireEvent.click(sendBtn);

    await screen.findByText(/at least|al menos/i);
    expect(apiClient.post).not.toHaveBeenCalledWith(
      expect.stringContaining('/resend-receipt'),
      expect.anything()
    );
  });

  it('POSTs to resend-receipt with email and updates the card', async () => {
    vi.mocked(apiClient.post).mockImplementation((url: string) => {
      if (url.includes('/resend-receipt')) return Promise.resolve({ data: { success: true, channels: ['email'] } });
      return Promise.resolve({ data: { success: true, saleId: 42 } });
    });

    await ringUpSaleWithoutContact();
    fireEvent.click(screen.getByRole('button', { name: 'Send receipt' }));

    const emailInput = await screen.findByPlaceholderText(/alice@example/i);
    fireEvent.change(emailInput, { target: { value: 'alice@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/sales/42/resend-receipt', { email: 'alice@example.com', phone: null });
    });
    await waitFor(() => {
      expect(screen.getByText(/receipt sent to alice@example\.com/i)).toBeInTheDocument();
    });
  });
});
