import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { AlertCircle, PlusCircle, X, TrendingDown, Search, Package, Filter } from 'lucide-react';

export default function Inventory() {
  const [products, setProducts] = useState<any[]>([]);
  const [intelligence, setIntelligence] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.supplier_name && p.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const reorderSuggestions = intelligence.filter(i => i.reorder_suggested);

  return (
    <div className="inventory-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Inventory</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your products and stock levels.</p>
        </div>
        <button onClick={() => { setShowRestock(true); setSelectedProduct(products[0]); }} style={{ gap: '0.5rem' }}>
          <PlusCircle size={20} /> <span className="hide-mobile">Restock Product</span>
        </button>
      </div>

      {/* Reorder Suggestions Alert */}
      {reorderSuggestions.length > 0 && (
        <div className="card" style={{ border: '1px solid var(--warning)', background: 'rgba(245, 158, 11, 0.05)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'var(--warning)' }}>
            <TrendingDown size={24} />
            <h2 style={{ margin: 0, color: 'var(--warning)', fontSize: '1.1rem' }}>Smart Reorder Suggestions</h2>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {reorderSuggestions.map(i => (
              <div key={i.id} style={{ background: 'white', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{i.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {i.days_remaining <= 7 ? (
                      <span style={{ color: 'var(--danger)', fontWeight: '600' }}>Out of stock in ~{i.days_remaining} days</span>
                    ) : (
                      <span>Current stock: {i.stock}</span>
                    )}
                  </div>
                </div>
                <button className="secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }} onClick={() => { setSelectedProduct(products.find(p => p.id === i.id)); setShowRestock(true); }}>
                  Restock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, position: 'relative', minWidth: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '0.75rem', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search products or suppliers..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
            />
          </div>
          <button className="secondary" style={{ gap: '0.5rem' }}>
            <Filter size={18} /> Filters
          </button>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {filteredProducts.map(p => {
          const isLowStock = p.stock <= p.min_stock_threshold;
          return (
            <div key={p.id} className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', background: isLowStock ? 'rgba(239, 68, 68, 0.1)' : 'rgba(79, 70, 229, 0.1)', color: isLowStock ? 'var(--danger)' : 'var(--primary)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={24} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '1rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.supplier_name || 'Generic Supplier'}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>${p.price.toFixed(2)}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Retail Price</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.25rem' }}>Current Stock</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: isLowStock ? 'var(--danger)' : 'var(--text-main)' }}>{p.stock}</div>
                </div>
                <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.25rem' }}>Threshold</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{p.min_stock_threshold}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="secondary" style={{ flex: 1, padding: '0.5rem' }} onClick={() => { setSelectedProduct(p); setShowRestock(true); }}>
                  Restock
                </button>
                <button className="secondary" style={{ flex: 1, padding: '0.5rem' }}>
                  Details
                </button>
              </div>

              {isLowStock && (
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: '600', justifyContent: 'center' }}>
                  <AlertCircle size={14} /> Critical stock level reached
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Restock Modal */}
      {showRestock && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={20} color="var(--primary)" />
                <h2 style={{ marginBottom: 0 }}>Restock Product</h2>
              </div>
              <button className="secondary" style={{ padding: '0.5rem' }} onClick={() => setShowRestock(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRestock}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Product</label>
                <select 
                  value={selectedProduct?.id} 
                  onChange={e => setSelectedProduct(products.find(p => p.id === parseInt(e.target.value)))}
                  style={{ fontWeight: '600' }}
                >
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (In Stock: {p.stock})</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Amount to Add</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={restockAmount} 
                    onChange={e => setRestockAmount(parseInt(e.target.value) || 0)}
                    style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: 0 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Current Stock</label>
                  <div style={{ padding: '0.625rem 0.875rem', background: '#f3f4f6', borderRadius: '0.5rem', fontWeight: '700', fontSize: '1.1rem', border: '1px solid var(--border)' }}>
                    {selectedProduct?.stock || 0}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Reason / Reference</label>
                <input 
                  type="text" 
                  value={restockReason} 
                  onChange={e => setRestockReason(e.target.value)} 
                  placeholder="e.g. Weekly Restock, Manual Correction"
                />
              </div>

              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <span>New Predicted Stock</span>
                  <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{(selectedProduct?.stock || 0) + restockAmount}</span>
                </div>
              </div>

              <button type="submit" style={{ width: '100%', padding: '1.1rem', fontSize: '1.1rem' }}>
                Confirm Restock
              </button>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 640px) {
          .hide-mobile { display: none; }
        }
      `}} />
    </div>
  );
}
