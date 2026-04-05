import CustomerPortal from './CustomerPortal';

/**
 * Wrapper for CustomerPortal specifically for the /my-bookings route
 * The component itself handles the login state internally.
 */
export default function MyBookings() {
  return <CustomerPortal />;
}
