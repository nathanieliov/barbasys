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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (key === 'booking.choose_professional') return 'Choose a Professional';
      if (key === 'booking.select_services') return 'Select Services';
      if (key === 'booking.your_selection') return 'Your Selection';
      if (key === 'booking.total_duration') return `Total: ${options.duration} mins`;
      if (key === 'booking.continue_to_schedule') return 'Continue to Schedule';
      if (key === 'booking.pick_date_time') return 'Pick Date & Time';
      if (key === 'booking.no_slots') return 'No slots available for this date. Try another day.';
      if (key === 'booking.confirm_identity') return 'Confirm Identity';
      if (key === 'booking.enter_code') return 'Enter Code';
      if (key === 'booking.verify_continue') return 'Verify & Continue';
      if (key === 'booking.review_confirm') return 'Review & Confirm';
      if (key === 'booking.confirm_booking') return 'Confirm Booking';
      if (key === 'booking.success') return 'Success!';
      return key;
    },
  }),
  Trans: ({ children }: any) => children,
}));

vi.mock('../api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn()
  }
}));

// Global auth mock state that can be changed in tests
let mockUser: any = null;
vi.mock('../hooks/useAuth', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({
    user: mockUser,
    login: vi.fn(),
    updateUser: (u: any) => { mockUser = u; }
  })
}));

const mockShopData = {
  shop: { id: 1, name: 'Test Shop' },
  barbers: [{ id: 1, name: 'Barber One', fullname: 'Barber One Full' }],
  services: [{ id: 1, name: 'Service One', price: 100, duration_minutes: 30, description: 'Service One Description' }]
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
    mockUser = null;
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url.includes('/public/shops/')) return Promise.resolve({ data: mockShopData });
      if (url.includes('/availability')) return Promise.resolve({ data: ['09:00', '10:00'] });
      if (url.includes('/public/settings')) return Promise.resolve({ data: { currency_symbol: '$' } });
      if (url === '/auth/me') return Promise.resolve({ data: null }); // Default to not logged in
      return Promise.reject(new Error(`Not found: ${url}`));
    });
  });

  it('renders step 1 and shows barbers', async () => {
    renderWithProviders(<BookingFlow />);
    
    await waitFor(() => {
      expect(screen.getByText('Choose a Professional')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Barber One Full')).toBeInTheDocument();
  });

  it('advances to step 2 after selecting a barber and shows service description', async () => {
    renderWithProviders(<BookingFlow />);
    
    await waitFor(() => screen.getByText('Barber One Full'));
    fireEvent.click(screen.getByText('Barber One Full'));
    
    expect(screen.getByText('Select Services')).toBeInTheDocument();
    expect(screen.getByText('Service One')).toBeInTheDocument();
    expect(screen.getByText('Service One Description')).toBeInTheDocument();
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

    fireEvent.click(screen.getByText('09:00'));
    
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

  it('navigates back correctly between steps', async () => {
    renderWithProviders(<BookingFlow />);
    
    // Step 1 -> Step 2
    await waitFor(() => screen.getByText('Barber One Full'));
    fireEvent.click(screen.getByText('Barber One Full'));
    expect(screen.getByText('Select Services')).toBeInTheDocument();
    
    // Step 2 -> Step 1 (Back)
    fireEvent.click(screen.getByTestId('icon-chevron-left'));
    expect(screen.getByText('Choose a Professional')).toBeInTheDocument();
    
    // Back to Step 2
    fireEvent.click(screen.getByText('Barber One Full'));
    
    // Add service and move to Step 3
    fireEvent.click(screen.getByTestId('icon-plus').parentElement!);
    fireEvent.click(screen.getByText('Continue to Schedule'));
    expect(screen.getByText('Pick Date & Time')).toBeInTheDocument();
    
    // Step 3 -> Step 2 (Back)
    fireEvent.click(screen.getByTestId('icon-chevron-left'));
    expect(screen.getByText('Select Services')).toBeInTheDocument();
  });

  it('handles Step 4 OTP identity verification', async () => {
    vi.mocked(apiClient.post).mockImplementation((url) => {
      if (url === '/auth/otp/send') return Promise.resolve({ data: { success: true } });
      if (url === '/auth/otp/verify') return Promise.resolve({ 
        data: { 
          token: 'test-token', 
          user: { id: 1, email: 'test@example.com', customer_id: 10 },
          requires_profile_completion: false
        } 
      });
      return Promise.reject(new Error('Not found'));
    });

    renderWithProviders(<BookingFlow />);
    
    // Reach Step 3
    await waitFor(() => screen.getByText('Barber One Full'));
    fireEvent.click(screen.getByText('Barber One Full'));
    fireEvent.click(screen.getByTestId('icon-plus').parentElement!);
    fireEvent.click(screen.getByText('Continue to Schedule'));
    
    // Select Slot -> Step 4
    await waitFor(() => screen.getByText('09:00'));
    fireEvent.click(screen.getByText('09:00'));
    
    expect(screen.getByText('Confirm Identity')).toBeInTheDocument();
    
    // Send OTP
    const emailInput = screen.getByPlaceholderText('booking.email_placeholder');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByText('booking.send_code'));
    
    // Verify OTP
    await waitFor(() => expect(screen.getByText('Enter Code')).toBeInTheDocument());
    const otpInput = screen.getByPlaceholderText('123456'); // 123456 is a literal in the code
    fireEvent.change(otpInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Verify & Continue'));
    
    // Should advance to Step 5
    await waitFor(() => expect(screen.getByText('Review & Confirm')).toBeInTheDocument());
    expect(screen.getByText('Service One (x1)')).toBeInTheDocument();
  });

  it('completes the booking successfully in Step 5', async () => {
    // Mock successful booking
    vi.mocked(apiClient.post).mockImplementation((url) => {
      if (url === '/appointments') return Promise.resolve({ data: { id: 100 } });
      return Promise.reject(new Error('Not found'));
    });

    // Set logged in user for Step 5
    mockUser = { id: 1, customer_id: 10 };

    renderWithProviders(<BookingFlow />);
    
    // Advance to Step 3 (already logged in)
    await waitFor(() => screen.getByText('Barber One Full'));
    fireEvent.click(screen.getByText('Barber One Full'));
    fireEvent.click(screen.getByTestId('icon-plus').parentElement!);
    fireEvent.click(screen.getByText('Continue to Schedule'));
    
    // Step 3 -> Step 5 (since user is logged in, handleTimeSelect skips Step 4 if no profile needed)
    // Actually handleTimeSelect fetches /auth/me to check profile
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url.includes('/public/shops/')) return Promise.resolve({ data: mockShopData });
      if (url.includes('/availability')) return Promise.resolve({ data: ['09:00'] });
      if (url.includes('/public/settings')) return Promise.resolve({ data: { currency_symbol: '$' } });
      if (url === '/auth/me') return Promise.resolve({ data: { requires_profile_completion: false } });
      return Promise.reject(new Error(`Not found: ${url}`));
    });

    await waitFor(() => screen.getByText('09:00'));
    fireEvent.click(screen.getByText('09:00'));
    
    await waitFor(() => expect(screen.getByText('Review & Confirm')).toBeInTheDocument());
    
    fireEvent.click(screen.getByText('Confirm Booking'));
    
    await waitFor(() => expect(screen.getByText('Success!')).toBeInTheDocument());
  });
});
