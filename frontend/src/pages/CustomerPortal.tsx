import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { Calendar, Clock, Scissors, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/format';
import { useNavigate } from 'react-router-dom';

export default function CustomerPortal() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptsRes, salesRes] = await Promise.all([
          apiClient.get('/appointments'),
          apiClient.get('/sales')
        ]);
        setAppointments(apptsRes.data.filter((a: any) => a.status === 'scheduled'));
        setSales(salesRes.data);
      } catch (err) {
        console.error('Failed to fetch portal data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      </div>
    );
  }

  return (
    <div className="customer-portal" style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '56px', height: '56px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: '800' }}>
            {(user?.fullname || user?.username || 'C').charAt(0)}
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', marginBottom: 0 }}>Hi, {user?.fullname || user?.username}!</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ready for your next style?</p>
          </div>
        </div>
        <button className="secondary" onClick={handleLogout} style={{ padding: '0.5rem', borderRadius: '0.75rem' }}>
          <LogOut size={20} />
        </button>
      </header>

      <div style={{ display: 'grid', gap: '2rem' }}>
        <button 
          className="primary" 
          onClick={() => navigate('/discovery')}
          style={{ width: '100%', padding: '1.25rem', borderRadius: '1.25rem', fontSize: '1.1rem', fontWeight: '800', gap: '0.75rem', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)' }}
        >
          <Scissors size={24} /> Book New Appointment
        </button>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Upcoming</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase' }}>{appointments.length} Total</span>
          </div>
          
          {appointments.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', background: '#f9fafb', border: '1px dashed var(--border)' }}>
              <Calendar size={32} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
              <p style={{ fontSize: '0.9rem' }}>No upcoming bookings yet.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {appointments.map(appt => (
                <div key={appt.id} className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Clock size={14} color="var(--primary)" />
                        <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>
                          {new Date(appt.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(appt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{appt.service_name}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, fontWeight: '600' }}>
                        with {appt.barber_name}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="status-badge status-scheduled" style={{ fontSize: '0.65rem' }}>Confirmed</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Recent Activity</h2>
          </div>
          
          {sales.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', background: '#f9fafb', border: '1px dashed var(--border)' }}>
              <FileText size={32} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
              <p style={{ fontSize: '0.9rem' }}>No history found.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {sales.slice(0, 5).map(sale => (
                <div key={sale.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ background: '#f3f4f6', padding: '0.6rem', borderRadius: '0.75rem' }}>
                      <FileText size={20} color="var(--text-muted)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{new Date(sale.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sale.barber_name}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '800', color: 'var(--text-main)' }}>{formatCurrency(sale.total_amount, settings.currency_symbol)}</div>
                    <button className="secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', marginTop: '0.25rem', border: 'none' }}>
                      View Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
