import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { Clock, Calendar, User, TrendingUp, Filter } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Analytics() {
  const [data, setData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const fetchAnalytics = () => {
    apiClient.get(`/reports/analytics?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`)
      .then(res => setData(res.data));
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const maxHourly = Math.max(...(data?.hourlyRevenue?.map((h: any) => h.revenue) || [1]));
  const maxDaily = Math.max(...(data?.dailyRevenue?.map((d: any) => d.revenue) || [1]));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Business Analytics</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Filter size={20} color="#94a3b8" />
          <input 
            type="date" 
            value={dateRange.startDate} 
            onChange={e => setDateRange({...dateRange, startDate: e.target.value})}
            style={{ marginBottom: 0, width: 'auto' }}
          />
          <span style={{ color: '#94a3b8' }}>to</span>
          <input 
            type="date" 
            value={dateRange.endDate} 
            onChange={e => setDateRange({...dateRange, endDate: e.target.value})}
            style={{ marginBottom: 0, width: 'auto' }}
          />
        </div>
      </div>

      <div className="grid">
        {/* Revenue by Hour Heatmap */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <Clock size={20} color="var(--primary)" />
            <h2 style={{ margin: 0 }}>Revenue by Hour (Heatmap)</h2>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '200px', gap: '4px' }}>
            {Array.from({ length: 24 }).map((_, hour) => {
              const hourData = data?.hourlyRevenue?.find((h: any) => parseInt(h.hour) === hour);
              const height = hourData ? (hourData.revenue / maxHourly) * 100 : 0;
              return (
                <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ 
                    width: '100%', 
                    height: `${height}%`, 
                    background: height > 70 ? 'var(--primary)' : 'rgba(99, 102, 241, 0.3)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.5s ease'
                  }} title={`$${hourData?.revenue.toFixed(2) || 0}`}></div>
                  <span style={{ fontSize: '0.6rem', color: '#64748b' }}>{hour}h</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue by Day */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <Calendar size={20} color="var(--primary)" />
            <h2 style={{ margin: 0 }}>Busy Days</h2>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '200px', gap: '1rem' }}>
            {DAYS.map((day, idx) => {
              const dayData = data?.dailyRevenue?.find((d: any) => parseInt(d.day_of_week) === idx);
              const height = dayData ? (dayData.revenue / maxDaily) * 100 : 0;
              return (
                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ 
                    width: '100%', 
                    height: `${height}%`, 
                    background: 'var(--primary)',
                    borderRadius: '4px 4px 0 0',
                    opacity: height / 100 + 0.2
                  }} title={`$${dayData?.revenue.toFixed(2) || 0}`}></div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Performers Summary */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <TrendingUp size={20} color="#10b981" />
            <h2 style={{ margin: 0 }}>Key Stats</h2>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.5rem' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>Avg. Ticket Size</p>
              <h3 style={{ margin: '0.25rem 0 0 0' }}>
                ${(data?.barberPerformance?.reduce((acc: number, curr: any) => acc + (curr.total_revenue || 0), 0) / 
                   data?.barberPerformance?.reduce((acc: number, curr: any) => acc + (curr.total_sales || 0), 1)).toFixed(2)}
              </h3>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.5rem' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>Completion Rate</p>
              <h3 style={{ margin: '0.25rem 0 0 0' }}>
                {Math.round((data?.barberPerformance?.reduce((acc: number, curr: any) => acc + (curr.completed_appointments || 0), 0) / 
                  (data?.barberPerformance?.reduce((acc: number, curr: any) => acc + (curr.total_sales || 0), 0) || 1)) * 100)}%
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <User size={20} color="var(--primary)" />
          <h2 style={{ margin: 0 }}>Barber Performance Matrix</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem' }}>Barber</th>
              <th style={{ padding: '1rem' }}>Total Sales</th>
              <th style={{ padding: '1rem' }}>Appointments</th>
              <th style={{ padding: '1rem' }}>Avg Ticket</th>
              <th style={{ padding: '1rem' }}>Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data?.barberPerformance?.map((b: any) => (
              <tr key={b.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{b.name}</td>
                <td style={{ padding: '1rem' }}>{b.total_sales}</td>
                <td style={{ padding: '1rem' }}>{b.completed_appointments}</td>
                <td style={{ padding: '1rem' }}>${(b.avg_ticket_size || 0).toFixed(2)}</td>
                <td style={{ padding: '1rem', color: '#10b981', fontWeight: 'bold' }}>${(b.total_revenue || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
