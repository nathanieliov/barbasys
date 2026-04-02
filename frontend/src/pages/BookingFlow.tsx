import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { Calendar, Scissors, User, ChevronLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function BookingFlow() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [shop, setShop] = useState<any>(null);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  
  const [selectedBarber, setSelectedBarber] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiClient.get(`/public/shops/${shopId}`).then(res => {
      setShop(res.data.shop);
      setBarbers(res.data.barbers);
      setServices(res.data.services);
    }).finally(() => setLoading(false));
  }, [shopId]);

  const handleBook = async () => {
    setSubmitting(true);
    setError('');
    try {
      await apiClient.post('/appointments', {
        barber_id: selectedBarber.id,
        service_id: selectedService.id,
        customer_id: user?.customer_id || null,
        start_time: `${selectedDate}T${selectedTime}:00`,
        shop_id: parseInt(shopId!),
        notes
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to book appointment. Please try another time.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>;

  if (success) {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
        <div style={{ background: 'var(--success)', color: 'white', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' }}>
          <CheckCircle size={48} />
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '1rem' }}>Booking Confirmed!</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', lineHeight: '1.6' }}>
          We've scheduled your <strong>{selectedService.name}</strong> with <strong>{selectedBarber.fullname || selectedBarber.name}</strong> at <strong>{shop.name}</strong>.
        </p>
        <button className="primary" style={{ width: '100%', padding: '1.25rem' }} onClick={() => navigate('/')}>
          Go to My Dashboard
        </button>
      </div>
    );
  }

  const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '1rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="secondary" style={{ padding: '0.5rem', borderRadius: '0.75rem' }} onClick={() => step > 1 ? setStep(step - 1) : navigate('/discovery')}>
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.25rem', marginBottom: 0 }}>{shop.name}</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Step {step} of 4</p>
        </div>
      </header>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', fontWeight: '600' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {step === 1 && (
        <section>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>Choose a Professional</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {barbers.map(b => (
              <div key={b.id} className={`card ${selectedBarber?.id === b.id ? 'active' : ''}`} style={{ padding: '1rem', cursor: 'pointer', border: selectedBarber?.id === b.id ? '2px solid var(--primary)' : '1px solid var(--border)' }} onClick={() => { setSelectedBarber(b); setStep(2); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                    {(b.fullname || b.name).charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700' }}>{b.fullname || b.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expert Barber</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>Select a Service</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {services.map(s => (
              <div key={s.id} className={`card ${selectedService?.id === s.id ? 'active' : ''}`} style={{ padding: '1.25rem', cursor: 'pointer', border: selectedService?.id === s.id ? '2px solid var(--primary)' : '1px solid var(--border)' }} onClick={() => { setSelectedService(s); setStep(3); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.duration_minutes} mins</div>
                  </div>
                  <div style={{ fontWeight: '800', color: 'var(--primary)' }}>${s.price}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>Pick Date & Time</h2>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>DATE</label>
            <input 
              type="date" 
              value={selectedDate} 
              min={new Date().toISOString().split('T')[0]}
              max={new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0]}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ fontSize: '1.1rem', fontWeight: '700' }}
            />
          </div>
          
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>AVAILABLE TIMES</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {times.map(t => (
              <button 
                key={t} 
                className={selectedTime === t ? 'primary' : 'secondary'}
                onClick={() => { setSelectedTime(t); setStep(4); }}
                style={{ padding: '0.75rem 0', fontSize: '0.9rem', fontWeight: '700' }}
              >
                {t}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 4 && (
        <section>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>Review & Confirm</h2>
          <div className="card" style={{ padding: '1.5rem', background: '#f9fafb', marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Scissors size={20} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Service</div>
                  <div style={{ fontWeight: '700' }}>{selectedService.name} (${selectedService.price})</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <User size={20} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Barber</div>
                  <div style={{ fontWeight: '700' }}>{selectedBarber.fullname || selectedBarber.name}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Calendar size={20} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Date & Time</div>
                  <div style={{ fontWeight: '700' }}>{selectedDate} at {selectedTime}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>ADDITIONAL NOTES</label>
            <textarea 
              placeholder="Any special requests? (e.g. skin fade preference)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ minHeight: '100px' }}
            />
          </div>

          <button className="primary" style={{ width: '100%', padding: '1.25rem', fontSize: '1.1rem' }} onClick={handleBook} disabled={submitting}>
            {submitting ? 'Confirming Booking...' : 'Complete Booking'}
          </button>
        </section>
      )}
    </div>
  );
}
