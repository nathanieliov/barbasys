import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { Calendar, Clock, Scissors, FileText, LogOut, Mail, Key, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/format';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function CustomerPortal() {
  const { t } = useTranslation();
  const { user, login, logout, updateUser } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Auth state for portal-side login
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState<'ID' | 'OTP'>('ID');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initPortal = async () => {
      if (user && !user.customer_id) {
        try {
          const res = await apiClient.get('/auth/me');
          updateUser(res.data);
        } catch (err) {
          console.error('Failed to sync user for portal', err);
        }
      } else if (user && user.customer_id) {
        fetchPortalData();
      }
    };
    initPortal();
  }, [user?.id, user?.customer_id]);

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const [apptsRes, salesRes] = await Promise.all([
        apiClient.get('/appointments?as=customer'),
        apiClient.get('/sales?as=customer')
      ]);
      setAppointments(apptsRes.data);
      setSales(salesRes.data);
    } catch (err) {
      console.error('Failed to fetch portal data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/otp/send', { email });
      setOtpStep('OTP');
    } catch (err: any) {
      setError(t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/auth/otp/verify', { email, code: otp });
      login(res.data.token, res.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || t('login.invalid_credentials'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/otp/send', { email });
      alert(t('booking.code_resent'));
    } catch (err: any) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm(t('portal.cancel_ask'))) return;
    
    try {
      await apiClient.post(`/appointments/${id}/cancel`, {});
      fetchPortalData();
    } catch (err: any) {
      alert(err.response?.data?.error || t('portal.failed_update'));
    }
  };

  if (!user) {
    return (
      <div className="login-page" style={{ padding: '1rem' }}>
        <div className="login-card">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '1.25rem', marginBottom: '1rem' }}>
              <Key size={40} color="var(--primary)" />
            </div>
            <h1>{t('landing.manage_bookings')}</h1>
            <p>{t('landing.manage_bookings_hint')}</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          {otpStep === 'ID' ? (
            <form onSubmit={handleSendOTP}>
              <div className="form-group">
                <label>{t('booking.email_address')}</label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('booking.email_placeholder')} required />
                </div>
              </div>
              <button type="submit" className="login-button" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 size={18} className="spinner" /> : t('booking.send_code')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div className="form-group">
                <label>{t('portal.enter_otp')}</label>
                <div className="input-with-icon">
                  <Key size={18} className="input-icon" />
                  <input type="text" value={otp} onChange={e => setOtp(e.target.value)} required maxLength={6} style={{ textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.5rem' }} />
                </div>
              </div>
              <button type="submit" className="login-button" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 size={18} className="spinner" /> : t('portal.verify_signin')}
              </button>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={handleResendOTP} disabled={isSubmitting} style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.5rem', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.85rem' }}>
                  {t('booking.resend_code')}
                </button>
                <button type="button" onClick={() => setOtpStep('ID')} style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}>
                  {t('portal.back_to_email')}
                </button>
              </div>
            </form>
          )}
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--primary)', width: '100%', marginTop: '2rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>
            {t('portal.back_to_home')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-portal" style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', marginTop: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 0 }}>{t('portal.welcome', { name: user.fullname || user.username })}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('portal.subtitle')}</p>
        </div>
        <button className="secondary" onClick={() => { logout(); navigate('/'); }} style={{ padding: '0.5rem', borderRadius: '0.75rem' }}>
          <LogOut size={20} />
        </button>
      </header>

      <button className="primary" onClick={() => navigate('/discovery')} style={{ width: '100%', padding: '1.25rem', borderRadius: '1rem', fontSize: '1.1rem', fontWeight: '800', gap: '0.75rem', marginBottom: '2.5rem' }}>
        <Scissors size={20} /> {t('portal.book_new')}
      </button>

      <div style={{ display: 'grid', gap: '2.5rem' }}>
        <section>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>{t('portal.my_appointments')}</h2>
          {loading ? <div className="spinner" style={{ margin: '2rem auto' }}></div> : appointments.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', background: '#f9fafb' }}>
              <Calendar size={32} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
              <p style={{ color: 'var(--text-muted)' }}>{t('portal.no_bookings')}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {appointments.map(appt => (
                <div key={appt.id} className="card" style={{ padding: '1.25rem', borderLeft: `4px solid ${appt.status === 'completed' ? 'var(--success)' : (appt.status === 'cancelled' ? 'var(--danger)' : 'var(--primary)')}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Clock size={14} color="var(--primary)" />
                        <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>
                          {new Date(appt.start_time.replace(' ', 'T')).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(appt.start_time.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>{appt.services_summary || 'Haircut'}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>at {appt.shop_name} • {appt.barber_name}</p>
                    </div>
                    <span className={`status-badge status-${appt.status}`} style={{ fontSize: '0.65rem' }}>{t(`common.${appt.status}`)}</span>
                  </div>
                  
                  {appt.status === 'scheduled' && (
                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button 
                        className="secondary" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderColor: 'var(--border)' }}
                        onClick={() => {
                          const newNotes = window.prompt(t('portal.update_notes'), appt.notes || '');
                          if (newNotes !== null) {
                            apiClient.put(`/appointments/${appt.id}`, { notes: newNotes })
                              .then(() => fetchPortalData())
                              .catch(err => alert(err.response?.data?.error || t('portal.failed_update')));
                          }
                        }}
                      >
                        {t('portal.notes')}
                      </button>
                      <button 
                        className="secondary" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderColor: 'var(--border)' }}
                        onClick={() => {
                          // Pass appointment info to BookingFlow for rescheduling
                          navigate(`/book/${appt.shop_id}`, { 
                            state: { 
                              rescheduleId: appt.id, 
                              barberId: appt.barber_id,
                              notes: appt.notes 
                            } 
                          });
                        }}
                      >
                        {t('portal.reschedule')}
                      </button>
                      <button 
                        className="secondary" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                        onClick={() => handleCancel(appt.id)}
                      >
                        {t('portal.cancel_appointment')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>Visits History</h2>
          {sales.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', background: '#f9fafb' }}>
              <FileText size={32} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
              <p style={{ color: 'var(--text-muted)' }}>No visit history found.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {sales.map(sale => (
                <div key={sale.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ background: '#f3f4f6', padding: '0.6rem', borderRadius: '0.75rem' }}>
                      <FileText size={20} color="var(--text-muted)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{new Date(sale.timestamp || sale.created_at).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sale.barber_name}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: '800' }}>{formatCurrency(sale.total_amount, settings.currency_symbol)}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
