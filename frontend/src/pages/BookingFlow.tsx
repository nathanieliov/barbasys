import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Star, Clock, ChevronLeft, ChevronRight, Sparkles, CheckCircle, Calendar, Loader2, AlertCircle, User, Phone, Navigation } from 'lucide-react';
import apiClient from '../api/apiClient';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/format';
import { useTranslation, Trans } from 'react-i18next';
import Stepper from '../components/Stepper';
import Modal from '../components/Modal';
import Avatar from '../components/Avatar';

interface BookingFlowProps {
  preSelectedBarber?: any;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function buildDays(n = 14) {
  const today = new Date();
  return Array.from({ length: n }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

/* ─── Sub-components ─────────────────────────────────────── */

function OptionCard({ selected, onClick, children, style }: { selected?: boolean; onClick: () => void; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <button
      className={`option-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  );
}

function SummaryRow({ icon, label, value, sub, onEdit, last }: { icon: React.ReactNode; label: string; value: string; sub?: string; onEdit: () => void; last?: boolean }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: last ? 0 : '1px solid var(--line)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
        <div style={{ fontWeight: 600, fontSize: 16, marginTop: 1 }}>{value}</div>
        {sub && <div className="muted" style={{ fontSize: 13 }}>{sub}</div>}
      </div>
      <button className="btn btn-soft btn-sm" onClick={onEdit} aria-label={t('common.edit', 'Edit')}>
        {t('common.edit', 'Edit')}
      </button>
    </div>
  );
}

/* ─── OTP Modal ──────────────────────────────────────────── */

function OtpModal({ isOpen, onClose, onVerified }: { isOpen: boolean; onClose: () => void; onVerified: () => void }) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [otpStep, setOtpStep] = useState<'ID' | 'OTP'>('ID');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [fullname, setFullname] = useState('');
  const [birthday, setBirthday] = useState('');
  const [requiresProfile, setRequiresProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resendSent, setResendSent] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await apiClient.post('/auth/otp/send', { email });
      setOtpStep('OTP');
      if (res.data.devCode) setOtp(res.data.devCode);
    } catch (err: any) {
      setError(err.response?.data?.error || t('booking.otp_send_error', 'Failed to send code.'));
    } finally { setSubmitting(false); }
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
        onVerified();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || t('login.invalid_credentials', 'Invalid code.'));
    } finally { setSubmitting(false); }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.patch('/auth/profile', { fullname, birthday });
      onVerified();
    } catch {
      setError(t('customers.failed_update', 'Failed to update profile.'));
    } finally { setSubmitting(false); }
  };

  const handleResend = async () => {
    setSubmitting(true);
    try {
      const res = await apiClient.post('/auth/otp/send', { email });
      setResendSent(true);
      if (res.data.devCode) setOtp(res.data.devCode);
    } catch (err: any) {
      setError(err.response?.data?.error || '');
    } finally { setSubmitting(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={requiresProfile ? t('booking.almost_there', 'Almost there') : otpStep === 'ID' ? t('booking.confirm_identity', 'Confirm identity') : t('booking.enter_code', 'Enter code')}>
      {error && (
        <div style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)', padding: '10px 14px', borderRadius: 'var(--r)', marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {!requiresProfile ? (
        otpStep === 'ID' ? (
          <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="muted" style={{ fontSize: 14, margin: 0 }}>{t('booking.otp_hint', 'Enter your email and we\'ll send a code.')}</p>
            <div className="field">
              <label className="field-label">{t('booking.email_address', 'Email address')}</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <button className="btn btn-accent" type="submit" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
              {submitting ? <Loader2 size={16} className="spinner" /> : t('booking.send_code', 'Send code')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="muted" style={{ fontSize: 14, margin: 0 }}>
              <Trans i18nKey="booking.check_email" values={{ email }} components={{ strong: <strong /> }} />
            </p>
            <div className="field">
              <input className="input" type="text" placeholder="123456" value={otp} onChange={e => setOtp(e.target.value)} required maxLength={6} style={{ textAlign: 'center', letterSpacing: '0.5rem', fontSize: 22, fontWeight: 700 }} />
            </div>
            <button className="btn btn-accent" type="submit" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
              {submitting ? <Loader2 size={16} className="spinner" /> : t('booking.verify_continue', 'Verify & continue')}
            </button>
            {resendSent && <p style={{ color: 'var(--sage)', fontSize: 13, textAlign: 'center', fontWeight: 500 }}>{t('booking.code_resent', 'Code resent!')}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} disabled={submitting} onClick={handleResend}>{t('booking.resend_code', 'Resend')}</button>
              <button type="button" className="btn btn-soft btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setOtpStep('ID')}>{t('booking.change_email', 'Change email')}</button>
            </div>
          </form>
        )
      ) : (
        <form onSubmit={handleCompleteProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="muted" style={{ fontSize: 14, margin: 0 }}>{t('booking.profile_hint', 'Fill in your details to complete the booking.')}</p>
          <div className="field">
            <label className="field-label">{t('booking.full_name', 'Full name')}</label>
            <input className="input" type="text" placeholder="Alex Morgan" value={fullname} onChange={e => setFullname(e.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label">{t('booking.birthday', 'Birthday')}</label>
            <input className="input" type="date" value={birthday} onChange={e => setBirthday(e.target.value)} required />
          </div>
          <button className="btn btn-accent" type="submit" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
            {submitting ? <Loader2 size={16} className="spinner" /> : t('booking.complete_profile', 'Complete profile')}
          </button>
        </form>
      )}
    </Modal>
  );
}

/* ─── Main component ─────────────────────────────────────── */

export default function BookingFlow({ preSelectedBarber }: BookingFlowProps) {
  const { t } = useTranslation();
  const { shopId: routeShopId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { settings } = useSettings();

  const rescheduleId = location.state?.rescheduleId;
  const initialBarberId = location.state?.barberId;

  const STEPS = [
    t('nav.barbers', 'Barber'),
    t('nav.services', 'Service'),
    t('booking.location', 'Location'),
    t('booking.date_time', 'Date & Time'),
    t('booking.confirm', 'Confirm'),
  ];

  const STEP = {
    BARBER:   0,
    SERVICE:  1,
    LOCATION: 2,
    DATETIME: 3,
    CONFIRM:  4,
  };

  const [step, setStep] = useState(preSelectedBarber || initialBarberId ? STEP.SERVICE : STEP.BARBER);
  const [maxStep, setMaxStep] = useState(preSelectedBarber || initialBarberId ? STEP.SERVICE : STEP.BARBER);
  const [shop, setShop] = useState<any>(null);
  const [shopSettings, setShopSettings] = useState<{ open_time: string | null; close_time: string | null } | null>(null);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [serviceCategory, setServiceCategory] = useState('All');

  const [selectedBarber, setSelectedBarber] = useState<any>(preSelectedBarber || null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState(location.state?.notes || '');
  const [customerName, setCustomerName] = useState(user?.fullname || '');
  const [customerPhone, setCustomerPhone] = useState('');

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [loading, setLoading] = useState(!!(preSelectedBarber?.shop_id || routeShopId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [confirmRef, setConfirmRef] = useState('');
  const [showOtp, setShowOtp] = useState(false);

  const shopId = preSelectedBarber?.shop_id || routeShopId;

  useEffect(() => {
    if (shopId) {
      apiClient.get(`/public/shops/${shopId}`).then(res => {
        setShop(res.data.shop);
        setShopSettings(res.data.settings ?? null);
        setBarbers(res.data.barbers);
        setServices(res.data.services);
        if (initialBarberId && res.data.barbers) {
          const b = res.data.barbers.find((bar: any) => bar.id === initialBarberId);
          if (b) setSelectedBarber(b);
        }
      }).finally(() => setLoading(false));

      if (rescheduleId) {
        apiClient.get(`/appointments/${rescheduleId}/items`).then(res => {
          const first = res.data[0];
          if (first) {
            setSelectedService({ id: first.service_id, name: first.name, price: first.price, duration_minutes: first.duration_minutes });
          }
        }).catch(() => {});
      }
    }
  }, [shopId, initialBarberId, rescheduleId]);

  useEffect(() => {
    const barberId = selectedBarber?.id === 'any' ? barbers[0]?.id : selectedBarber?.id;
    if (barberId && selectedDate && selectedService) {
      setLoadingSlots(true);
      apiClient.get(`/public/barbers/${barberId}/availability`, {
        params: { date: selectedDate, duration: selectedService.duration_minutes }
      }).then(res => setAvailableSlots(res.data))
        .catch(() => setAvailableSlots([]))
        .finally(() => setLoadingSlots(false));
    }
  }, [selectedBarber, selectedDate, selectedService, barbers]);

  const advance = (nextStep: number) => {
    setStep(nextStep);
    setMaxStep(m => Math.max(m, nextStep));
  };

  const canContinue = (() => {
    if (step === STEP.BARBER) return selectedBarber != null;
    if (step === STEP.SERVICE) return selectedService != null;
    if (step === STEP.LOCATION) return !!shop;
    if (step === STEP.DATETIME) return !!selectedDate && !!selectedTime;
    return true;
  })();

  const doBook = async () => {
    setSubmitting(true);
    setError('');
    try {
      const body = {
        barber_id: selectedBarber.id === 'any' ? (barbers[0]?.id ?? null) : selectedBarber.id,
        services: [{ id: selectedService.id, quantity: 1 }],
        customer_id: user?.customer_id || null,
        start_time: `${selectedDate}T${selectedTime}:00`,
        shop_id: shopId ? parseInt(shopId.toString()) : null,
        notes,
      };

      if (rescheduleId) {
        await apiClient.put(`/appointments/${rescheduleId}`, { ...body, barber_id: selectedBarber.id });
      } else {
        await apiClient.post('/appointments', body);
      }

      const refNum = `BBS-${Math.floor(Math.random() * 9000) + 1000}`;
      setConfirmRef(refNum);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || t('schedule.failed_booking', 'Booking failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = () => {
    if (!user) {
      setShowOtp(true);
    } else {
      doBook();
    }
  };

  const days = useMemo(() => buildDays(14), []);

  const categories = ['All', ...Array.from(new Set(services.map((s: any) => s.category).filter(Boolean)))];
  const filteredServices = serviceCategory === 'All' ? services : services.filter((s: any) => s.category === serviceCategory);

  const morning   = availableSlots.filter(s => parseInt(s) < 12);
  const afternoon = availableSlots.filter(s => parseInt(s) >= 12 && parseInt(s) < 17);
  const evening   = availableSlots.filter(s => parseInt(s) >= 17);

  const dateStr = selectedDate
    ? new Date(selectedDate + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    : '';

  /* ── Loading ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="booking-wrap" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Loader2 size={32} className="spinner" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  /* ── Success screen ──────────────────────────────────────── */
  if (success) {
    return (
      <div className="booking-wrap" style={{ textAlign: 'center' }}>
        <div style={{ width: 84, height: 84, margin: '20px auto 24px', borderRadius: '50%', background: 'var(--sage-soft)', display: 'grid', placeItems: 'center', color: '#4d6648', animation: 'toast-in .4s ease' }}>
          <CheckCircle size={40} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 38, letterSpacing: '-0.025em', margin: '0 0 10px' }}>
          {rescheduleId ? t('booking.updated', "You're updated.") : t('booking.success', "You're booked.")}
        </h1>
        <p className="muted" style={{ fontSize: 16, margin: '0 0 28px' }}>
          <Trans i18nKey={rescheduleId ? 'booking.updated_msg' : 'booking.confirmed_msg'} values={{ shopName: shop?.name }} components={{ strong: <strong /> }} />
        </p>

        <div className="card" style={{ maxWidth: 520, margin: '0 auto', padding: 24, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span className="chip chip-success dot">{t('booking.confirmed', 'Confirmed')}</span>
            <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{confirmRef}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
            {selectedService && <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><CheckCircle size={15} /></div><div><div className="muted" style={{ fontSize: 12 }}>{t('booking.service', 'Service')}</div><div style={{ fontWeight: 500 }}>{selectedService.name} · {selectedService.duration_minutes} min</div></div></div>}
            {selectedBarber && <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><User size={15} /></div><div><div className="muted" style={{ fontSize: 12 }}>{t('booking.barber', 'Barber')}</div><div style={{ fontWeight: 500 }}>{selectedBarber.fullname || selectedBarber.name}</div></div></div>}
            {selectedDate && <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Calendar size={15} /></div><div><div className="muted" style={{ fontSize: 12 }}>{t('booking.when', 'When')}</div><div style={{ fontWeight: 500 }}>{dateStr} · {selectedTime}</div></div></div>}
            {shop && <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><MapPin size={15} /></div><div><div className="muted" style={{ fontSize: 12 }}>{t('booking.where', 'Where')}</div><div style={{ fontWeight: 500 }}>{shop.name}</div></div></div>}
            <hr className="divider" style={{ margin: '6px 0' }} />
            {selectedService && <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}><span>{t('common.total', 'Total')}</span><span>{formatCurrency(selectedService.price, settings.currency_symbol)}</span></div>}
            <p className="muted" style={{ fontSize: 12 }}>{t('booking.pay_at_shop', "You'll pay at the shop. Cancel free up to 2 hours before.")}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate('/my-bookings')}>{t('booking.go_to_dashboard', 'My bookings')}</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate('/')}>{t('common.done', 'Done')}</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── TimeBlock helper ────────────────────────────────────── */
  const TimeBlock = ({ label, slots }: { label: string; slots: string[] }) => (
    slots.length === 0 ? null : (
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, color: 'var(--ink-3)', marginBottom: 8 }}>{label}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(86px, 1fr))', gap: 8 }}>
          {slots.map(s => (
            <button
              key={s}
              className={selectedTime === s ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
              style={{ justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}
              onClick={() => setSelectedTime(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    )
  );

  return (
    <div className="booking-wrap">
      <Stepper steps={STEPS.map(label => ({ label }))} current={step} max={maxStep} onJump={setStep} />

      {error && (
        <div style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)', padding: '10px 14px', borderRadius: 'var(--r)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Step 0 — Barber */}
      {step === STEP.BARBER && (
        <>
          <h2 className="section-title" style={{ fontSize: 28, margin: '0 0 6px' }}>{t('booking.choose_professional', 'Pick your barber')}</h2>
          <p className="muted" style={{ margin: '0 0 22px', fontSize: 15 }}>{t('booking.barber_hint', "Or skip — we'll match you with the next available.")}</p>
          <div className="option-grid">
            <OptionCard selected={selectedBarber?.id === 'any'} onClick={() => { setSelectedBarber({ id: 'any' }); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)' }}>
                  <Sparkles size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{t('booking.any_available', 'Any available')}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{t('booking.fastest_match', 'Fastest match')}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>{t('booking.soonest_opening', 'Soonest opening across the team')}</div>
            </OptionCard>

            {barbers.map(b => (
              <OptionCard key={b.id} selected={selectedBarber?.id === b.id} onClick={() => setSelectedBarber(b)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Avatar initials={(b.fullname || b.name || '').slice(0, 2).toUpperCase()} tone="var(--primary)" size={48} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.fullname || b.name}</div>
                    <div className="muted" style={{ fontSize: 13 }}>{t('booking.professional_barber', 'Professional Barber')}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
                    <Star size={13} fill="currentColor" /> 4.9
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>· {t('booking.professional_barber', 'Barber')}</span>
                </div>
              </OptionCard>
            ))}
          </div>
        </>
      )}

      {/* Step 1 — Service */}
      {step === STEP.SERVICE && (
        <>
          <h2 className="section-title" style={{ fontSize: 28, margin: '0 0 6px' }}>{t('booking.select_services', 'What are we doing today?')}</h2>
          <p className="muted" style={{ margin: '0 0 22px', fontSize: 15 }}>{t('booking.service_hint', 'Pick one service to start.')}</p>

          {categories.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
              {categories.map(c => (
                <button key={c} className={serviceCategory === c ? 'btn btn-primary btn-sm' : 'btn btn-soft btn-sm'} onClick={() => setServiceCategory(c)}>{c}</button>
              ))}
            </div>
          )}

          <div className="option-grid">
            {filteredServices.map((s: any) => (
              <OptionCard key={s.id} selected={selectedService?.id === s.id} onClick={() => setSelectedService(s)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', fontSize: 22 }}>✂️</div>
                </div>
                <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}>{s.name}</div>
                {s.description && <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.4 }}>{s.description}</div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <span className="muted" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={13} /> {s.duration_minutes} min
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19 }}>
                    {formatCurrency(s.price, settings.currency_symbol)}
                  </span>
                </div>
              </OptionCard>
            ))}
          </div>
        </>
      )}

      {step === STEP.LOCATION && shop && (
        <>
          <h2 className="section-title" style={{ fontSize: 28, margin: '0 0 6px' }}>{t('booking.where_to', 'Where to?')}</h2>
          <p className="muted" style={{ margin: '0 0 22px', fontSize: 15 }}>{t('booking.location_confirm_hint', "Here's where your appointment will be.")}</p>

          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: 0 }}>
              {shop.name}
            </h3>

            {shop.address && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <MapPin size={18} style={{ color: 'var(--ink-3)', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 15 }}>{shop.address}</span>
              </div>
            )}

            {shop.phone && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Phone size={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                <a href={`tel:${shop.phone}`} style={{ fontSize: 15, color: 'var(--ink)', textDecoration: 'none' }}>
                  {shop.phone}
                </a>
              </div>
            )}

            {(shopSettings?.open_time || shopSettings?.close_time) && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Clock size={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                <span style={{ fontSize: 15 }}>
                  {shopSettings.open_time ?? '—'} – {shopSettings.close_time ?? '—'}
                </span>
              </div>
            )}

            {shop.address && (
              <a
                className="btn btn-ghost btn-sm"
                href={`https://maps.google.com/?q=${encodeURIComponent(shop.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ alignSelf: 'flex-start', marginTop: 4, textDecoration: 'none', display: 'inline-flex', gap: 6, alignItems: 'center' }}
              >
                <Navigation size={14} /> {t('booking.get_directions', 'Get directions')}
              </a>
            )}
          </div>
        </>
      )}

      {/* Step 3/2 — Date & Time */}
      {step === STEP.DATETIME && (
        <>
          <h2 className="section-title" style={{ fontSize: 28, margin: '0 0 6px' }}>{t('booking.pick_date_time', 'Pick a time')}</h2>
          <p className="muted" style={{ margin: '0 0 22px', fontSize: 15 }}>{t('booking.datetime_hint', 'Times shown for your selected barber & location.')}</p>

          {/* 14-day horizontal strip */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 10 }}>{t('booking.choose_day', 'Choose a day')}</div>
            <div data-testid="day-strip" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
              {days.map((d, i) => {
                const iso = d.toISOString().slice(0, 10);
                const sel = selectedDate === iso;
                const isToday = i === 0;
                return (
                  <button
                    key={iso}
                    onClick={() => { setSelectedDate(iso); setSelectedTime(''); }}
                    style={{
                      flex: '0 0 72px', height: 88, borderRadius: 16,
                      border: sel ? '2px solid var(--ink)' : '1px solid var(--line)',
                      background: sel ? 'var(--ink)' : 'var(--surface)',
                      color: sel ? 'var(--bg)' : 'var(--ink)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                      cursor: 'pointer', position: 'relative',
                    }}
                    aria-pressed={sel}
                    aria-label={`${DAY_NAMES_FULL[d.getDay()]}, ${MONTH_FULL[d.getMonth()]} ${d.getDate()}`}
                  >
                    <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{DAY_NAMES[d.getDay()]}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em' }}>{d.getDate()}</div>
                    <div style={{ fontSize: 10.5, opacity: 0.65 }}>{MONTH_NAMES[d.getMonth()]}</div>
                    {isToday && <div style={{ position: 'absolute', top: 6, right: 8, width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            loadingSlots ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)' }}>
                <Loader2 size={28} className="spinner" style={{ display: 'block', margin: '0 auto 12px' }} />
                <span style={{ fontSize: 14 }}>{t('booking.finding_slots', 'Finding available slots…')}</span>
              </div>
            ) : availableSlots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 14 }}>
                {t('booking.no_slots', 'No slots available — try another day.')}
              </div>
            ) : (
              <>
                <TimeBlock label={t('booking.morning', 'Morning')} slots={morning} />
                <TimeBlock label={t('booking.afternoon', 'Afternoon')} slots={afternoon} />
                <TimeBlock label={t('booking.evening', 'Evening')} slots={evening} />
              </>
            )
          )}
        </>
      )}

