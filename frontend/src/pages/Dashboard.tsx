import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { TrendingUp, Users, DollarSign, Calendar, Clock, ShoppingCart, Package } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/format';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [stats, setStats] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [nextAppointment, setNextAppointment] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Fetch Daily
    apiClient.get('/reports').then(res => setStats(res.data));
    
    const today = new Date();
    const dayOfWeek = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];
    apiClient.get(`/reports?startDate=${startDateStr}&endDate=${endDateStr}`).then(res => setWeeklyStats(res.data));

    if (user?.role === 'BARBER') {
      apiClient.get('/appointments').then(res => {
        const now = new Date();
        const future = res.data
          .filter((a: any) => a.status === 'scheduled' && new Date(a.start_time) > now)
          .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        if (future.length > 0) setNextAppointment(future[0]);
      });
    }
  }, [user]);

  const isBarber = user?.role === 'BARBER';
  
  const getCommissionData = (data: any) => {
    if (!data?.commissions) return null;
    return data.commissions.find((c: any) => c.barber_id === user?.barber_id || c.name === user?.username);
  };

  const myCommissions = isBarber ? getCommissionData(stats) : null;
  const myWeeklyCommissions = isBarber ? getCommissionData(weeklyStats) : null;

  const displayCurrency = (amount: number) => formatCurrency(amount, settings.currency_symbol);

  const todayTotal = isBarber 
    ? (myCommissions ? myCommissions.service_commission + myCommissions.product_commission + myCommissions.tips : 0)
    : (stats?.revenue || 0);

  const weeklyTotal = isBarber
    ? (myWeeklyCommissions ? myWeeklyCommissions.service_commission + myWeeklyCommissions.product_commission + myWeeklyCommissions.tips : 0)
    : (weeklyStats?.revenue || 0);

  return (
    <div className="dashboard-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>{t('dashboard.welcome', { name: user?.fullname || user?.username })}</h1>
        {isBarber && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            <Users size={16} /> {t('dashboard.professional_account')}
          </div>
        )}
        <p style={{ color: 'var(--text-muted)' }}>{t('dashboard.happening_today')}</p>
      </div>

      <div className="grid">
        {/* Metric 1 */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '0.75rem', borderRadius: '0.75rem' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>
              {isBarber ? t('dashboard.daily_earnings') : t('dashboard.today_revenue')}
            </p>
            <h2 style={{ marginBottom: 0, fontSize: '1.5rem', fontWeight: '800' }}>{displayCurrency(todayTotal)}</h2>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '0.75rem' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>
              {isBarber ? t('dashboard.weekly_earnings') : t('dashboard.weekly_revenue')}
            </p>
            <h2 style={{ marginBottom: 0, fontSize: '1.5rem', fontWeight: '800' }}>{displayCurrency(weeklyTotal)}</h2>
          </div>
        </div>

        {/* Metric 3 */}
        {!isBarber && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '0.75rem', borderRadius: '0.75rem' }}>
              <Users size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>{t('dashboard.active_professionals')}</p>
              <h2 style={{ marginBottom: 0, fontSize: '1.5rem', fontWeight: '800' }}>{stats?.commissions?.length || 0}</h2>
            </div>
          </div>
        )}

        {isBarber && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--primary)', color: 'white' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '0.75rem', borderRadius: '0.75rem' }}>
              <Clock size={24} />
            </div>
            <div>
              <p style={{ opacity: 0.8, fontSize: '0.85rem', fontWeight: '600' }}>{t('dashboard.next_appointment')}</p>
              <h2 style={{ marginBottom: 0, fontSize: '1.25rem', fontWeight: '800' }}>
                {nextAppointment ? (
                  `${new Date(nextAppointment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${nextAppointment.customer_name || t('schedule.guest_client')}`
                ) : t('dashboard.no_more_today')}
              </h2>
            </div>
          </div>
        )}
      </div>

      <div className="pos-grid">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Calendar size={20} color="var(--primary)" />
            <h2 style={{ marginBottom: 0 }}>{isBarber ? t('dashboard.your_performance') : t('dashboard.team_performance')}</h2>
          </div>
          
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {isBarber ? (
              myCommissions ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>{t('dashboard.service_commission')}</span>
                    <span style={{ fontWeight: '700' }}>{displayCurrency(myCommissions.service_commission)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>{t('dashboard.product_commission')}</span>
                    <span style={{ fontWeight: '700' }}>{displayCurrency(myCommissions.product_commission)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '0.5rem', border: '1px dashed var(--success)' }}>
                    <span style={{ color: 'var(--success)', fontWeight: '600' }}>{t('dashboard.tips')}</span>
                    <span style={{ fontWeight: '700', color: 'var(--success)' }}>{displayCurrency(myCommissions.tips)}</span>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <TrendingUp size={40} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
                  <p>{t('dashboard.no_sales_today')}</p>
                </div>
              )
            ) : (
              stats?.commissions?.length > 0 ? (
                stats.commissions.map((c: any) => (
                  <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {c.name.charAt(0)}
                      </div>
                      <span style={{ fontWeight: '600' }}>{c.name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700' }}>{displayCurrency(c.service_commission + c.product_commission)}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+ {displayCurrency(c.tips)} {t('dashboard.tips').toLowerCase()}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <Users size={40} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
                  <p>{t('dashboard.no_activity_today')}</p>
                </div>
              )
            )}
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '1.5rem' }}>{t('dashboard.quick_actions')}</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {isBarber ? (
              <>
                <button className="primary" style={{ justifyContent: 'flex-start', padding: '1.25rem' }} onClick={() => window.location.href='/my-schedule'}>
                  <Calendar size={20} style={{ marginRight: '0.75rem' }} /> {t('dashboard.go_to_schedule')}
                </button>
                <button className="secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }} onClick={() => window.location.href='/pos'}>
                  <ShoppingCart size={18} style={{ marginRight: '0.75rem' }} /> {t('dashboard.start_sale')}
                </button>
                <button className="secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }} onClick={() => window.location.href='/customers'}>
                  <Users size={18} style={{ marginRight: '0.75rem' }} /> {t('dashboard.search_customer')}
                </button>
              </>
            ) : (
              <>
                <button className="secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }} onClick={() => window.location.href='/pos'}>
                  <ShoppingCart size={18} style={{ marginRight: '0.75rem' }} /> {t('dashboard.start_sale')}
                </button>
                <button className="secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }} onClick={() => window.location.href='/schedule'}>
                  <Calendar size={18} style={{ marginRight: '0.75rem' }} /> {t('dashboard.view_schedule')}
                </button>
                <button className="secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }} onClick={() => window.location.href='/inventory'}>
                  <Package size={18} style={{ marginRight: '0.75rem' }} /> {t('dashboard.check_inventory')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
