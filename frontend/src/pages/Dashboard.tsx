import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { TrendingUp, Users, DollarSign, Calendar, Star, ShoppingCart, Package } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
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
  }, []);

  const isBarber = user?.role === 'BARBER';
  
  const getCommissionData = (data: any) => {
    if (!data?.commissions) return null;
    return data.commissions.find((c: any) => c.barber_id === user?.barber_id || c.name === user?.username);
  };

  const myCommissions = isBarber ? getCommissionData(stats) : null;
  const myWeeklyCommissions = isBarber ? getCommissionData(weeklyStats) : null;

  const formatCurrency = (amount: number) => `$${(amount || 0).toFixed(2)}`;

  const todayTotal = isBarber 
    ? (myCommissions ? myCommissions.service_commission + myCommissions.product_commission + myCommissions.tips : 0)
    : (stats?.revenue || 0);

  const weeklyTotal = isBarber
    ? (myWeeklyCommissions ? myWeeklyCommissions.service_commission + myWeeklyCommissions.product_commission + myWeeklyCommissions.tips : 0)
    : (weeklyStats?.revenue || 0);

  return (
    <div className="dashboard-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Welcome back, {user?.username}!</h1>
        <p style={{ color: 'var(--text-muted)' }}>Here's what's happening today at the shop.</p>
      </div>

      <div className="grid">
        {/* Metric 1 */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '0.75rem', borderRadius: '0.75rem' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>
              {isBarber ? "Daily Earnings" : "Today's Revenue"}
            </p>
            <h2 style={{ marginBottom: 0, fontSize: '1.5rem', fontWeight: '800' }}>{formatCurrency(todayTotal)}</h2>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '0.75rem' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>
              {isBarber ? "Weekly Earnings" : "Weekly Revenue"}
            </p>
            <h2 style={{ marginBottom: 0, fontSize: '1.5rem', fontWeight: '800' }}>{formatCurrency(weeklyTotal)}</h2>
          </div>
        </div>

        {/* Metric 3 */}
        {!isBarber && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '0.75rem', borderRadius: '0.75rem' }}>
              <Users size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Active Professionals</p>
              <h2 style={{ marginBottom: 0, fontSize: '1.5rem', fontWeight: '800' }}>{stats?.commissions?.length || 0}</h2>
            </div>
          </div>
        )}

        {isBarber && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '0.75rem', borderRadius: '0.75rem' }}>
              <Star size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Tips Today</p>
              <h2 style={{ marginBottom: 0, fontSize: '1.5rem', fontWeight: '800' }}>{formatCurrency(myCommissions?.tips || 0)}</h2>
            </div>
          </div>
        )}
      </div>

      <div className="pos-grid">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Calendar size={20} color="var(--primary)" />
            <h2 style={{ marginBottom: 0 }}>{isBarber ? "Your Performance Details" : "Team Performance Today"}</h2>
          </div>
          
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {isBarber ? (
              myCommissions ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Service Commission</span>
                    <span style={{ fontWeight: '700' }}>{formatCurrency(myCommissions.service_commission)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Product Commission</span>
                    <span style={{ fontWeight: '700' }}>{formatCurrency(myCommissions.product_commission)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '0.5rem', border: '1px dashed var(--success)' }}>
                    <span style={{ color: 'var(--success)', fontWeight: '600' }}>Tips</span>
                    <span style={{ fontWeight: '700', color: 'var(--success)' }}>{formatCurrency(myCommissions.tips)}</span>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <TrendingUp size={40} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
                  <p>No sales or commissions recorded for you yet today.</p>
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
                      <div style={{ fontWeight: '700' }}>{formatCurrency(c.service_commission + c.product_commission)}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+ {formatCurrency(c.tips)} tips</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <Users size={40} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
                  <p>No team activity recorded yet today.</p>
                </div>
              )
            )}
          </div>
        </div>

        {!isBarber && (
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>Quick Actions</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <button className="secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }} onClick={() => window.location.href='/pos'}>
                <ShoppingCart size={18} style={{ marginRight: '0.75rem' }} /> Start New Sale
              </button>
              <button className="secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }} onClick={() => window.location.href='/schedule'}>
                <Calendar size={18} style={{ marginRight: '0.75rem' }} /> View Schedule
              </button>
              <button className="secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }} onClick={() => window.location.href='/inventory'}>
                <Package size={18} style={{ marginRight: '0.75rem' }} /> Check Inventory
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