      {/* Step 4/3 — Confirm */}
      {step === STEP.CONFIRM && (
        <>
          <h2 className="section-title" style={{ fontSize: 28, margin: '0 0 6px' }}>{t('booking.review_confirm', 'Look right?')}</h2>
          <p className="muted" style={{ margin: '0 0 22px', fontSize: 15 }}>{t('booking.confirm_hint', 'One last check before we lock it in.')}</p>

          <div className="card" style={{ padding: 28, marginBottom: 20 }}>
            {selectedBarber && selectedBarber.id !== 'any' && (
              <SummaryRow icon={<User size={18} />} label={t('booking.barber', 'Barber')} value={selectedBarber.fullname || selectedBarber.name} sub={t('booking.professional_barber', 'Professional Barber')} onEdit={() => setStep(STEP.BARBER)} />
            )}
            {selectedService && (
              <SummaryRow icon={<CheckCircle size={18} />} label={t('booking.service', 'Service')} value={selectedService.name} sub={`${selectedService.duration_minutes} min · ${formatCurrency(selectedService.price, settings.currency_symbol)}`} onEdit={() => setStep(STEP.SERVICE)} />
            )}
            {selectedDate && (
              <SummaryRow icon={<Calendar size={18} />} label={t('booking.date_time', 'Date & time')} value={`${dateStr} · ${selectedTime}`} sub={t('booking.calendar_invite', 'Calendar invite by email')} onEdit={() => setStep(STEP.DATETIME)} last />
            )}
          </div>

          <div className="card" style={{ padding: 22, marginBottom: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 14 }}>{t('booking.your_details', 'Your details')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">{t('booking.full_name', 'Full name')}</label>
                <input className="input" placeholder="Alex Morgan" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label">{t('booking.phone', 'Phone')}</label>
                <input className="input" placeholder="(555) 000-0000" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">{t('booking.additional_notes', 'Notes for your barber (optional)')}</label>
                <textarea className="textarea" placeholder={t('booking.notes_placeholder', 'Anything we should know?')} value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
          </div>

          <button
            className="btn btn-accent btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? <Loader2 size={20} className="spinner" /> : `${t('booking.confirm_booking', 'Confirm booking')} · ${selectedService ? formatCurrency(selectedService.price, settings.currency_symbol) : ''}`}
          </button>
          <p className="muted" style={{ textAlign: 'center', marginTop: 12, fontSize: 12.5 }}>
            {t('booking.pay_at_shop', "No charge now. You'll pay at the shop.")}
          </p>
        </>
      )}

      {/* Footer nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 36, paddingTop: 24, borderTop: '1px solid var(--line)' }}>
        <button
          className="btn btn-ghost"
          disabled={step === 0}
          onClick={() => step > 0 ? setStep(step - 1) : navigate('/discovery')}
        >
          <ChevronLeft size={16} /> {t('common.back', 'Back')}
        </button>

        {step < STEP.CONFIRM && (
          <button
            className="btn btn-primary"
            disabled={!canContinue}
            onClick={() => advance(step + 1)}
          >
            {t('common.continue', 'Continue')} <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* OTP Modal — shown post-confirm when user is not logged in */}
      <OtpModal
        isOpen={showOtp}
        onClose={() => setShowOtp(false)}
        onVerified={() => {
          setShowOtp(false);
          doBook();
        }}
      />
    </div>
  );
}
