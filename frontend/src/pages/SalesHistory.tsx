import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { ShoppingBag, Calendar, User, ChevronRight, Clock } from 'lucide-react';

export default function SalesHistory() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const fetchSales = () => {
    setLoading(true);
    apiClient.get(`/sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`)
      .then(res => setSales(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSales();
  }, [dateRange]);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="sales-history-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Sales Log</h1>
          <p style={{ color: 'var(--text-muted)' }}>Review and audit all shop transactions.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input 
              type="date" 
              value={dateRange.startDate} 
              onChange={e => setDateRange({...dateRange, startDate: e.target.value})}
              style={{ marginBottom: 0, width: 'auto', paddingLeft: '2.25rem', fontSize: '0.85rem', fontWeight: '600' }}
            />
          </div>
          <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>to</span>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input 
              type="date" 
              value={dateRange.endDate} 
              onChange={e => setDateRange({...dateRange, endDate: e.target.value})}
              style={{ marginBottom: 0, width: 'auto', paddingLeft: '2.25rem', fontSize: '0.85rem', fontWeight: '600' }}
            />
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p>Loading transaction history...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <ShoppingBag size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
            <p>No sales recorded for this period.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {sales.map(sale => (
              <div key={sale.id} className="card" style={{ marginBottom: 0, padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShoppingBag size={24} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: '800', fontSize: '1.1rem' }}>Sale #{sale.id}</span>
                        <span className="status-badge status-completed" style={{ fontSize: '0.65rem' }}>Paid</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
                        <Clock size={14} /> {formatDate(sale.timestamp)}
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <User size={16} color="var(--primary)" />
                      <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{sale.barber_name}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '1.5rem' }}>
                      {sale.customer_email || sale.customer_phone || 'Guest Customer'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '900', fontSize: '1.25rem', color: 'var(--text-main)' }}>
                      ${sale.total_amount.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: '700' }}>
                      Includes ${sale.tip_amount.toFixed(2)} tip
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {sale.items_summary?.split(',').map((item: string, idx: number) => {
                      const [type, price] = item.split(':');
                      return (
                        <span key={idx} style={{ fontSize: '0.7rem', background: '#f3f4f6', padding: '0.2rem 0.5rem', borderRadius: '0.5rem', color: 'var(--text-muted)', border: '1px solid var(--border)', textTransform: 'capitalize' }}>
                          {type} (${parseFloat(price).toFixed(2)})
                        </span>
                      );
                    })}
                  </div>
                  <button className="secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', border: 'none' }}>
                    Receipt <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
