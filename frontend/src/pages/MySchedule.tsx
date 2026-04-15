import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { Calendar, CheckCircle, XCircle, ChevronRight, Phone, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MySchedule() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchMySchedule = () => {
    setLoading(true);
    apiClient.get(`/appointments?date=${date}`)
      .then(res => setAppointments(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMySchedule();
  }, [date]);

  const updateStatus = async (id: number, status: string) => {
    try {
      if (status === 'cancelled') {
        const reason = window.prompt('Optional: Reason for cancellation?');
        if (reason === null) return; // User clicked cancel
        await apiClient.post(`/appointments/${id}/cancel`, { reason });
      } else {
        await apiClient.patch(`/appointments/${id}`, { status });
      }

      if (status === 'completed') {
        if (window.confirm('Appointment marked as completed! Would you like to process the payment now?')) {
          navigate(`/pos?appointmentId=${id}`);
          return;
        }
      }
      fetchMySchedule();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="my-schedule-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>My Schedule</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Managing your bookings for today.</p>
        </div>
        <input 
          type="date" 
          value={date} 
          onChange={e => setDate(e.target.value)}
          style={{ width: 'auto', marginBottom: 0, fontWeight: '700' }}
        />
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>Loading your appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <Calendar size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.1 }} />
          <p style={{ fontWeight: '600' }}>No appointments for this day.</p>
          <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>You're all clear! Relax or check other dates.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {appointments.map(appt => (
            <div key={appt.id} className={`card appt-card ${appt.status}`} style={{ padding: '1rem', borderLeft: `4px solid ${appt.status === 'completed' ? 'var(--success)' : appt.status === 'cancelled' ? 'var(--danger)' : 'var(--primary)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ background: 'var(--primary)', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: '800' }}>
                      {formatTime(appt.start_time)}
                    </div>
                    <span className={`status-badge status-${appt.status}`} style={{ fontSize: '0.65rem' }}>{appt.status}</span>
                  </div>
                  
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{appt.customer_name || 'Guest Customer'}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>
                    <CheckCircle size={14} color="var(--primary)" /> {appt.service_name}
                  </div>
                </div>

                {appt.status === 'scheduled' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="secondary" style={{ padding: '0.5rem', color: 'var(--success)', border: 'none' }} onClick={() => updateStatus(appt.id, 'completed')} title="Complete">
                      <CheckCircle size={20} />
                    </button>
                    <button className="secondary" style={{ padding: '0.5rem', color: 'var(--danger)', border: 'none' }} onClick={() => updateStatus(appt.id, 'cancelled')} title="Cancel">
                      <XCircle size={20} />
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem' }}>
                <button className="secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem', gap: '0.4rem' }}>
                  <Phone size={14} /> Call
                </button>
                <button className="secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem', gap: '0.4rem' }}>
                  <MessageSquare size={14} /> SMS
                </button>
                <button 
                  onClick={() => navigate(`/pos?appointmentId=${appt.id}`)}
                  disabled={appt.status !== 'scheduled'}
                  style={{ flex: 2, fontSize: '0.8rem', padding: '0.5rem', gap: '0.4rem' }}
                >
                  Checkout <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .appt-card.completed { opacity: 0.7; background: #f9fafb; }
        .appt-card.cancelled { opacity: 0.5; text-decoration: line-through; }
      `}} />
    </div>
  );
}
