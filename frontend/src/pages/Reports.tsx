import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { Calendar, DollarSign, TrendingUp, Receipt, Users, PieChart, ArrowUpRight, ArrowDownRight, Briefcase, Download } from 'lucide-react';

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
      const start = new Date(new Date(date).setDate(diff));
      const end = new Date(new Date(date).setDate(diff + 6));
      startDate = start.toISOString().split('T')[0];
      endDate = end.toISOString().split('T')[0];
    } else if (rangeType === 'month') {
      const d = new Date(date);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      startDate = start.toISOString().split('T')[0];
      endDate = end.toISOString().split('T')[0];
    }

    apiClient.get(`/reports?startDate=${startDate}&endDate=${endDate}`)
      .then(res => setReport(res.data))
      .catch(() => setReport(null));
  }, [date, rangeType]);

  const exportData = async () => {
    let startDate = date;
    let endDate = date;

    if (rangeType === 'week') {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day;
      startDate = new Date(new Date(date).setDate(diff)).toISOString().split('T')[0];
      endDate = new Date(new Date(date).setDate(diff + 6)).toISOString().split('T')[0];
    } else if (rangeType === 'month') {
      const d = new Date(date);
      startDate = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    }

    try {
      const response = await apiClient.get(`/reports/export/sales?startDate=${startDate}&endDate=${endDate}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales-report-${startDate}-to-${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export report');
    }
  };

  const maxTotalPay = report?.commissions?.reduce((max: number, c: any) => 
    Math.max(max, c.total_payout), 0) || 1;

  const netProfit = (report?.revenue || 0) - (report?.expenses || 0);
  const profitMargin = report?.revenue ? (netProfit / report.revenue) * 100 : 0;

  return (
    <div className="reports-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Business Insights</h1>
          <p style={{ color: 'var(--text-muted)' }}>Analyze your shop's financial performance and team productivity.</p>
        </div>
        
        <div className="report-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={exportData} className="secondary" style={{ gap: '0.5rem', fontWeight: '700' }}>
            <Download size={18} /> <span className="hide-mobile">Export CSV</span>
          </button>
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '0.75rem', padding: '0.25rem', border: '1px solid var(--border)' }}>
            {(['day', 'week', 'month'] as const).map(type => (
              <button 
                key={type}
                className="secondary"
                style={{ 
                  padding: '0.4rem 0.85rem', 
                  fontSize: '0.75rem', 
                  fontWeight: '700',
                  border: 'none',
                  background: rangeType === type ? 'white' : 'transparent',
                  color: rangeType === type ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: rangeType === type ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  borderRadius: '0.5rem'
                }}
                onClick={() => setRangeType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input 
              type={rangeType === 'month' ? 'month' : 'date'} 
              value={date} 
              onChange={e => setDate(e.target.value)}
              style={{ marginBottom: 0, width: 'auto', paddingLeft: '2.25rem', fontSize: '0.85rem', fontWeight: '600' }}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '0.75rem', borderRadius: '0.75rem' }}>
              <TrendingUp size={24} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)', fontSize: '0.75rem', fontWeight: '700', background: 'rgba(16, 185, 129, 0.05)', padding: '0.25rem 0.5rem', borderRadius: '1rem' }}>
              <ArrowUpRight size={14} /> Gross Revenue
            </div>
          </div>
          <h2 style={{ marginBottom: '0.25rem', fontSize: '1.75rem', fontWeight: '900' }}>
            ${report?.revenue?.toFixed(2) || '0.00'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>Total collections</p>
        </div>

        <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '0.75rem' }}>
              <Receipt size={24} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: '700', background: 'rgba(239, 68, 68, 0.05)', padding: '0.25rem 0.5rem', borderRadius: '1rem' }}>
              <ArrowDownRight size={14} /> Expenses
            </div>
          </div>
          <h2 style={{ marginBottom: '0.25rem', fontSize: '1.75rem', fontWeight: '900' }}>
            ${report?.expenses?.toFixed(2) || '0.00'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>Supplies & overheads</p>
        </div>

        <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '0.75rem' }}>
              <DollarSign size={24} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '700', background: 'rgba(79, 70, 229, 0.05)', padding: '0.25rem 0.5rem', borderRadius: '1rem' }}>
              <PieChart size={14} /> {profitMargin.toFixed(0)}% Margin
            </div>
          </div>
          <h2 style={{ marginBottom: '0.25rem', fontSize: '1.75rem', fontWeight: '900' }}>
            ${netProfit.toFixed(2)}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>Net take-home</p>
        </div>
      </div>

      <div className="pos-grid" style={{ marginBottom: '2rem' }}>
        {/* Barber Performance */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Users size={20} color="var(--primary)" />
            <h2 style={{ marginBottom: 0 }}>Team Performance</h2>
          </div>
          
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {report?.commissions?.map((c: any) => {
              const percentage = Math.max(2, (c.total_payout / maxTotalPay) * 100);
              return (
                <div key={c.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '800' }}>
                        {c.name.charAt(0)}
                      </div>
                      <span style={{ fontWeight: '700' }}>{c.name}</span>
                    </div>
                    <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>${c.total_payout.toFixed(2)}</span>
                  </div>
                  <div style={{ width: '100%', background: '#f3f4f6', borderRadius: '999px', height: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ width: `${percentage}%`, background: 'linear-gradient(to right, var(--primary), #818cf8)', height: '100%', borderRadius: '999px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                  </div>
                </div>
              );
            })}
            {(!report?.commissions || report.commissions.length === 0) && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <Users size={40} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
                <p>No activity recorded for this period.</p>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Briefcase size={20} color="var(--primary)" />
            <h2 style={{ marginBottom: 0 }}>Earnings Breakdown</h2>
          </div>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            {report?.commissions?.map((c: any) => {
              return (
                <div key={c.name} style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: '800', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>{c.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Services</div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>${c.service_commission.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Products</div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>${c.product_commission.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Tips</div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--success)' }}>${c.tips.toFixed(2)}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Total Payout</span>
                    <span style={{ fontWeight: '900', color: 'var(--primary)' }}>${c.total_payout.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
            {(!report?.commissions || report.commissions.length === 0) && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <Receipt size={40} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
                <p>Detailed data unavailable.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 640px) {
          .kpi-grid { display: flex !important; overflow-x: auto !important; padding-bottom: 1rem !important; margin: 0 -1rem 1.5rem !important; padding: 0 1rem !important; scroll-snap-type: x mandatory; }
          .kpi-grid .card { min-width: 280px !important; scroll-snap-align: start; }
          .report-controls { width: 100% !important; justify-content: space-between !important; position: sticky; top: 3.5rem; z-index: 40; background: var(--bg); padding: 0.75rem 0; }
          .reports-container { padding-top: 0.5rem; }
        }
      `}} />
    </div>
  );
}
