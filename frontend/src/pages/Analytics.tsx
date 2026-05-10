import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { Clock, Calendar, User, TrendingUp, Filter } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/format';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function Analytics() {
  const { settings } = useSettings();
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
        <h1>Analíticas de Negocio</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Filter size={20} color="#94a3b8" />
          <input
            type="date"
            value={dateRange.startDate}
            onChange={e => setDateRange({...dateRange, startDate: e.target.value})}
            style={{ marginBottom: 0, width: 'auto', fontSize: '1rem' }}
          />
          <span style={{ color: '#94a3b8' }}>hasta</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={e => setDateRange({...dateRange, endDate: e.target.value})}
            style={{ marginBottom: 0, width: 'auto', fontSize: '1rem' }}
          />
        </div>
      </div>

      <div className="grid">
        {/* Revenue by Hour Heatmap */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <Clock size={20} color="var(--primary)" />
            <h2 style={{ margin: 0 }}>Ingresos por Hora (Mapa de Calor)</h2>
          </div>
          <div
            role="img"
            aria-label="Revenue by hour — highest bars indicate peak hours"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', alignItems: 'flex-end', height: '160px', gap: '3px' }}
          >
            {Array.from({ length: 24 }).map((_, hour) => {
              const hourData = data?.hourlyRevenue?.find((h: any) => parseInt(h.hour) === hour);
              const height = hourData ? (hourData.revenue / maxHourly) * 100 : 0;
              return (
                <div key={hour} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{
                    width: '100%',
                    height: `${Math.max(2, height)}%`,
                    background: height > 70 ? 'var(--primary)' : 'rgba(99, 102, 241, 0.3)',
                    borderRadius: '3px 3px 0 0',
                    transition: 'height 0.5s ease',
                    minHeight: 2,
                  }} title={formatCurrency(hourData?.revenue, settings.currency_symbol)} />
                  {hour % 6 === 0 && (
                    <span style={{ fontSize: 'clamp(9px,1.8vw,11px)', color: '#64748b', whiteSpace: 'nowrap' }}>{hour}h</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue by Day */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <Calendar size={20} color="var(--primary)" />
            <h2 style={{ margin: 0 }}>Días de Mayor Actividad</h2>
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
                  }} title={formatCurrency(dayData?.revenue, settings.currency_symbol)}></div>
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
            <h2 style={{ margin: 0 }}>Estadísticas Clave</h2>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.5rem' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>Tamaño Promedio de Ticket</p>
              <h3 style={{ margin: '0.25rem 0 0 0' }}>
                {formatCurrency(data?.barberPerformance?.reduce((acc: number, curr: any) => acc + (curr.total_revenue || 0), 0) / 
                   data?.barberPerformance?.reduce((acc: number, curr: any) => acc + (curr.total_sales || 0), 1), settings.currency_symbol)}
              </h3>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.5rem' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>Tasa de Finalización</p>
              <h3 style={{ margin: '0.25rem 0 0 0' }}>
                {Math.round((data?.barberPerformance?.reduce((acc: number, curr: any) => acc + (curr.completed_appointments || 0), 0) / 
                  (data?.barberPerformance?.reduce((acc: number, curr: any) => acc + (curr.total_sales || 0), 0) || 1)) * 100)}%
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem', padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.25rem 1.25rem 1rem' }}>
          <User size={20} color="var(--primary)" />
          <h2 style={{ margin: 0 }}>Matriz de Rendimiento de Barberos</h2>
        </div>
        <p className="table-scroll-hint" style={{ padding: '0 1.25rem' }}>Swipe for more →</p>
        <div className="table-scroll">
          <table className="tbl tbl--sticky-first" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem' }}>Barbero</th>
                <th style={{ padding: '1rem' }}>Ventas Totales</th>
                <th style={{ padding: '1rem' }}>Citas</th>
                <th style={{ padding: '1rem' }}>Ticket Promedio</th>
                <th style={{ padding: '1rem' }}>Ingresos Totales</th>
              </tr>
            </thead>
            <tbody>
              {data?.barberPerformance?.map((b: any) => (
                <tr key={b.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{b.name}</td>
                  <td style={{ padding: '1rem' }}>{b.total_sales}</td>
                  <td style={{ padding: '1rem' }}>{b.completed_appointments}</td>
                  <td style={{ padding: '1rem' }}>{formatCurrency(b.avg_ticket_size, settings.currency_symbol)}</td>
                  <td style={{ padding: '1rem', color: '#10b981', fontWeight: 'bold' }}>{formatCurrency(b.total_revenue, settings.currency_symbol)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
