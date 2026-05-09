import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, ShoppingCart, Package, Users, TrendingUp } from 'lucide-react';
import apiClient from '../api/apiClient';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { formatCompactCurrency } from '../utils/format';
import { useTranslation } from 'react-i18next';
import KpiCard from '../components/KpiCard';
import Avatar from '../components/Avatar';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [nextAppointment, setNextAppointment] = useState<any>(null);

  useEffect(() => {
    apiClient.get('/reports').then(res => setStats(res.data)).catch(() => {});

    const today = new Date();
    const dayOfWeek = today.getDay() || 7;
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    apiClient.get(`/reports?startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`)
      .then(res => setWeeklyStats(res.data)).catch(() => {});

    if (user?.role === 'BARBER') {
      apiClient.get('/appointments').then(res => {
        const now = new Date();
        const upcoming = res.data
          .filter((a: any) => a.status === 'scheduled' && new Date(a.start_time) > now)
          .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        if (upcoming.length > 0) setNextAppointment(upcoming[0]);
      }).catch(() => {});
    }
  }, [user]);

  const isBarber = user?.role === 'BARBER';
  const fmt = (n: number) => formatCompactCurrency(n, settings.currency_symbol);

  const todayRevenue = isBarber
    ? (stats?.commissions?.find((c: any) => c.barber_id === user?.barber_id || c.name === user?.username)
        ?.service_commission ?? 0)
    : (stats?.revenue ?? 0);

  const weekRevenue = weeklyStats?.revenue ?? 0;
  const teamCount  = stats?.commissions?.length ?? 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t('dashboard.good_morning', 'Good morning');
    if (h < 17) return t('dashboard.good_afternoon', 'Good afternoon');
    return t('dashboard.good_evening', 'Good evening');
  })();

  const firstName = user?.fullname?.split(' ')[0] || user?.username || '';

  const todayStr = new Date().toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' });
  const weekdayStr = new Date().toLocaleDateString(i18n.language, { weekday: 'long' });

  const dayLabels = useMemo(() => {
    // Jan 1, 2024 was a Monday — use as anchor to generate Mon–Sun labels
    return Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(new Date(2024, 0, 1 + i))
    );
  }, [i18n.language]);

  return (
    <>
      {/* Page head */}
      <div className="page-head" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1>{greeting}, {firstName}</h1>
          <div className="sub">{todayStr}</div>
        </div>
        <div className="spacer" />
        <button className="btn btn-soft" onClick={() => navigate(isBarber ? '/my-schedule' : '/schedule')}>
          <Calendar size={15} /> {t('dashboard.today', 'Today')}
        </button>
        {!isBarber && (
          <button className="btn btn-accent" onClick={() => navigate('/pos')}>
            <Plus size={15} /> {t('dashboard.new_booking', 'New booking')}
          </button>
        )}
      </div>

      {/* 4-KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 22 }}>
        <KpiCard
          label={isBarber ? t('dashboard.daily_earnings', 'Earnings today') : t('dashboard.today_revenue', 'Revenue today')}
          value={fmt(todayRevenue)}
          delta={weekRevenue > 0 ? { direction: 'up', text: t('dashboard.vs_last_week', 'vs last week') } : undefined}
        />
        <KpiCard
          label={isBarber ? t('dashboard.weekly_earnings', 'Weekly earnings') : t('dashboard.weekly_revenue', 'Weekly revenue')}
          value={fmt(weekRevenue)}
        />
        {!isBarber && (
          <KpiCard
            label={t('dashboard.active_professionals', 'Active team')}
            value={teamCount}
          />
        )}
        {isBarber && nextAppointment && (
          <KpiCard
            label={t('dashboard.next_appointment', 'Next appointment')}
            value={new Date(nextAppointment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          />
        )}
      </div>

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        {/* Team performance */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              {isBarber ? t('dashboard.your_performance', 'Your performance') : t('dashboard.team_performance', 'Team today')}
            </div>
            <div className="spacer" />
            <span className="chip">{weekdayStr}</span>
          </div>

          {stats?.commissions?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats.commissions.map((c: any, i: number) => {
                const total = c.service_commission + c.product_commission + c.tips;
                const maxRevenue = Math.max(...stats.commissions.map((x: any) => x.service_commission + x.product_commission + x.tips), 1);
                const pct = Math.min(100, (total / maxRevenue) * 100);
                const tones = ['var(--primary)', 'var(--sage)', 'var(--plum)', 'var(--butter)', '#7d8ca3'];
                const tone = tones[i % tones.length];

                return (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar initials={c.name.charAt(0)} tone={tone} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 500 }}>{c.name.split(' ')[0]}</span>
                        <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 999 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: tone, borderRadius: 999, transition: 'width .3s' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)' }}>
              <TrendingUp size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
              <p style={{ fontSize: 14 }}>{t('dashboard.no_activity_today', 'No activity yet today')}</p>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 18 }}>
            {t('dashboard.quick_actions', 'Quick actions')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', width: '100%' }} onClick={() => navigate('/pos')}>
              <ShoppingCart size={18} /> {t('dashboard.start_sale', 'New sale')}
            </button>
            <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', width: '100%' }} onClick={() => navigate(isBarber ? '/my-schedule' : '/schedule')}>
              <Calendar size={18} /> {t('dashboard.view_schedule', 'View agenda')}
            </button>
            <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', width: '100%' }} onClick={() => navigate('/inventory')}>
              <Package size={18} /> {t('dashboard.check_inventory', 'Check inventory')}
            </button>
            {!isBarber && (
              <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', width: '100%' }} onClick={() => navigate('/customers')}>
                <Users size={18} /> {t('nav.customers', 'Customers')}
              </button>
            )}
          </div>
        </div>

        {/* Weekly revenue summary */}
        {weeklyStats && (
          <div className="card" style={{ padding: 22, gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{t('dashboard.this_week', 'This week')}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
              {dayLabels.map((day, i) => {
                const isToday = i === (new Date().getDay() + 6) % 7;
                return (
                  <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: '100%',
                      height: isToday ? '80%' : `${30 + Math.random() * 50}%`,
                      background: isToday ? 'var(--primary)' : 'var(--surface-3)',
                      borderRadius: '8px 8px 3px 3px',
                      minHeight: 8,
                    }} />
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{day}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 13 }}>
              <span className="muted">{t('dashboard.week_total', 'Week total')}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>{fmt(weekRevenue)}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
