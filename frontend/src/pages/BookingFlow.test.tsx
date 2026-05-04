import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookingFlow from './BookingFlow';
import apiClient from '../api/apiClient';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import { SettingsProvider } from '../hooks/useSettings';

vi.mock('lucide-react', () => ({
  User: () => <div data-testid="icon-user" />,
  ChevronLeft: () => <div data-testid="icon-chevron-left" />,
  ChevronRight: () => <div data-testid="icon-chevron-right" />,
  CheckCircle: () => <div data-testid="icon-check-circle" />,
  AlertCircle: () => <div data-testid="icon-alert-circle" />,
  Mail: () => <div data-testid="icon-mail" />,
  Key: () => <div data-testid="icon-key" />,
  Cake: () => <div data-testid="icon-cake" />,
  Loader2: () => <div data-testid="icon-loader" />,
  Plus: () => <div data-testid="icon-plus" />,
  Minus: () => <div data-testid="icon-minus" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Scissors: () => <div data-testid="icon-scissors" />,
  Calendar: () => <div data-testid="icon-calendar" />,
  Clock: () => <div data-testid="icon-clock" />,
  CreditCard: () => <div data-testid="icon-credit-card" />,
  MapPin: () => <div data-testid="icon-map-pin" />,
  Star: () => <div data-testid="icon-star" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  Settings: () => <div data-testid="icon-settings" />,
  X: () => <div data-testid="icon-x" />,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: any) => {
      const map: Record<string, string> = {
        'booking.choose_professional': 'Pick your barber',
        'booking.barber_hint': 'Or skip — fastest match',
        'booking.any_available': 'Any available',
        'booking.fastest_match': 'Fastest match',
        'booking.soonest_opening': 'Soonest opening across the team',
        'booking.professional_barber': 'Professional Barber',
        'booking.select_services': 'What are we doing today?',
        'booking.service_hint': 'Pick one service to start.',
        'booking.date_time': 'Date & Time',
        'booking.datetime_hint': 'Times shown for your selected barber & location.',
        'booking.choose_day': 'Choose a day',
        'booking.morning': 'Morning',
        'booking.afternoon': 'Afternoon',
        'booking.evening': 'Evening',
        'booking.no_slots': 'No slots available — try another day.',
        'booking.finding_slots': 'Finding available slots…',
        'booking.confirm': 'Confirm',
        'booking.review_confirm': 'Look right?',
        'booking.confirm_hint': 'One last check before we lock it in.',
        'booking.barber': 'Barber',
        'booking.service': 'Service',
        'booking.your_details': 'Your details',
        'booking.full_name': 'Full name',
        'booking.phone': 'Phone',
        'booking.additional_notes': 'Notes (optional)',
        'booking.confirm_booking': 'Confirm booking',
        'booking.pay_at_shop': "No charge now.",
        'booking.success': "You're booked.",
        'booking.confirmed_msg': 'Booking confirmed.',
        'booking.confirmed': 'Confirmed',
        'booking.calendar_invite': 'Calendar invite by email',
        'booking.when': 'When',
        'booking.where': 'Where',
        'booking.pay_at_shop_note': "Pay at shop.",
        'booking.confirm_identity': 'Confirm identity',
        'booking.otp_hint': "Enter your email.",
        'booking.email_address': 'Email address',
        'booking.send_code': 'Send code',
        'booking.enter_code': 'Enter code',
        'booking.verify_continue': 'Verify & continue',
        'booking.resend_code': 'Resend',
        'booking.change_email': 'Change email',
        'booking.almost_there': 'Almost there',
        'booking.profile_hint': 'Fill in your details.',
        'booking.birthday': 'Birthday',
        'booking.complete_profile': 'Complete profile',
        'common.back': 'Back',
        'common.continue': 'Continue',
        'common.edit': 'Edit',
        'common.total': 'Total',
        'common.done': 'Done',
        'nav.barbers': 'Barber',
        'nav.services': 'Service',
      };
      if (typeof fallback === 'string') return map[key] || fallback;
      return map[key] || key;
    },
  }),
  Trans: ({ i18nKey, values }: any) => <span>{i18nKey}</span>,
}));

vi.mock('../api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}));

let mockUser: any = null;
vi.mock('../hooks/useAuth', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({
    user: mockUser,
    login: vi.fn(),
    updateUser: (u: any) => { mockUser = u; },
  }),
}));

const mockShopData = {
  shop: { id: 1, name: 'Test Shop', address: '123 Main St' },
  barbers: [{ id: 1, name: 'Barber One', fullname: 'Barber One Full' }],
  services: [{ id: 1, name: 'Service One', price: 100, duration_minutes: 30, description: 'A great service' }],
};

const renderWithProviders = () =>
  render(
    <MemoryRouter initialEntries={['/book/1']}>
      <AuthProvider>
        <SettingsProvider>
          <Routes>
            <Route path="/book/:shopId" element={<BookingFlow />} />
          </Routes>
        </SettingsProvider>
      </AuthProvider>
    </MemoryRouter>
  );

