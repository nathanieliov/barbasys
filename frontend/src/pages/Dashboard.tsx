import { useEffect, useState } from 'react';
import axios from 'axios';
import { TrendingUp, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Fetch Daily
    axios.get('/api/reports').then(res => setStats(res.data));
    
    // Fetch Weekly
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day;
    const start = new Date(d.setDate(diff)).toISOString().split('T')[0];
    const end = new Date(d.setDate(diff + 6)).toISOString().split('T')[0];
    axios.get(`/api/reports?startDate=${start}&endDate=${end}`).then(res => setWeeklyStats(res.data));
  }, []);

  const isBarber = user?.role === 'BARBER';
  const myCommissions = isBarber && stats?.commissions 
    ? stats.commissions.find((c: any) => c.barber_id === user.barber_id || c.name === user.username)
    : null;
    
  const myWeeklyCommissions = isBarber && weeklyStats?.commissions
    ? weeklyStats.commissions.find((c: any) => c.barber_id === user.barber_id || c.name === user.username)
    : null;

  return (
    <div>
      <h1>Welcome back, {user?.username}!</h1>
      <div className="grid">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <TrendingUp color="#10b981" />
            <div>
              <p style={{ color: '#94a3b8' }}>{isBarber ? "Your Earnings Today" : "Today's Revenue"}</p>
              <h3>
                ${isBarber 
                  ? (myCommissions ? (myCommissions.service_commission + myCommissions.product_commission + myCommissions.tips).toFixed(2) : '0.00')
                  : (stats?.revenue || 0).toFixed(2)
                }
              </h3>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <TrendingUp color="#6366f1" />
            <div>
              <p style={{ color: '#94a3b8' }}>{isBarber ? "Your Earnings This Week" : "This Week's Revenue"}</p>
              <h3>
                ${isBarber 
                  ? (myWeeklyCommissions ? (myWeeklyCommissions.service_commission + myWeeklyCommissions.product_commission + myWeeklyCommissions.tips).toFixed(2) : '0.00')
                  : (weeklyStats?.revenue || 0).toFixed(2)
                }
              </h3>
            </div>
          </div>
        </div>

        {!isBarber && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Users color="#f59e0b" />
              <div>
                <p style={{ color: '#94a3b8' }}>Active Barbers</p>
                <h3>{stats?.commissions?.length || 0}</h3>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>{isBarber ? "Your Daily Performance" : "Daily Performance"}</h2>
        {isBarber ? (
          myCommissions ? (
            <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#94a3b8' }}>Service Commissions</span>
                <span>${myCommissions.service_commission.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#94a3b8' }}>Product Commissions</span>
                <span>${myCommissions.product_commission.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#94a3b8' }}>Tips</span>
                <span>${myCommissions.tips.toFixed(2)}</span>
              </div>
            </div>
          ) : <p>No earnings recorded yet today.</p>
        ) : (
          stats?.commissions?.map((c: any) => (
            <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span>{c.name}</span>
              <span>Commissions: ${(c.service_commission + c.product_commission).toFixed(2)}</span>
            </div>
          ))
        )}
        {!isBarber && (!stats?.commissions || stats.commissions.length === 0) && <p>No sales yet today.</p>}
      </div>
    </div>
  );
}
