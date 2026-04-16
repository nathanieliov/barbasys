import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { User, ChevronLeft, CheckCircle, AlertCircle, Mail, Key, Cake, Loader2, Plus, Minus, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/format';

interface BookingFlowProps {
  preSelectedBarber?: any;
}

export default function BookingFlow({ preSelectedBarber }: BookingFlowProps) {
  const { shopId: routeShopId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const { settings } = useSettings();
  
  const rescheduleId = location.state?.rescheduleId;
  const initialBarberId = location.state?.barberId;

  const [step, setStep] = useState(preSelectedBarber || initialBarberId ? 2 : 1);
  const [shop, setShop] = useState<any>(null);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  
  const [selectedBarber, setSelectedBarber] = useState<any>(preSelectedBarber || null);
  const [cart, setCart] = useState<Array<{ id: number, name: string, price: number, duration: number, quantity: number }>>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState(location.state?.notes || '');
  
  // Auth & Profile State
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState<'ID' | 'OTP'>('ID');
  const [fullname, setFullname] = useState('');
  const [birthday, setBirthday] = useState('');
  const [requiresProfile, setRequiresProfile] = useState(false);

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const shopId = preSelectedBarber?.shop_id || routeShopId;

  useEffect(() => {
    if (shopId) {
      apiClient.get(`/public/shops/${shopId}`).then(res => {
        setShop(res.data.shop);
        setBarbers(res.data.barbers);
        setServices(res.data.services);
        
        // Auto-select barber if initialBarberId is provided (rescheduling)
        if (initialBarberId && res.data.barbers) {
          const b = res.data.barbers.find((barber: any) => barber.id === initialBarberId);
          if (b) setSelectedBarber(b);
        }
      }).finally(() => setLoading(false));

      // Pre-load cart for rescheduling
      if (rescheduleId) {
        apiClient.get(`/appointments/${rescheduleId}/items`).then(res => {
          const loadedCart = res.data.map((item: any) => ({
            id: item.service_id,
            name: item.name,
            price: item.price,
            duration: item.duration_minutes,
            quantity: item.quantity
          }));
          setCart(loadedCart);
        }).catch(err => {
          console.error('Failed to pre-load appointment items', err);
        });
      }
    }
  }, [shopId, initialBarberId, rescheduleId]);

  // Handle auto-advancing after login
  useEffect(() => {
    if (user?.customer_id && step === 4 && !requiresProfile) {
      setStep(5);
    }
  }, [user, step, requiresProfile]);

  useEffect(() => {
    if (selectedBarber && selectedDate && cart.length > 0) {
      const totalDur = cart.reduce((sum, item) => sum + (item.duration * item.quantity), 0);
      setLoadingSlots(true);
      apiClient.get(`/public/barbers/${selectedBarber.id}/availability`, {
        params: { date: selectedDate, duration: totalDur }
      }).then(res => {
        setAvailableSlots(res.data);
      }).catch(err => {
        console.error('Failed to fetch slots', err);
      }).finally(() => {
        setLoadingSlots(false);
      });
    }
  }, [selectedBarber, selectedDate, cart]);

  const addToCart = (service: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === service.id);
      if (existing) {
        return prev.map(item => item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: service.id, name: service.name, price: service.price, duration: service.duration_minutes, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDuration = cart.reduce((sum, item) => sum + (item.duration * item.quantity), 0);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await apiClient.post('/auth/otp/send', { email });
      setOtpStep('OTP');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await apiClient.post('/auth/otp/verify', { email, code: otp });
      login(res.data.token, res.data.user);
      if (res.data.requires_profile_completion) {
        setRequiresProfile(true);
      } else {
        setRequiresProfile(false);
        setStep(5);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setSubmitting(true);
    try {
      await apiClient.post('/auth/otp/send', { email });
      alert('Verification code resent!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.patch('/auth/profile', { fullname, birthday });
      // Logic inside backend will update the customer record
      setStep(5);
    } catch (err) {
      setError('Failed to save profile info.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBook = async () => {
    setSubmitting(true);
    setError('');
    
    // Ensure shopId is correct
    const finalShopId = selectedBarber?.shop_id || shopId;

    try {
      if (rescheduleId) {
        await apiClient.put(`/appointments/${rescheduleId}`, {
          barber_id: selectedBarber.id,
          services: cart.map(item => ({ id: item.id, quantity: item.quantity })),
          start_time: `${selectedDate}T${selectedTime}:00`,
          notes
        });
      } else {
        await apiClient.post('/appointments', {
          barber_id: selectedBarber.id,
          services: cart.map(item => ({ id: item.id, quantity: item.quantity })),
          customer_id: user?.customer_id || null,
          start_time: `${selectedDate}T${selectedTime}:00`,
          shop_id: finalShopId ? parseInt(finalShopId.toString()) : null,
          notes
        });
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to book appointment.');
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
        <h1 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '1rem' }}>{rescheduleId ? 'Updated!' : 'Success!'}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
          Your appointment at <strong>{shop?.name}</strong> is {rescheduleId ? 'updated' : 'confirmed'}.
        </p>
        <button className="primary" style={{ width: '100%', padding: '1.25rem' }} onClick={() => navigate('/my-bookings')}>
          Go to My Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="booking-flow" style={{ maxWidth: '500px', margin: '0 auto', padding: '1rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="secondary" style={{ padding: '0.5rem', borderRadius: '0.75rem' }} onClick={() => step > 1 ? setStep(step - 1) : navigate('/discovery')}>
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.25rem', marginBottom: 0 }}>{shop?.name}</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedBarber ? `Booking with ${selectedBarber.fullname || selectedBarber.name}` : 'New Appointment'}</p>
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
              <div key={b.id} className="card" style={{ padding: '1rem', cursor: 'pointer', border: '1px solid var(--border)' }} onClick={() => { setSelectedBarber(b); setStep(2); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                    {(b.fullname || b.name).charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700' }}>{b.fullname || b.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Professional Barber</div>
                  </div>
                  <ChevronLeft size={18} style={{ transform: 'rotate(180deg)', opacity: 0.3 }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>Select Services</h2>
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
            {services.map(s => (
              <div key={s.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700' }}>{s.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.duration_minutes} mins • {formatCurrency(s.price, settings.currency_symbol)}</div>
                </div>
                <button className="secondary" style={{ padding: '0.5rem' }} onClick={() => addToCart(s)}>
                  <Plus size={18} />
                </button>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div className="card" style={{ padding: '1.25rem', background: '#f9fafb', border: '1px solid var(--primary)', position: 'sticky', bottom: '1rem' }}>
              <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '1rem', color: 'var(--primary)' }}>Your Selection</h3>
              <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{item.name} x{item.quantity}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button className="secondary" style={{ padding: '0.25rem' }} onClick={() => updateQuantity(item.id, -1)}><Minus size={14} /></button>
                      <button className="secondary" style={{ padding: '0.25rem' }} onClick={() => updateQuantity(item.id, 1)}><Plus size={14} /></button>
                      <button className="secondary" style={{ padding: '0.25rem', color: 'var(--danger)' }} onClick={() => removeFromCart(item.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                <span>Total: {totalDuration} mins</span>
                <span>{formatCurrency(totalAmount, settings.currency_symbol)}</span>
              </div>
              <button className="primary" style={{ width: '100%', marginTop: '1.25rem' }} onClick={() => setStep(3)}>Continue to Schedule</button>
            </div>
          )}
        </section>
      )}

      {step === 3 && (
        <section>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>Pick Date & Time</h2>
          <input type="date" value={selectedDate} min={new Date().toISOString().split('T')[0]} onChange={e => setSelectedDate(e.target.value)} style={{ fontSize: '1.1rem', fontWeight: '700' }} />
          
          <div style={{ marginTop: '1.5rem' }}>
            {loadingSlots ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Loader2 size={32} className="spinner" style={{ margin: '0 auto' }} />
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Finding free slots...</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem', border: '1px dashed var(--border)' }}>
                <AlertCircle size={32} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                <p style={{ color: 'var(--text-muted)' }}>No slots available for this date. Try another day.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {availableSlots.map(t => (
                  <button key={t} className="secondary" onClick={() => { setSelectedTime(t); setStep(user ? 5 : 4); }} style={{ padding: '0.75rem 0', fontWeight: '700' }}>{t}</button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {step === 4 && (
        <section>
          {!requiresProfile ? (
            otpStep === 'ID' ? (
              <form onSubmit={handleSendOTP}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.5rem' }}>Confirm Identity</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>We'll send a code to your email to verify your booking.</p>
                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-with-icon">
                    <Mail size={18} className="input-icon" />
                    <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <button type="submit" className="primary" style={{ width: '100%', padding: '1rem' }} disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="spinner" /> : 'Send Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.5rem' }}>Enter Code</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Check your email <strong>{email}</strong></p>
                <div className="form-group">
                  <div className="input-with-icon">
                    <Key size={18} className="input-icon" />
                    <input type="text" placeholder="123456" value={otp} onChange={e => setOtp(e.target.value)} required maxLength={6} style={{ textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.25rem' }} />
                  </div>
                </div>
                <button type="submit" className="primary" style={{ width: '100%', padding: '1rem' }} disabled={submitting}>
                  Verify & Continue
                </button>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button type="button" onClick={handleResendOTP} disabled={submitting} style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.5rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                    Resend Code
                  </button>
                  <button type="button" onClick={() => setOtpStep('ID')} style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}>
                    Change email
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleCompleteProfile}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.5rem' }}>Almost there!</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Tell us your name and birthday.</p>
              <div className="form-group">
                <label>Full Name</label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon" />
                  <input type="text" placeholder="John Doe" value={fullname} onChange={e => setFullname(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label>Birthday</label>
                <div className="input-with-icon">
                  <Cake size={18} className="input-icon" />
                  <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="primary" style={{ width: '100%', padding: '1rem' }} disabled={submitting}>
                Complete Profile
              </button>
            </form>
          )}
        </section>
      )}

      {step === 5 && (
        <section>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>Review & Confirm</h2>
          <div className="card" style={{ padding: '1.5rem', background: 'rgba(79, 70, 229, 0.03)', border: '1px solid var(--primary)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', marginBottom: '0.5rem' }}>Services</div>
                <div style={{ fontWeight: '700' }}>{cart.map(i => `${i.name} (x${i.quantity})`).join(', ')}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', marginBottom: '0.5rem' }}>Barber</div>
                  <div style={{ fontWeight: '700' }}>{selectedBarber?.fullname || selectedBarber?.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', marginBottom: '0.5rem' }}>Time</div>
                  <div style={{ fontWeight: '700' }}>{selectedTime}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '800' }}>Additional Notes</label>
            <textarea placeholder="Optional notes for your barber..." value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '80px', marginTop: '0.5rem' }} />
          </div>
          <button className="primary" style={{ width: '100%', padding: '1.25rem', fontSize: '1.1rem' }} onClick={handleBook} disabled={submitting}>Confirm Booking</button>
        </section>
      )}
    </div>
  );
}
