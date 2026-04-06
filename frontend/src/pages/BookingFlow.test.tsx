import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookingFlow from './BookingFlow';
import apiClient from '../api/apiClient';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import { SettingsProvider } from '../hooks/useSettings';

// Mock Lucide icons to avoid rendering complexity in tests
vi.mock('lucide-react', () => ({
  User: () => <div data-testid="icon-user" />,
  ChevronLeft: () => <div data-testid="icon-chevron-left" />,
  CheckCircle: () => <div data-testid="icon-check-circle" />,
  AlertCircle: () => <div data-testid="icon-alert-circle" />,
  Mail: () => <div data-testid="icon-mail" />,
  Key: () => <div data-testid="icon-key" />,
  Cake: () => <div data-testid="icon-cake" />,
  Loader2: () => <div data-testid="icon-loader" />,
  Plus: () => <div data-testid="icon-plus" />,
  Minus: () => <div data-testid="icon-minus" />,
  Trash2: () => <div data-testid="icon-trash" />
}));

vi.mock('../api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn()
  }
}));

const mockShopData = {
  shop: { id: 1, name: 'Test Shop' },
  barbers: [{ id: 1, name: 'Barber One', fullname: 'Barber One Full' }],
  services: [{ id: 1, name: 'Service One', price: 100, duration_minutes: 30 }]
};

const renderWithProviders = (ui: React.ReactNode) => {
  return render(
    <MemoryRouter initialEntries={['/book/1']}>
      <AuthProvider>
        <SettingsProvider>
          <Routes>
            <Route path="/book/:shopId" element={ui} />
          </Routes>
        </SettingsProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('BookingFlow Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url.includes('/public/shops/')) return Promise.resolve({ data: mockShopData });
      if (url.includes('/availability')) return Promise.resolve({ data: ['09:00', '10:00'] });
      return Promise.reject(new Error('Not found'));
    });
  });

  it('renders step 1 and shows barbers', async () => {
    renderWithProviders(<BookingFlow />);
    
    await waitFor(() => {
      expect(screen.getByText('Choose a Professional')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Barber One Full')).toBeInTheDocument();
  });

  it('advances to step 2 after selecting a barber', async () => {
    renderWithProviders(<BookingFlow />);
    
    await waitFor(() => screen.getByText('Barber One Full'));
    fireEvent.click(screen.getByText('Barber One Full'));
    
    expect(screen.getByText('Select Services')).toBeInTheDocument();
    expect(screen.getByText('Service One')).toBeInTheDocument();
  });

  it('manages cart correctly in step 2', async () => {
    renderWithProviders(<BookingFlow />);
    
    // Select Barber
    await waitFor(() => screen.getByText('Barber One Full'));
    fireEvent.click(screen.getByText('Barber One Full'));
    
    // Add Service
    const addButton = screen.getByTestId('icon-plus').parentElement!;
    fireEvent.click(addButton);
    
    expect(screen.getByText('Your Selection')).toBeInTheDocument();
    expect(screen.getByText('Total: 30 mins')).toBeInTheDocument();
    
    // Continue to step 3
    fireEvent.click(screen.getByText('Continue to Schedule'));
    expect(screen.getByText('Pick Date & Time')).toBeInTheDocument();
  });

  it('fetches and displays available slots in step 3', async () => {
    renderWithProviders(<BookingFlow />);
    
    // Skip to step 3 manually by simulating selections
    await waitFor(() => screen.getByText('Barber One Full'));
    fireEvent.click(screen.getByText('Barber One Full'));
    fireEvent.click(screen.getByTestId('icon-plus').parentElement!);
    fireEvent.click(screen.getByText('Continue to Schedule'));
    
    await waitFor(() => {
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
    
    // Verify API call was made with correct params
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('/availability'),
      expect.objectContaining({
        params: expect.objectContaining({ duration: 30 })
      })
    );
  });

  it('shows no slots message if empty availability', async () => {
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url.includes('/public/shops/')) return Promise.resolve({ data: mockShopData });
      if (url.includes('/availability')) return Promise.resolve({ data: [] });
      return Promise.reject(new Error('Not found'));
    });

    renderWithProviders(<BookingFlow />);
    
    fireEvent.click(await screen.findByText('Barber One Full'));
    fireEvent.click(screen.getByTestId('icon-plus').parentElement!);
    fireEvent.click(screen.getByText('Continue to Schedule'));
    
    expect(await screen.findByText('No slots available for this date. Try another day.')).toBeInTheDocument();
  });
});
