import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { AlertCircle, PlusCircle, X, TrendingDown, Clock } from 'lucide-react';

export default function Inventory() {
  const [products, setProducts] = useState<any[]>([]);
  const [intelligence, setIntelligence] = useState<any[]>([]);
  const [showRestock, setShowRestock] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [restockAmount, setRestockAmount] = useState(0);
  const [restockReason, setRestockReason] = useState('Manual Restock');

  const fetchProducts = () => {
    apiClient.get('/inventory').then(res => setProducts(res.data));
    apiClient.get('/inventory/intelligence').then(res => setIntelligence(res.data));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || restockAmount <= 0) return;

    try {
      await apiClient.post('/inventory/restock', {
        product_id: selectedProduct.id,
        amount: restockAmount,
        reason: restockReason
      });
      setShowRestock(false);
      setRestockAmount(0);
      setRestockReason('Manual Restock');
      fetchProducts();
    } catch (err) {
      alert('Failed to restock');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Inventory Management</h1>
        <button onClick={() => { setShowRestock(true); setSelectedProduct(products[0]); }}>
          <PlusCircle size={20} style={{ marginRight: '0.5rem' }} /> Restock
        </button>
      </div>

      {intelligence.some(i => i.reorder_suggested) && (
        <div className="card" style={{ border: '1px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#f59e0b' }}>
            <TrendingDown size={24} />
            <h2 style={{ margin: 0, color: '#f59e0b' }}>Reorder Suggestions</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {intelligence.filter(i => i.reorder_suggested).map(i => (
              <div key={i.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{i.name}</div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                  {i.days_remaining <= 7 ? (
                    <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={14} /> Out of stock in ~{i.days_remaining} days
                    </span>
                  ) : (
                    <span>Current stock: {i.stock} (Min: {i.min_stock_threshold})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem' }}>Product</th>
              <th style={{ padding: '1rem' }}>Price</th>
              <th style={{ padding: '1rem' }}>Stock</th>
              <th style={{ padding: '1rem' }}>Threshold</th>
              <th style={{ padding: '1rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Supplier: {p.supplier_name || 'Not set'}</div>
                </td>
                <td style={{ padding: '1rem' }}>${p.price.toFixed(2)}</td>
                <td style={{ padding: '1rem' }}>{p.stock}</td>
                <td style={{ padding: '1rem', color: '#94a3b8' }}>{p.min_stock_threshold}</td>
                <td style={{ padding: '1rem' }}>
                  {p.stock <= p.min_stock_threshold ? (
                    <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={16} /> Low Stock
                    </span>
                  ) : (
                    <span style={{ color: '#10b981' }}>In Stock</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showRestock && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
            <X size={24} style={{ position: 'absolute', top: '1rem', right: '1rem', cursor: 'pointer' }} onClick={() => setShowRestock(false)} />
            <h2>Restock Product</h2>
            <form onSubmit={handleRestock} style={{ marginTop: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ marginBottom: '0.5rem', color: '#94a3b8' }}>Select Product</p>
                <select value={selectedProduct?.id} onChange={e => setSelectedProduct(products.find(p => p.id === parseInt(e.target.value)))}>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Current: {p.stock})</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ marginBottom: '0.5rem', color: '#94a3b8' }}>Amount to Add</p>
                <input type="number" min="1" value={restockAmount} onChange={e => setRestockAmount(parseInt(e.target.value) || 0)} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ marginBottom: '0.5rem', color: '#94a3b8' }}>Reason</p>
                <input type="text" value={restockReason} onChange={e => setRestockReason(e.target.value)} />
              </div>
              <button type="submit" style={{ width: '100%' }}>Confirm Restock</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
