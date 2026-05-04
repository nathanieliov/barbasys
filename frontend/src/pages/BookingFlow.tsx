import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { User, ChevronLeft, CheckCircle, AlertCircle, Mail, Key, Cake, Loader2, Plus, Minus, Trash2, Calendar, Clock, Scissors, CreditCard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/format';
import { useTranslation, Trans } from 'react-i18next';

interface BookingFlowProps {
  preSelectedBarber?: any;
}

export default function BookingFlow({ preSelectedBarber }: BookingFlowProps) {
  const { t } = useTranslation();
  const { shopId: routeShopId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, updateUser } = useAuth();
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

  const handleTimeSelect = (t_val: string) => {
    setSelectedTime(t_val);
    if (!user) {
      setStep(4);
    } else {
      setSubmitting(true);
      apiClient.get('/auth/me').then(res => {
        updateUser(res.data); // Update global auth state with fresh customer_id
        if (res.data && res.data.requires_profile_completion) {
          setRequiresProfile(true);
          setStep(4);
        } else {
          setStep(5);
        }
      }).catch(err => {
        console.error('Failed to refresh user info', err);
        setStep(5);
      }).finally(() => setSubmitting(false));
    }
  };

  const handleBack = () => {
    if (step === 5 || (step === 4 && user && !requiresProfile)) {
      setStep(3);
    } else if (step > 1) {
      setStep(step - 1);
    } else {
      navigate('/discovery');
    }
  };

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
      setError(err.response?.data?.error || t('schedule.failed_booking'));
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
      setError(err.response?.data?.error || t('login.invalid_credentials'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setSubmitting(true);
    try {
      await apiClient.post('/auth/otp/send', { email });
      alert(t('booking.code_resent'));
    } catch (err: any) {
      setError(err.response?.data?.error || t('schedule.failed_booking'));
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
      setError(t('customers.failed_update'));
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
      setError(err.response?.data?.error || t('schedule.failed_booking'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="booking-container"><div className="spinner" style={{ margin: '0 auto' }}></div></div>;

  if (success) {
    return (
      <div className="booking-container">
        <div className="glass-panel animate-fade-in-up" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ background: 'var(--success)', color: 'white', width: '90px', height: '90px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)' }}>
            <CheckCircle size={56} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '1rem', color: 'var(--text-main)' }}>
            {rescheduleId ? t('booking.updated') : t('booking.success')}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '1.1rem' }}>
            <Trans 
              i18nKey={rescheduleId ? 'booking.updated_msg' : 'booking.confirmed_msg'}
              values={{ shopName: shop?.name }}
              components={{ strong: <strong /> }}
            />
          </p>
          <button className="primary" style={{ width: '100%', padding: '1.25rem', fontSize: '1.1rem', borderRadius: '1rem' }} onClick={() => navigate('/my-bookings')}>
            {t('booking.go_to_dashboard')}
          </button>
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, label: t('nav.barbers') },
    { num: 2, label: t('nav.services') },
    { num: 3, label: t('nav.shop_calendar') },
    { num: 4, label: t('booking.enter_code') },
    { num: 5, label: t('booking.review_confirm') },
  ];

  return (
    <div className="booking-container">
      <div className="glass-panel animate-fade-in-up">
        
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255, 255, 255, 0.4)' }}>
          <button className="secondary" style={{ padding: '0.5rem', borderRadius: '0.75rem', background: '#fff' }} onClick={handleBack}>
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.25rem', marginBottom: 0, fontWeight: '800' }}>{shop?.name}</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {selectedBarber ? t('booking.booking_with', { name: selectedBarber.fullname || selectedBarber.name }) : t('booking.new_appointment')}
            </p>
          </div>
        </header>

        {/* Stepper */}
        <div className="stepper-container">
          <div className="stepper-progress-bg"></div>
          <div className="stepper-progress-fill" style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}></div>
          {steps.map(s => (
            <div key={s.num} className={`step-indicator ${step === s.num ? 'active' : step > s.num ? 'completed' : ''}`}>
              <div className="step-circle">
                {step > s.num ? <CheckCircle size={16} /> : s.num}
              </div>
              <div className="step-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '2rem', position: 'relative' }}>
          {error && (
            <div className="animate-fade-in-up" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', fontWeight: '600' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {step === 1 && (
            <section className="animate-fade-in-up">
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--text-main)' }}>{t('booking.choose_professional')}</h2>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {barbers.map(b => (
                  <div key={b.id} className="glass-item" onClick={() => { setSelectedBarber(b); setStep(2); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: '800', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)' }}>
                        {(b.fullname || b.name).charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--text-main)' }}>{b.fullname || b.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('booking.professional_barber')}</div>
                      </div>
                      <ChevronLeft size={20} style={{ transform: 'rotate(180deg)', color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="animate-fade-in-up">
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--text-main)' }}>{t('booking.select_services')}</h2>
              <div style={{ display: 'grid', gap: '1rem', marginBottom: cart.length > 0 ? '100px' : '0' }}>
                {services.map(s => {
                  const inCart = cart.find(c => c.id === s.id);
                  return (
                    <div key={s.id} className={`glass-item ${inCart ? 'selected' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Scissors size={16} className="text-primary" /> {s.name}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', gap: '0.75rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {s.duration_minutes} mins</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CreditCard size={14} /> {formatCurrency(s.price, settings.currency_symbol)}</span>
                        </div>
                        {s.description && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.4 }}>
                            {s.description}
                          </div>
                        )}
                      </div>
                      <button className="primary" style={{ padding: '0.6rem', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => addToCart(s)}>
                        <Plus size={20} />
                      </button>
                    </div>
                  );
                })}
              </div>

            </section>
          )}

          {step === 3 && (
            <section className="animate-fade-in-up">
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--text-main)' }}>{t('booking.pick_date_time')}</h2>
              
              <div style={{ background: '#fff', borderRadius: '1rem', padding: '1rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <Calendar size={24} className="text-primary" />
                <input type="date" value={selectedDate} min={new Date().toISOString().split('T')[0]} onChange={e => setSelectedDate(e.target.value)} style={{ fontSize: '1.1rem', fontWeight: '700', border: 'none', background: 'transparent', outline: 'none', flex: 1, color: 'var(--text-main)', margin: 0, padding: 0 }} />
              </div>
              
              <div>
                {loadingSlots ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                    <Loader2 size={40} className="spinner" style={{ margin: '0 auto', borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
                    <p style={{ marginTop: '1rem', fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '600' }}>{t('booking.finding_slots')}</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="glass-item" style={{ textAlign: 'center', padding: '3rem 2rem', border: '1px dashed var(--border)' }}>
                    <AlertCircle size={40} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)', opacity: 0.5 }} />
                    <p style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '1.1rem' }}>{t('booking.no_slots')}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Try selecting a different date.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                    {availableSlots.map(t_val => (
                      <div key={t_val} className={`glass-time-slot ${selectedTime === t_val ? 'selected' : ''}`} onClick={() => handleTimeSelect(t_val)}>
                        {t_val}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="animate-fade-in-up">
              {!requiresProfile ? (
                otpStep === 'ID' ? (
                  <form onSubmit={handleSendOTP} style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('booking.confirm_identity')}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>{t('booking.otp_hint')}</p>
                    <div className="form-group">
                      <label>{t('booking.email_address')}</label>
                      <div className="input-with-icon">
                        <Mail size={18} className="input-icon" />
                        <input type="email" placeholder={t('booking.email_placeholder')} value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '0.85rem 0.85rem 0.85rem 2.8rem', borderRadius: '0.75rem' }} />
                      </div>
                    </div>
                    <button type="submit" className="primary" style={{ width: '100%', padding: '1.1rem', fontSize: '1.05rem', borderRadius: '0.75rem', marginTop: '1rem' }} disabled={submitting}>
                      {submitting ? <Loader2 size={18} className="spinner" style={{ width: '20px', height: '20px', borderTopColor: '#fff' }} /> : t('booking.send_code')}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('booking.enter_code')}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                      <Trans i18nKey="booking.check_email" values={{ email }} components={{ strong: <strong /> }} />
                    </p>
                    <div className="form-group">
                      <div className="input-with-icon">
                        <Key size={18} className="input-icon" />
                        <input type="text" placeholder="123456" value={otp} onChange={e => setOtp(e.target.value)} required maxLength={6} style={{ textAlign: 'center', letterSpacing: '0.75rem', fontSize: '1.5rem', padding: '1rem', borderRadius: '0.75rem', fontWeight: '800' }} />
                      </div>
                    </div>
                    <button type="submit" className="primary" style={{ width: '100%', padding: '1.1rem', fontSize: '1.05rem', borderRadius: '0.75rem', marginTop: '1rem' }} disabled={submitting}>
                      {submitting ? <Loader2 size={18} className="spinner" style={{ width: '20px', height: '20px', borderTopColor: '#fff' }} /> : t('booking.verify_continue')}
                    </button>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                      <button type="button" onClick={handleResendOTP} disabled={submitting} className="secondary" style={{ flex: 1, padding: '0.75rem', fontSize: '0.9rem', borderRadius: '0.5rem' }}>
                        {t('booking.resend_code')}
                      </button>
                      <button type="button" onClick={() => setOtpStep('ID')} style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '600' }}>
                        {t('booking.change_email')}
                      </button>
                    </div>
                  </form>
                )
              ) : (
                <form onSubmit={handleCompleteProfile} style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('booking.almost_there')}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>{t('booking.profile_hint')}</p>
                  <div className="form-group">
                    <label>{t('booking.full_name')}</label>
                    <div className="input-with-icon">
                      <User size={18} className="input-icon" />
                      <input type="text" placeholder={t('booking.fullname_placeholder')} value={fullname} onChange={e => setFullname(e.target.value)} required style={{ padding: '0.85rem 0.85rem 0.85rem 2.8rem', borderRadius: '0.75rem' }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>{t('booking.birthday')}</label>
                    <div className="input-with-icon">
                      <Cake size={18} className="input-icon" />
                      <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} required style={{ padding: '0.85rem 0.85rem 0.85rem 2.8rem', borderRadius: '0.75rem' }} />
                    </div>
                  </div>
                  <button type="submit" className="primary" style={{ width: '100%', padding: '1.1rem', fontSize: '1.05rem', borderRadius: '0.75rem', marginTop: '1rem' }} disabled={submitting}>
                    {submitting ? <Loader2 size={18} className="spinner" style={{ width: '20px', height: '20px', borderTopColor: '#fff' }} /> : t('booking.complete_profile')}
                  </button>
                </form>
              )}
            </section>
          )}

          {step === 5 && (
            <section className="animate-fade-in-up">
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--text-main)' }}>{t('booking.review_confirm')}</h2>
              
              <div style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                <div style={{ borderBottom: '1px dashed var(--border)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>{t('booking.barber')}</span>
                    <span style={{ fontWeight: '800' }}>{selectedBarber?.fullname || selectedBarber?.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>{t('booking.time')}</span>
                    <span style={{ fontWeight: '800', color: 'var(--primary)' }}>{selectedDate} @ {selectedTime}</span>
                  </div>
                </div>
                
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', display: 'block', marginBottom: '1rem' }}>{t('booking.services')}</span>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {cart.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600' }}>{item.quantity}x {item.name}</span>
                        <span style={{ fontWeight: '800' }}>{formatCurrency(item.price * item.quantity, settings.currency_symbol)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', marginTop: '1.25rem', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.25rem', fontWeight: '900' }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--primary)' }}>{formatCurrency(totalAmount, settings.currency_symbol)}</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '700' }}>{t('booking.additional_notes')} (Optional)</label>
                <textarea placeholder={t('booking.notes_placeholder')} value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '100px', marginTop: '0.5rem', borderRadius: '0.75rem', padding: '1rem' }} />
              </div>
              
              <button className="primary" style={{ width: '100%', padding: '1.25rem', fontSize: '1.15rem', borderRadius: '1rem', fontWeight: '800', boxShadow: '0 10px 20px -5px rgba(79, 70, 229, 0.4)' }} onClick={handleBook} disabled={submitting}>
                {submitting ? <Loader2 size={24} className="spinner" style={{ width: '24px', height: '24px', borderTopColor: '#fff', margin: '0 auto' }} /> : t('booking.confirm_booking')}
              </button>
            </section>
          )}

        </div>
        
        {/* Cart Sticky Footer for Step 2 */}
        {step === 2 && cart.length > 0 && (
          <div className="glass-cart animate-fade-in-up" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.9)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '800' }}>{t('booking.your_selection')}</div>
                <div style={{ fontWeight: '800', fontSize: '1.2rem' }}>{formatCurrency(totalAmount, settings.currency_symbol)}</div>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                {t('booking.total_duration', { duration: totalDuration })}
              </div>
            </div>
            
            <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1.25rem', maxHeight: '100px', overflowY: 'auto' }}>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.03)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>{item.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#fff', borderRadius: '0.5rem', border: '1px solid var(--border)', padding: '0.1rem' }}>
                      <button className="secondary" style={{ padding: '0.25rem', border: 'none', background: 'transparent' }} onClick={() => updateQuantity(item.id, -1)}><Minus size={14} /></button>
                      <span style={{ fontWeight: '800', fontSize: '0.9rem', width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                      <button className="secondary" style={{ padding: '0.25rem', border: 'none', background: 'transparent' }} onClick={() => updateQuantity(item.id, 1)}><Plus size={14} /></button>
                    </div>
                    <button className="secondary" style={{ padding: '0.35rem', color: 'var(--danger)', borderRadius: '0.5rem', border: 'none', background: 'rgba(239, 68, 68, 0.1)' }} onClick={() => removeFromCart(item.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="primary" style={{ width: '100%', padding: '1.1rem', fontSize: '1.05rem', borderRadius: '0.75rem', fontWeight: '800' }} onClick={() => setStep(3)}>
              {t('booking.continue_to_schedule')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
