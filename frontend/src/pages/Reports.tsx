import { useEffect, useState } from 'react';
import axios from 'axios';
import { Calendar, DollarSign, TrendingUp } from 'lucide-react';

export default function Reports() {
  const [report, setReport] = useState<any>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rangeType, setRangeType] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    let startDate = date;
    let endDate = date;

    if (rangeType === 'week') {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day; // Adjust to Sunday
      const start = new Date(d.setDate(diff));
      const end = new Date(d.setDate(diff + 6));
      startDate = start.toISOString().split('T')[0];
      endDate = end.toISOString().split('T')[0];
    } else if (rangeType === 'month') {
      const d = new Date(date);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      startDate = start.toISOString().split('T')[0];
      endDate = end.toISOString().split('T')[0];
    }

    axios.get(`/api/reports?startDate=${startDate}&endDate=${endDate}`)
      .then(res => setReport(res.data))
      .catch(() => setReport(null));
  }, [date, rangeType]);

  const maxTotalPay = report?.commissions?.reduce((max: number, c: any) => 
    Math.max(max, c.service_commission + c.product_commission + c.tips), 0) || 1;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>{rangeType.charAt(0).toUpperCase() + rangeType.slice(1)} Reports</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', padding: '0.25rem' }}>
            {(['day', 'week', 'month'] as const).map(type => (
              <button 
                key={type}
                className="secondary"
                style={{ 
                  padding: '0.4rem 1rem', 
                  fontSize: '0.875rem', 
                  border: 'none',
                  background: rangeType === type ? 'var(--primary)' : 'transparent',
                  color: rangeType === type ? '#fff' : '#94a3b8'
                }}
                onClick={() => setRangeType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          <Calendar size={20} />
          <input 
            type={rangeType === 'month' ? 'month' : 'date'} 
            value={date} 
            onChange={e => setDate(e.target.value)}
            style={{ marginBottom: 0, width: 'auto' }}
          />
        </div>
      </div>

      <div className="grid" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '50%', color: '#10b981' }}>
            <TrendingUp size={32} />
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#94a3b8', fontSize: '1rem' }}>Total Revenue</h2>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text)' }}>
              ${report?.revenue?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '1rem', borderRadius: '50%', color: '#6366f1' }}>
            <DollarSign size={32} />
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#94a3b8', fontSize: '1rem' }}>Total Tips</h2>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text)' }}>
              ${report?.tips?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <h2>Barber Performance (Total Earnings)</h2>
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {report?.commissions?.map((c: any) => {
              const totalPay = c.service_commission + c.product_commission + c.tips;
              const percentage = Math.max(0, (totalPay / maxTotalPay) * 100);
              return (
                <div key={c.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <span>{c.name}</span>
                    <span style={{ fontWeight: 'bold' }}>${totalPay.toFixed(2)}</span>
                  </div>
                  <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', height: '12px', overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, background: 'var(--primary)', height: '100%', borderRadius: '999px', transition: 'width 0.5s ease' }}></div>
                  </div>
                </div>
              );
            })}
            {(!report?.commissions || report.commissions.length === 0) && (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No data for this date.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Detailed Earnings Breakdown</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem' }}>Barber</th>
                <th style={{ padding: '1rem' }}>Service Comm.</th>
                <th style={{ padding: '1rem' }}>Product Comm.</th>
                <th style={{ padding: '1rem' }}>Tips</th>
                <th style={{ padding: '1rem' }}>Total Pay</th>
              </tr>
            </thead>
            <tbody>
              {report?.commissions?.map((c: any) => {
                const totalPay = c.service_commission + c.product_commission + c.tips;
                return (
                  <tr key={c.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>{c.name}</td>
                    <td style={{ padding: '1rem' }}>${c.service_commission.toFixed(2)}</td>
                    <td style={{ padding: '1rem' }}>${c.product_commission.toFixed(2)}</td>
                    <td style={{ padding: '1rem' }}>${c.tips.toFixed(2)}</td>
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: '#6366f1' }}>
                      ${totalPay.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(!report?.commissions || report.commissions.length === 0) && (
            <p style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>No data for this date</p>
          )}
        </div>
      </div>
    </div>
  );
}
