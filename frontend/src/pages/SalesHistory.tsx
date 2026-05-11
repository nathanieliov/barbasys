import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { ShoppingBag, Calendar, User, Clock, X, Receipt, Scissors, Tag } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/format';

export default function SalesHistory() {
  const { settings } = useSettings();
  const { user } = useAuth();
  const isBarber = user?.role === 'BARBER';

  const [sales, setSales] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);

  const fetchSales = () => {
    setLoading(true);
    let url = `/sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
    if (selectedBarberId) {
      url += `&barberId=${selectedBarberId}`;
    }
    
    apiClient.get(url)
      .then(res => setSales(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSales();
  }, [dateRange, selectedBarberId]);

  useEffect(() => {
    if (!isBarber) {
      apiClient.get('/barbers').then(res => setBarbers(res.data)).catch(() => {});
    }
  }, [isBarber]);

  const fetchSaleDetail = async (id: number) => {
    try {
      const res = await apiClient.get(`/sales/${id}`);
      setSelectedSale(res.data);
    } catch (err) {
      alert('Failed to load sale details');
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>{isBarber ? 'My Sales Log' : 'Shop Sales Log'}</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {isBarber ? 'Review your personal transaction history.' : 'Review and audit all shop transactions.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {!isBarber && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <select 
                value={selectedBarberId}
                onChange={e => setSelectedBarberId(e.target.value)}
                style={{ marginBottom: 0, paddingLeft: '2.25rem', fontSize: '1rem', fontWeight: '600' }}
              >
                <option value="">All Professionals</option>
                {barbers.map(b => <option key={b.id} value={b.id}>{b.fullname || b.name}</option>)}
              </select>
            </div>
          )}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input 
              type="date" 
              value={dateRange.startDate} 
              onChange={e => setDateRange({...dateRange, startDate: e.target.value})}
              style={{ marginBottom: 0, width: 'auto', paddingLeft: '2.25rem', fontSize: '1rem', fontWeight: '600' }}
            />
          </div>
          <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>to</span>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={e => setDateRange({...dateRange, endDate: e.target.value})}
              style={{ marginBottom: 0, width: 'auto', paddingLeft: '2.25rem', fontSize: '1rem', fontWeight: '600' }}
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
              <div key={sale.id} className="card" style={{ marginBottom: 0, padding: '1rem', cursor: 'pointer' }} onClick={() => fetchSaleDetail(sale.id)}>
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
                      {sale.is_walkin
                        ? 'Walk-in'
                        : (sale.customer_name || sale.customer_email || sale.customer_phone || 'Walk-in')}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '900', fontSize: '1.25rem', color: 'var(--text-main)' }}>
                      {formatCurrency(sale.total_amount, settings.currency_symbol)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: '700' }}>
                      Includes {formatCurrency(sale.tip_amount, settings.currency_symbol)} tip
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Receipt size={24} color="var(--primary)" />
                <h2 style={{ marginBottom: 0 }}>Transaction Details</h2>
              </div>
              <button className="btn btn-ghost" onClick={() => setSelectedSale(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#f9fafb', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Transaction ID</span>
                <span style={{ fontWeight: '700' }}>#{selectedSale.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Date & Time</span>
                <span style={{ fontWeight: '700' }}>{formatDate(selectedSale.timestamp)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Served By</span>
                <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{selectedSale.barber_name}</span>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Itemized Summary</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {selectedSale.items?.map((item: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: item.type === 'service' ? 'rgba(79, 70, 229, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: item.type === 'service' ? 'var(--primary)' : 'var(--success)', padding: '0.4rem', borderRadius: '0.5rem' }}>
                        {item.type === 'service' ? <Scissors size={14} /> : <Tag size={14} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{item.item_name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{item.type}</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: '700' }}>{formatCurrency(item.price, settings.currency_symbol)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                <span>Subtotal</span>
                <span>{formatCurrency(selectedSale.total_amount - selectedSale.tip_amount + selectedSale.discount_amount - (selectedSale.tax_amount || 0), settings.currency_symbol)}</span>
              </div>
              {selectedSale.tax_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                  <span>Tax</span>
                  <span>+{formatCurrency(selectedSale.tax_amount, settings.currency_symbol)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--success)', fontSize: '0.9rem' }}>
                <span>Gratuity (Tip)</span>
                <span>+{formatCurrency(selectedSale.tip_amount, settings.currency_symbol)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--danger)', fontSize: '0.9rem' }}>
                <span>Discount</span>
                <span>-{formatCurrency(selectedSale.discount_amount, settings.currency_symbol)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--primary)', color: 'white', borderRadius: '0.75rem' }}>
                <span style={{ fontWeight: '600' }}>Total Paid</span>
                <span style={{ fontSize: '1.5rem', fontWeight: '900' }}>{formatCurrency(selectedSale.total_amount, settings.currency_symbol)}</span>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button className="btn btn-ghost">Print Receipt</button>
              <button className="btn btn-ghost">Email Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
