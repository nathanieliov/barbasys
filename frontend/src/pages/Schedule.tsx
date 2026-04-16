import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { Calendar as CalendarIcon, Clock, Scissors, User, X, PlusCircle, CheckCircle, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';

export default function Schedule() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showBook, setShowBook] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  // Booking Form State
  const [selectedBarber, setSelectedBarber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [recurringRule, setRecurringRule] = useState('');
  const [occurrences, setOccurrences] = useState(1);
  const [sendConfirmation, setSendConfirmation] = useState(true);

  const fetchData = () => {
    apiClient.get(`/appointments?date=${date}`).then(res => setAppointments(res.data));
    apiClient.get('/barbers').then(res => {
      setBarbers(res.data);
      if (user?.role === 'BARBER' && user.barber_id) {
        setSelectedBarber(user.barber_id.toString());
      }
    });
    apiClient.get('/customers').then(res => setCustomers(res.data));
    apiClient.get('/services').then(res => setServices(res.data));
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');
    const start_time = `${date}T${selectedTime}:00`;
    try {
      await apiClient.post('/appointments', {
        barber_id: parseInt(selectedBarber),
        customer_id: selectedCustomer ? parseInt(selectedCustomer) : null,
        service_id: parseInt(selectedService),
        start_time,
        recurring_rule: recurringRule || null,
        occurrences: recurringRule ? occurrences : 1,
        send_confirmation: sendConfirmation
      });
      setBookingSuccess(true);
      fetchData();
    } catch (err: any) {
      setBookingError(err.response?.data?.error || 'Failed to book appointment');
    }
  };

  const resetBookingForm = () => {
    setShowBook(false);
    setBookingError('');
    setBookingSuccess(false);
    setRecurringRule('');
    setOccurrences(1);
    setSendConfirmation(true);
  };

  const handleCheckIn = (appointment: any) => {
    navigate(`/pos?appointmentId=${appointment.id}`);
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      if (status === 'cancelled') {
        const reason = window.prompt(t('schedule.cancel_reason_prompt'));
        if (reason === null) return; // User clicked cancel
        await apiClient.post(`/appointments/${id}/cancel`, { reason });
      } else {
        await apiClient.patch(`/appointments/${id}`, { status });
      }

      if (status === 'completed') {
        if (window.confirm(t('schedule.mark_completed_confirm'))) {
          navigate(`/pos?appointmentId=${id}`);
          return;
        }
      }
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || t('schedule.failed_update_status'));
    }
  };

  const changeDate = (days: number) => {
    const current = new Date(date);
    current.setDate(current.getDate() + days);
    setDate(current.toISOString().split('T')[0]);
  };

  return (
    <div className="schedule-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>{t('schedule.title')}</h1>
        <button onClick={() => setShowBook(true)} style={{ gap: '0.5rem' }}>
          <PlusCircle size={20} /> <span className="hide-mobile">{t('schedule.book_new')}</span>
        </button>
      </div>

      <div className="card date-nav-card" style={{ padding: '0.75rem', position: 'sticky', top: '4.5rem', zIndex: 40, background: 'var(--card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button className="secondary" onClick={() => changeDate(-1)} style={{ padding: '0.5rem' }}><ChevronLeft size={20} /></button>
            <button className="secondary" onClick={() => changeDate(1)} style={{ padding: '0.5rem' }}><ChevronRight size={20} /></button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
            <CalendarIcon size={18} color="var(--primary)" />
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              style={{ marginBottom: 0, border: 'none', fontWeight: '700', fontSize: '1rem', width: 'auto', background: 'transparent', padding: 0 }}
            />
          </div>

          <button className="secondary hide-mobile" onClick={() => setDate(new Date().toISOString().split('T')[0])}>{t('common.today')}</button>
        </div>
      </div>

      <div className="appointments-list" style={{ display: 'grid', gap: '1rem' }}>
        {appointments.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem 2rem' }}>
            <CalendarIcon size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
            <p>{t('schedule.no_appointments')}</p>
            <button className="secondary" style={{ marginTop: '1rem' }} onClick={() => setShowBook(true)}>{t('schedule.book_now')}</button>
          </div>
        ) : (
          appointments.map(a => (
            <div key={a.id} className="card appointment-card" style={{ marginBottom: 0, padding: '1rem', borderLeft: `4px solid ${a.status === 'completed' ? 'var(--success)' : 'var(--primary)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800', color: 'var(--primary)', fontSize: '1.1rem' }}>
                  <Clock size={18} />
                  {new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <span className={`status-badge ${a.status === 'completed' ? 'status-completed' : 'status-scheduled'}`}>
                  {t(`common.${a.status}`)}
                </span>
              </div>
              
              <div className="appointment-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <User size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{a.customer_name || t('schedule.guest_client')}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('schedule.customer')}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                    <Scissors size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{a.service_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('schedule.with')} {a.barber_name}</div>
                  </div>
                </div>
              </div>

              {a.status === 'scheduled' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={{ flex: 2, gap: '0.5rem', padding: '0.875rem' }} onClick={() => handleCheckIn(a)}>
                    <CheckCircle size={18} /> {t('schedule.start_checkin')}
                  </button>
                  <button className="secondary" style={{ flex: 1, color: 'var(--success)', border: '1px solid var(--success)', padding: '0.875rem' }} onClick={() => updateStatus(a.id, 'completed')}>
                    {t('common.done')}
                  </button>
                  <button className="secondary" style={{ padding: '0.875rem', color: 'var(--danger)', border: '1px solid var(--danger)' }} onClick={() => updateStatus(a.id, 'cancelled')}>
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showBook && (
        <div className="modal-overlay">
          <div className="modal-content">
            {bookingSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ background: 'var(--success)', color: 'white', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <CalendarIcon size={32} />
                </div>
                <h2>{t('schedule.booking_confirmed')}</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{t('schedule.booking_success_msg')}</p>
                <button onClick={resetBookingForm} style={{ width: '100%', padding: '1rem' }}>
                  {t('common.done')}
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2>{t('schedule.book_appointment')}</h2>
                  <button className="secondary" style={{ padding: '0.5rem' }} onClick={resetBookingForm}>
                    <X size={20} />
                  </button>
                </div>
                
                {bookingError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', fontWeight: '600' }}>
                    <AlertCircle size={18} /> {bookingError}
                  </div>
                )}
                
                <form onSubmit={handleBook}>
                  {user?.role !== 'BARBER' ? (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('schedule.select_barber')}</label>
                      <select 
                        value={selectedBarber} 
                        onChange={e => setSelectedBarber(e.target.value)} 
                        required
                      >
                        <option value="">{t('schedule.select_barber')}</option>
                        {barbers.map(b => <option key={b.id} value={b.id}>{b.fullname || b.name}</option>)}
                        </select>

                    </div>
                  ) : (
                    <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '0.75rem', border: '1px solid rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: 'var(--primary)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>{t('common.professional')}</div>
                        <div style={{ fontWeight: '700', color: 'var(--primary)' }}>{user.fullname || user.username}</div>
                      </div>
                    </div>
                  )}
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('schedule.customer')} ({t('pos.customer_contact_optional')})</label>
                    <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                      <option value="">{t('schedule.guest_new_customer')}</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name || c.email || c.phone}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('pos.services')}</label>
                    <select value={selectedService} onChange={e => setSelectedService(e.target.value)} required>
                      <option value="">{t('schedule.select_service')}</option>
                      {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}m) - ${s.price}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('schedule.time')}</label>
                    <input type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} required style={{ fontSize: '1.1rem', fontWeight: '600' }} />
                  </div>

                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f3f4f6', borderRadius: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: '600' }}>{t('schedule.recurring_appointment')}</label>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <select value={recurringRule} onChange={e => setRecurringRule(e.target.value)} style={{ flex: 1.5, marginBottom: 0 }}>
                        <option value="">{t('schedule.does_not_repeat')}</option>
                        <option value="weekly">{t('schedule.weekly')}</option>
                        <option value="biweekly">{t('schedule.biweekly')}</option>
                        <option value="monthly">{t('schedule.monthly')}</option>
                      </select>
                      {recurringRule && (
                        <input 
                          type="number" 
                          min="2" 
                          max="12" 
                          value={occurrences} 
                          onChange={e => setOccurrences(parseInt(e.target.value) || 2)} 
                          style={{ flex: 1, marginBottom: 0 }}
                          placeholder="Count"
                        />
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input 
                      type="checkbox" 
                      id="sendConfirmation" 
                      checked={sendConfirmation} 
                      onChange={e => setSendConfirmation(e.target.checked)}
                      style={{ width: 'auto', marginBottom: 0 }}
                    />
                    <label htmlFor="sendConfirmation" style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '600', cursor: 'pointer' }}>
                      {t('schedule.send_confirmation')}
                    </label>
                  </div>

                  <button type="submit" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                    {t('schedule.confirm_booking')}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 640px) {
          .hide-mobile { display: none !important; }
          .appointment-details { grid-template-columns: 1fr !important; gap: 0.75rem !important; }
          .date-nav-card { top: 3.5rem !important; margin: 0 -1rem 1.5rem !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
          .schedule-container { padding-top: 0.5rem; }
        }
      `}} />
    </div>
  );
}
