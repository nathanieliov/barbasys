import { useEffect, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/format';
import Modal from '../components/Modal';
import Avatar from '../components/Avatar';

const HOURS = ['9', '10', '11', '12', '13', '14', '15', '16', '17'];
const HOUR_HEIGHT = 56; // px per hour row
const SCHEDULE_START = 9; // 9am

const BARBER_TONES = ['var(--primary)', 'var(--sage)', 'var(--plum)', 'var(--butter)', '#7d8ca3'];
const APPT_CLASSES = ['appt-peach', 'appt-sage', 'appt-plum', 'appt-amber', 'appt-ink'];

function apptTop(startTime: string) {
  const [, time] = startTime.split('T');
  const [h, m] = (time || '09:00').split(':').map(Number);
  return ((h - SCHEDULE_START) + m / 60) * HOUR_HEIGHT;
}

function apptHeight(durationMin: number) {
  return Math.max((durationMin / 60) * HOUR_HEIGHT - 4, 20);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{value}</span>
    </div>
  );
}

export default function Schedule() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [showBook, setShowBook] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);

  // Booking form state
  const [selBarber, setSelBarber]   = useState('');
  const [selCustomer, setSelCustomer] = useState('');
  const [selService, setSelService]   = useState('');
  const [selTime, setSelTime]         = useState('10:00');
  const [recurRule, setRecurRule]     = useState('');
  const [occurrences, setOccurrences] = useState(1);
  const [sendConf, setSendConf]       = useState(true);

  const fetchData = () => {
    apiClient.get(`/appointments?date=${date}`).then(res => setAppointments(res.data)).catch(() => {});
    apiClient.get('/barbers').then(res => {
      setBarbers(res.data);
      if (user?.role === 'BARBER' && user.barber_id) setSelBarber(user.barber_id.toString());
    }).catch(() => {});
    apiClient.get('/customers').then(res => setCustomers(res.data)).catch(() => {});
    apiClient.get('/services').then(res => setServices(res.data)).catch(() => {});
  };

  useEffect(() => { fetchData(); }, [date]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');
    try {
      await apiClient.post('/appointments', {
        barber_id: parseInt(selBarber),
        customer_id: selCustomer ? parseInt(selCustomer) : null,
        service_id: parseInt(selService),
        start_time: `${date}T${selTime}:00`,
        recurring_rule: recurRule || null,
        occurrences: recurRule ? occurrences : 1,
        send_confirmation: sendConf,
      });
      setBookingSuccess(true);
      fetchData();
    } catch (err: any) {
      setBookingError(err.response?.data?.error || t('schedule.failed_booking', 'Booking failed'));
    }
  };


  const changeDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  const dateLabel = new Date(date + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const isToday   = date === new Date().toISOString().split('T')[0];
  const nowHour   = new Date().getHours().toString();

  // Map appointments by barber id
  const apptsByBarber: Record<number, any[]> = {};
  for (const a of appointments) {
    const bid = a.barber_id;
    if (!apptsByBarber[bid]) apptsByBarber[bid] = [];
    apptsByBarber[bid].push(a);
  }

  const resetForm = () => { setShowBook(false); setBookingError(''); setBookingSuccess(false); setRecurRule(''); setOccurrences(1); setSendConf(true); };

  const handleMarkInChair = async (id: number) => {
    try {
      await apiClient.patch(`/appointments/${id}`, { status: 'in-chair' });
      setSelectedAppointment(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };
  const handleMarkComplete = async (id: number) => {
    try {
      await apiClient.patch(`/appointments/${id}`, { status: 'completed' });
      setSelectedAppointment(null);
      navigate(`/pos?appointmentId=${id}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };
  const handleMarkNoShow = (_id: number) => {};
  const handleCancel = (_id: number) => {};

  return (
    <>
      {/* Page head */}
      <div className="page-head">
        <div>
          <h1>{t('schedule.title', 'Schedule')}</h1>
          <div className="sub">{dateLabel}</div>
        </div>
        <div className="spacer" />

        {/* Day/Week toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 10 }}>
          <button className="btn btn-sm" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>{t('schedule.day', 'Day')}</button>
          <button className="btn btn-sm" style={{ background: 'transparent', color: 'var(--ink-2)' }}>{t('schedule.week', 'Week')}</button>
        </div>

        <button className="btn btn-ghost btn-sm" onClick={() => changeDate(-1)} aria-label={t('common.previous', 'Previous')}>
          <ChevronLeft size={14} />
        </button>
        <button className="btn btn-soft btn-sm" onClick={() => setDate(new Date().toISOString().split('T')[0])}>
          {t('common.today', 'Today')}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => changeDate(1)} aria-label={t('common.next', 'Next')}>
          <ChevronRight size={14} />
        </button>
        <button className="btn btn-accent" onClick={() => setShowBook(true)}>
          <Plus size={15} /> {t('schedule.book_new', 'Booking')}
        </button>
      </div>

      {/* Multi-barber schedule grid */}
      {barbers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-3)' }}>
          <p>{t('schedule.no_barbers', 'No barbers configured yet.')}</p>
        </div>
      ) : (
        <div
          className="schedule-grid"
          style={{ '--cols': barbers.length } as React.CSSProperties}
        >
          {/* Header row */}
          <div className="col-head" style={{ background: 'var(--surface)', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{t('schedule.time', 'Time')}</span>
          </div>
          {barbers.map((b, i) => (
            <div key={b.id} className="col-head">
              <Avatar
                initials={(b.fullname || b.name || '').slice(0, 2).toUpperCase()}
                tone={BARBER_TONES[i % BARBER_TONES.length]}
                size={28}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{(b.fullname || b.name || '').split(' ')[0]}</div>
                <div className="muted" style={{ fontSize: 11, fontWeight: 400 }}>{b.role || 'Barber'}</div>
              </div>
            </div>
          ))}

          {/* Hour rows */}
          {HOURS.map(h => {
            const isNow = isToday && h === nowHour;
            return (
              <>
                <div key={`t-${h}`} className="time-cell">{h}:00</div>
                {barbers.map((b, bi) => {
                  const hourAppts = (apptsByBarber[b.id] || []).filter(a => {
                    const startH = parseInt(a.start_time?.split('T')[1]?.split(':')[0] || '0');
                    return startH === parseInt(h);
                  });
                  return (
                    <div key={`s-${h}-${b.id}`} className={`slot ${isNow ? 'now' : ''}`}>
                      {hourAppts.map((a) => {
                        const svc = services.find(s => s.id === a.service_id);
                        const statusClass =
                          a.status === 'completed' ? 'appt-done' :
                          a.status === 'in-chair' ? 'appt-in-chair' :
                          a.status === 'no-show' ? 'appt-no-show' :
                          a.status === 'cancelled' ? 'appt-cancelled' : '';
                        return (
                          <div
                            key={a.id}
                            className={`appt ${APPT_CLASSES[bi % APPT_CLASSES.length]} ${statusClass}`}
                            style={{
                              top: apptTop(a.start_time) % HOUR_HEIGHT,
                              height: apptHeight(svc?.duration_minutes || 30),
                            }}
                            onClick={() => setSelectedAppointment(a)}
                            title={`${a.customer_name || 'Walk-in'} — ${svc?.name || 'Service'}`}
                          >
                            <div className="appt-name">{a.customer_name || t('schedule.walk_in', 'Walk-in')}</div>
                            <div className="appt-svc">{svc?.name || '–'} · {a.start_time?.split('T')[1]?.slice(0, 5)}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 12, color: 'var(--ink-3)', flexWrap: 'wrap' }}>
        {barbers.map((b, i) => (
          <span key={b.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, background: BARBER_TONES[i % BARBER_TONES.length], borderRadius: 3, display: 'inline-block' }} />
            {(b.fullname || b.name || '').split(' ')[0]}
          </span>
        ))}
      </div>

      {/* Booking Modal */}
      <Modal
        isOpen={showBook}
        onClose={resetForm}
        title={bookingSuccess ? t('schedule.booked', 'Booked!') : t('schedule.book_new', 'New booking')}
        size="md"
      >
        {bookingSuccess ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--sage-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: '#4d6648' }}>✓</div>
            <p style={{ marginBottom: 20 }}>{t('schedule.booking_confirmed', 'Appointment booked successfully.')}</p>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={resetForm}>
              {t('common.done', 'Done')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {bookingError && (
              <div style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)', padding: '10px 14px', borderRadius: 'var(--r)', fontSize: 13 }}>
                {bookingError}
              </div>
            )}
            <div className="field">
              <label className="field-label">{t('schedule.barber', 'Barber')}</label>
              <select className="input" value={selBarber} onChange={e => setSelBarber(e.target.value)} required>
                <option value="">— {t('common.select', 'Select')} —</option>
                {barbers.map(b => <option key={b.id} value={b.id}>{b.fullname || b.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">{t('nav.customers', 'Customer')} ({t('common.optional', 'optional')})</label>
              <select className="input" value={selCustomer} onChange={e => setSelCustomer(e.target.value)}>
                <option value="">— {t('schedule.walk_in', 'Walk-in')} —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.fullname || c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">{t('nav.services', 'Service')}</label>
              <select className="input" value={selService} onChange={e => setSelService(e.target.value)} required>
                <option value="">— {t('common.select', 'Select')} —</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.price, settings.currency_symbol)})</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">{t('schedule.date', 'Date')}</label>
                <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="field">
                <label className="field-label">{t('schedule.time', 'Time')}</label>
                <input className="input" type="time" value={selTime} onChange={e => setSelTime(e.target.value)} required />
              </div>
            </div>
            <div className="field">
              <label className="field-label">{t('schedule.recurring', 'Recurring rule (optional)')}</label>
              <select className="input" value={recurRule} onChange={e => setRecurRule(e.target.value)}>
                <option value="">{t('schedule.none', 'None')}</option>
                <option value="weekly">{t('schedule.weekly', 'Weekly')}</option>
                <option value="biweekly">{t('schedule.biweekly', 'Bi-weekly')}</option>
                <option value="monthly">{t('schedule.monthly', 'Monthly')}</option>
              </select>
            </div>
            {recurRule && (
              <div className="field">
                <label className="field-label">{t('schedule.occurrences', 'Occurrences')}</label>
                <input className="input" type="number" min={1} max={52} value={occurrences} onChange={e => setOccurrences(parseInt(e.target.value))} />
              </div>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={sendConf} onChange={e => setSendConf(e.target.checked)} />
              {t('schedule.send_confirmation', 'Send confirmation to customer')}
            </label>
            <button className="btn btn-accent" type="submit" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
              {t('schedule.book_new', 'Book appointment')}
            </button>
          </form>
        )}
      </Modal>

      {/* Appointment Detail Modal */}
      <Modal
        isOpen={selectedAppointment != null}
        onClose={() => setSelectedAppointment(null)}
        title={selectedAppointment?.customer_name || t('schedule.walk_in', 'Walk-in')}
        size="md"
        footer={selectedAppointment && (() => {
          const status = selectedAppointment.status;
          const id = selectedAppointment.id;
          return (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {status === 'scheduled' && (
                <>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--primary-deep)' }} onClick={() => handleCancel(id)}>{t('common.cancel', 'Cancel')}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleMarkNoShow(id)}>{t('schedule.mark_no_show', 'Mark no-show')}</button>
                  <button className="btn btn-primary btn-sm" onClick={() => handleMarkInChair(id)}>{t('schedule.mark_in_chair', 'Mark in chair')}</button>
                </>
              )}
              {status === 'in-chair' && (
                <>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--primary-deep)' }} onClick={() => handleCancel(id)}>{t('common.cancel', 'Cancel')}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleMarkNoShow(id)}>{t('schedule.mark_no_show', 'Mark no-show')}</button>
                  <button className="btn btn-accent btn-sm" onClick={() => handleMarkComplete(id)}>{t('schedule.mark_complete', 'Mark complete')}</button>
                </>
              )}
              {status === 'completed' && (
                <>
                  <button className="btn btn-soft btn-sm" onClick={() => setSelectedAppointment(null)}>{t('common.close', 'Close')}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedAppointment(null); navigate(`/pos?appointmentId=${id}`); }}>{t('schedule.open_in_pos', 'Open in POS')}</button>
                </>
              )}
              {(status === 'no-show' || status === 'cancelled') && (
                <button className="btn btn-soft btn-sm" onClick={() => setSelectedAppointment(null)}>{t('common.close', 'Close')}</button>
              )}
            </div>
          );
        })()}
      >
        {selectedAppointment && (() => {
          const appt = selectedAppointment;
          const svc = services.find((s: any) => s.id === appt.service_id);
          const brb = barbers.find((b: any) => b.id === appt.barber_id);
          const start = new Date(appt.start_time);
          const dur = svc?.duration_minutes || 30;
          const end = new Date(start.getTime() + dur * 60000);
          const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          const fmtDate = (d: Date) => d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

          const statusKey = (() => {
            switch (appt.status) {
              case 'in-chair': return 'in_chair';
              case 'no-show': return 'no_show';
              default: return appt.status;
            }
          })();
          const chipVariant =
            appt.status === 'completed' ? 'chip-success' :
            appt.status === 'in-chair' ? 'chip-warn' :
            appt.status === 'no-show' ? 'chip-danger' :
            appt.status === 'cancelled' ? 'chip-plum' : '';

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><span className={`chip ${chipVariant}`}>{String(t(`schedule.status.${statusKey}`, appt.status))}</span></div>
              <Row label={t('schedule.service', 'Service')} value={`${svc?.name || '–'} · ${dur} min · $${svc?.price ?? '–'}`} />
              <Row label={t('schedule.barber', 'Barber')} value={brb?.fullname || brb?.name || '–'} />
              <Row label={t('schedule.date_time', 'Date & time')} value={`${fmtDate(start)} · ${fmtTime(start)}–${fmtTime(end)}`} />
              {appt.notes && <Row label={t('schedule.notes', 'Notes')} value={appt.notes} />}
            </div>
          );
        })()}
      </Modal>
    </>
  );
}
