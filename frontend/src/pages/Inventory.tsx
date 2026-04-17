import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { AlertCircle, PlusCircle, X, TrendingDown, Search, Package, Filter, Edit2, Trash2, Tag, DollarSign, Truck } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/format';
import { useTranslation } from 'react-i18next';

export default function Inventory() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const initialSupplierId = searchParams.get('supplierId');

  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [intelligence, setIntelligence] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showRestock, setShowRestock] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  
  // Restock Form
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [restockAmount, setRestockAmount] = useState(0);
  const [restockReason, setRestockReason] = useState(t('inventory.manual_restock'));

  // Product Add/Edit Form
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [prodName, setProdName] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodPrice, setProdNamePrice] = useState('');
  const [prodThreshold, setProdThreshold] = useState('2');
  const [prodSupplierId, setProdSupplierId] = useState('');

  const fetchData = () => {
    apiClient.get('/inventory').then(res => setProducts(res.data));
    apiClient.get('/inventory/intelligence').then(res => setIntelligence(res.data));
    apiClient.get('/suppliers').then(res => setSuppliers(res.data));
  };

  useEffect(() => {
    fetchData();
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
      setRestockReason(t('inventory.manual_restock'));
      fetchData();
    } catch (err) {
      alert(t('inventory.failed_restock'));
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodDescription || !prodPrice) return;

    const data = {
      name: prodName,
      description: prodDescription,
      price: parseFloat(prodPrice),
      min_stock_threshold: parseInt(prodThreshold),
      supplier_id: prodSupplierId ? parseInt(prodSupplierId) : null
    };

    try {
      if (editingProduct) {
        await apiClient.put(`/products/${editingProduct.id}`, data);
      } else {
        await apiClient.post('/products', data); 
      }
      resetProductForm();
      fetchData();
    } catch (err) {
      alert(t('inventory.failed_save'));
    }
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDescription('');
    setProdNamePrice('');
    setProdThreshold('2');
    setProdSupplierId('');
    setShowProductModal(false);
  };

  const startEditProduct = (p: any) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdDescription(p.description || '');
    setProdNamePrice(p.price.toString());
    setProdThreshold(p.min_stock_threshold.toString());
    setProdSupplierId(p.supplier_id?.toString() || '');
    setShowProductModal(true);
  };

  const deleteProduct = async (id: number) => {
    if (!window.confirm(t('inventory.delete_confirm'))) return;
    try {
      await apiClient.delete(`/products/${id}`);
      fetchData();
    } catch (err) {
      alert(t('inventory.failed_delete'));
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.supplier_name && p.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (initialSupplierId) {
      return matchesSearch && p.supplier_id === parseInt(initialSupplierId);
    }
    return matchesSearch;
  });

  const reorderSuggestions = intelligence.filter(i => i.reorder_suggested);

  return (
    <div className="inventory-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>{t('inventory.title')}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{t('inventory.manage_products')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="secondary" onClick={() => { setEditingProduct(null); resetProductForm(); setShowProductModal(true); }} style={{ gap: '0.5rem' }}>
            <PlusCircle size={20} /> <span className="hide-mobile">{t('inventory.add_product')}</span>
          </button>
          <button onClick={() => { setShowRestock(true); setSelectedProduct(products[0]); }} style={{ gap: '0.5rem' }}>
            <TrendingDown size={20} /> <span className="hide-mobile">{t('inventory.quick_restock')}</span>
          </button>
        </div>
      </div>

      {/* Reorder Suggestions Alert */}
      {reorderSuggestions.length > 0 && (
        <div className="card" style={{ border: '1px solid var(--warning)', background: 'rgba(245, 158, 11, 0.05)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'var(--warning)' }}>
            <TrendingDown size={24} />
            <h2 style={{ margin: 0, color: 'var(--warning)', fontSize: '1.1rem' }}>{t('inventory.smart_reorder_suggestions')}</h2>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {reorderSuggestions.map(i => (
              <div key={i.id} style={{ background: 'white', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{i.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {i.days_remaining <= 7 ? (
                      <span style={{ color: 'var(--danger)', fontWeight: '600' }}>{t('inventory.out_of_stock_in', { days: i.days_remaining })}</span>
                    ) : (
                      <span>{t('inventory.current_stock_label', { count: i.stock })}</span>
                    )}
                  </div>
                </div>
                <button className="secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }} onClick={() => { setSelectedProduct(products.find(p => p.id === i.id)); setShowRestock(true); }}>
                  {t('inventory.restock')}
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
              placeholder={t('inventory.search_placeholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
            />
          </div>
          <button className="secondary" style={{ gap: '0.5rem' }}>
            <Filter size={18} /> {t('inventory.filters')}
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
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem', lineHeight: '1.3' }}>{p.description}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{p.supplier_name || t('inventory.generic_supplier')}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button className="secondary" style={{ padding: '0.4rem', border: 'none' }} onClick={() => startEditProduct(p)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="secondary" style={{ padding: '0.4rem', color: 'var(--danger)', border: 'none' }} onClick={() => deleteProduct(p.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.25rem' }}>{t('inventory.current_stock')}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: isLowStock ? 'var(--danger)' : 'var(--text-main)' }}>{p.stock}</div>
                </div>
                <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.25rem' }}>{t('inventory.price')}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{formatCurrency(p.price, settings.currency_symbol)}</div>
                </div>
              </div>

              <button className="secondary" style={{ width: '100%', padding: '0.5rem' }} onClick={() => { setSelectedProduct(p); setShowRestock(true); }}>
                {t('inventory.quick_restock')}
              </button>

              {isLowStock && (
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: '600', justifyContent: 'center' }}>
                  <AlertCircle size={14} /> {t('inventory.critical_stock_level')}
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
                <h2 style={{ marginBottom: 0 }}>{t('inventory.restock_product')}</h2>
              </div>
              <button className="secondary" style={{ padding: '0.5rem' }} onClick={() => setShowRestock(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRestock}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('inventory.product')}</label>
                <select 
                  value={selectedProduct?.id} 
                  onChange={e => setSelectedProduct(products.find(p => p.id === parseInt(e.target.value)))}
                  style={{ fontWeight: '600' }}
                >
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({t('inventory.current_stock')}: {p.stock})</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('inventory.amount_to_add')}</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={restockAmount} 
                    onChange={e => setRestockAmount(parseInt(e.target.value) || 0)}
                    style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: 0 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('inventory.current_stock')}</label>
                  <div style={{ padding: '0.625rem 0.875rem', background: '#f3f4f6', borderRadius: '0.5rem', fontWeight: '700', fontSize: '1.1rem', border: '1px solid var(--border)' }}>
                    {selectedProduct?.stock || 0}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('inventory.reason_reference')}</label>
                <input 
                  type="text" 
                  value={restockReason} 
                  onChange={e => setRestockReason(e.target.value)} 
                  placeholder={t('inventory.reason_placeholder')}
                />
              </div>

              <button type="submit" style={{ width: '100%', padding: '1.1rem', fontSize: '1.1rem' }}>
                {t('inventory.confirm_restock')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Product Add/Edit Modal */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tag size={20} color="var(--primary)" />
                <h2 style={{ marginBottom: 0 }}>{editingProduct ? t('inventory.edit_product') : t('inventory.add_new_product')}</h2>
              </div>
              <button className="secondary" style={{ padding: '0.5rem' }} onClick={resetProductForm}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProductSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>{t('inventory.product_name')}</label>
                <input 
                  type="text" 
                  placeholder={t('inventory.product_name_placeholder')}
                  value={prodName} 
                  onChange={e => setProdName(e.target.value)} 
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>{t('inventory.description')}</label>
                <textarea 
                  placeholder={t('inventory.description_placeholder')}
                  value={prodDescription} 
                  onChange={e => setProdDescription(e.target.value)} 
                  style={{ width: '100%', minHeight: '80px', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '0.95rem' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>{t('inventory.retail_price')}</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--text-muted)' }} />
                    <input 
                      type="number" 
                      step="0.01" 
                      value={prodPrice} 
                      onChange={e => setProdNamePrice(e.target.value)} 
                      style={{ paddingLeft: '2.25rem', marginBottom: 0 }}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>{t('inventory.min_threshold')}</label>
                  <input 
                    type="number" 
                    value={prodThreshold} 
                    onChange={e => setProdThreshold(e.target.value)} 
                    style={{ marginBottom: 0 }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>{t('inventory.supplier')}</label>
                <div style={{ position: 'relative' }}>
                  <Truck size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--text-muted)' }} />
                  <select 
                    value={prodSupplierId} 
                    onChange={e => setProdSupplierId(e.target.value)}
                    style={{ paddingLeft: '2.25rem', marginBottom: 0 }}
                  >
                    <option value="">{t('inventory.select_supplier')}</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" style={{ width: '100%', padding: '1.1rem', fontSize: '1.1rem' }}>
                {editingProduct ? t('inventory.update_product') : t('inventory.create_product')}
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