describe('BookingFlow Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url.includes('/public/shops/')) return Promise.resolve({ data: mockShopData });
      if (url.includes('/availability')) return Promise.resolve({ data: ['09:00', '10:00'] });
      return Promise.reject(new Error(`Not found: ${url}`));
    });
  });

  it('renders step 0 and shows barbers', async () => {
    renderWithProviders();
    await waitFor(() => expect(screen.getByText('Pick your barber')).toBeInTheDocument());
    expect(screen.getByText('Barber One Full')).toBeInTheDocument();
    expect(screen.getByText('Any available')).toBeInTheDocument();
  });

  it('advances to service step after selecting a barber and clicking Continue', async () => {
    renderWithProviders();
    await waitFor(() => screen.getByText('Barber One Full'));

    fireEvent.click(screen.getByText('Barber One Full'));
    fireEvent.click(screen.getByText('Continue'));

    expect(screen.getByText('What are we doing today?')).toBeInTheDocument();
    expect(screen.getByText('Service One')).toBeInTheDocument();
  });

  it('shows service cards and advances to date/time after selecting a service', async () => {
    renderWithProviders();
    await waitFor(() => screen.getByText('Barber One Full'));

    fireEvent.click(screen.getByText('Barber One Full'));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => screen.getByText('Service One'));
    fireEvent.click(screen.getByText('Service One'));
    fireEvent.click(screen.getByText('Continue'));

    expect(screen.getByText('Date & Time')).toBeInTheDocument();
  });

  it('displays available time slots after selecting a date', async () => {
    renderWithProviders();
    await waitFor(() => screen.getByText('Barber One Full'));

    // Navigate to date/time step
    fireEvent.click(screen.getByText('Barber One Full'));
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => screen.getByText('Service One'));
    fireEvent.click(screen.getByText('Service One'));
    fireEvent.click(screen.getByText('Continue'));

    // Select today's date chip (first button in the day strip)
    await waitFor(() => screen.getByTestId('day-strip'));
    const dayButtons = screen.getByTestId('day-strip').querySelectorAll('button');
    fireEvent.click(dayButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('/availability'),
      expect.objectContaining({ params: expect.objectContaining({ duration: 30 }) })
    );
  });

  it('shows no-slots message when availability is empty', async () => {
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url.includes('/public/shops/')) return Promise.resolve({ data: mockShopData });
      if (url.includes('/availability')) return Promise.resolve({ data: [] });
      return Promise.reject(new Error('Not found'));
    });

    renderWithProviders();
    await waitFor(() => screen.getByText('Barber One Full'));

    fireEvent.click(screen.getByText('Barber One Full'));
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => screen.getByText('Service One'));
    fireEvent.click(screen.getByText('Service One'));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => screen.getByTestId('day-strip'));
    const dayButtons = screen.getByTestId('day-strip').querySelectorAll('button');
    fireEvent.click(dayButtons[0]);

    await waitFor(() => expect(screen.getByText('No slots available — try another day.')).toBeInTheDocument());
  });

  it('navigates back between steps', async () => {
    renderWithProviders();
    await waitFor(() => screen.getByText('Barber One Full'));

    // Step 0 → 1
    fireEvent.click(screen.getByText('Barber One Full'));
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('What are we doing today?')).toBeInTheDocument();

    // Step 1 → 0 via Back
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Pick your barber')).toBeInTheDocument();
  });

  it('opens OTP modal when unauthenticated user clicks Confirm booking', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });

    renderWithProviders();
    await waitFor(() => screen.getByText('Barber One Full'));

    fireEvent.click(screen.getByText('Barber One Full'));
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => screen.getByText('Service One'));
    fireEvent.click(screen.getByText('Service One'));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => screen.getByTestId('day-strip'));
    fireEvent.click(screen.getByTestId('day-strip').querySelectorAll('button')[0]);
    await waitFor(() => screen.getByText('09:00'));
    fireEvent.click(screen.getByText('09:00'));
    fireEvent.click(screen.getByText('Continue'));

    // Confirm step
    await waitFor(() => expect(screen.getByText('Look right?')).toBeInTheDocument());
    const confirmBtn = screen.getByText(/Confirm booking/);
    fireEvent.click(confirmBtn);

    // OTP modal should appear
    await waitFor(() => expect(screen.getByText('Confirm identity')).toBeInTheDocument());
  });

  it('completes booking directly when user is already logged in', async () => {
    mockUser = { id: 1, customer_id: 10, role: 'CUSTOMER' };
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 100 } });

    renderWithProviders();
    await waitFor(() => screen.getByText('Barber One Full'));

    fireEvent.click(screen.getByText('Barber One Full'));
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => screen.getByText('Service One'));
    fireEvent.click(screen.getByText('Service One'));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => screen.getByTestId('day-strip'));
    fireEvent.click(screen.getByTestId('day-strip').querySelectorAll('button')[0]);
    await waitFor(() => screen.getByText('09:00'));
    fireEvent.click(screen.getByText('09:00'));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => expect(screen.getByText('Look right?')).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Confirm booking/));

    await waitFor(() => expect(screen.getByText("You're booked.")).toBeInTheDocument());
  });
});
