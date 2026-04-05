import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { Calendar, Clock, Scissors, FileText, LogOut, Mail, Key, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/format';
import { useNavigate } from 'react-router-dom';

export default function CustomerPortal() {
  const { user, login, logout } = useAuth();
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
    if (user && user.role === 'CUSTOMER') {
      fetchPortalData();
    }
  }, [user]);

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const [apptsRes, salesRes] = await Promise.all([
        apiClient.get('/appointments'),
        apiClient.get('/sales')
      ]);
      setAppointments(apptsRes.data);
      setSales(salesRes.data);
    } catch (err) {
      console.error('Failed to fetch portal data');
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
      setError('Failed to send verification code.');
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
      setError('Invalid code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || user.role !== 'CUSTOMER') {
    return (
      <div className="login-page" style={{ padding: '1rem' }}>
        <div className="login-card">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '1.25rem', marginBottom: '1rem' }}>
              <Key size={40} color="var(--primary)" />
            </div>
            <h1>My Bookings</h1>
            <p>Access your appointment history.</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          {otpStep === 'ID' ? (
            <form onSubmit={handleSendOTP}>
              <div className="form-group">
                <label>Email Address</label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
                </div>
              </div>
              <button type="submit" className="login-button" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 size={18} className="spinner" /> : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div className="form-group">
                <label>Enter 6-digit Code</label>
                <div className="input-with-icon">
                  <Key size={18} className="input-icon" />
                  <input type="text" value={otp} onChange={e => setOtp(e.target.value)} required maxLength={6} style={{ textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.5rem' }} />
                </div>
              </div>
              <button type="submit" className="login-button" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 size={18} className="spinner" /> : 'Verify & Sign In'}
              </button>
              <button type="button" onClick={() => setOtpStep('ID')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', width: '100%', marginTop: '1rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                Back to email
              </button>
            </form>
          )}
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--primary)', width: '100%', marginTop: '2rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-portal" style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', marginTop: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 0 }}>Hi, {user.fullname || user.username}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Manage your grooming schedule.</p>
        </div>
        <button className="secondary" onClick={() => { logout(); navigate('/'); }} style={{ padding: '0.5rem', borderRadius: '0.75rem' }}>
          <LogOut size={20} />
        </button>
      </header>

      <button className="primary" onClick={() => navigate('/discovery')} style={{ width: '100%', padding: '1.25rem', borderRadius: '1rem', fontSize: '1.1rem', fontWeight: '800', gap: '0.75rem', marginBottom: '2.5rem' }}>
        <Scissors size={20} /> Book New Appointment
      </button>

      <div style={{ display: 'grid', gap: '2.5rem' }}>
        <section>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>My Appointments</h2>
          {loading ? <div className="spinner" style={{ margin: '2rem auto' }}></div> : appointments.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', background: '#f9fafb' }}>
              <Calendar size={32} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
              <p style={{ color: 'var(--text-muted)' }}>No bookings found.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {appointments.map(appt => (
                <div key={appt.id} className="card" style={{ padding: '1.25rem', borderLeft: `4px solid ${appt.status === 'completed' ? 'var(--success)' : 'var(--primary)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Clock size={14} color="var(--primary)" />
                        <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>
                          {new Date(appt.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(appt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>{appt.services_summary || 'Haircut'}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>at {appt.shop_name} • {appt.barber_name}</p>
                    </div>
                    <span className={`status-badge status-${appt.status}`} style={{ fontSize: '0.65rem' }}>{appt.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>Past Invoices</h2>
          {sales.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', background: '#f9fafb' }}>
              <FileText size={32} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
              <p style={{ color: 'var(--text-muted)' }}>No invoices yet.</p>
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
                      <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{new Date(sale.timestamp).toLocaleDateString()}</div>
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
