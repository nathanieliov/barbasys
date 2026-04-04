import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import BookingFlow from './BookingFlow';

/**
 * Component to handle direct links like /b/ramon
 * It fetches the barber details by slug and then renders the BookingFlow
 * pre-selected with that barber.
 */
export default function BarberDirect() {
  const { slug } = useParams();
  const [barber, setBarber] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get(`/public/barbers/${slug}`)
      .then(res => {
        setBarber(res.data.barber);
      })
      .catch(() => {
        setError('Professional not found');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>;
  
  if (error || !barber) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>{error || 'Not Found'}</h2>
        <p>The link might be broken or the professional is no longer available.</p>
      </div>
    );
  }

  // Render the booking flow but passing the pre-selected barber
  return <BookingFlow preSelectedBarber={barber} />;
}
