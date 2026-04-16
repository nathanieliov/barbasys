import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { Trash2, ShoppingCart, User, Plus, X, Scissors } from 'lucide-react';
import { calculatePOSTotals } from '../utils/pos';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/format';
import { useTranslation } from 'react-i18next';

export default function POS() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');

  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [selectedBarber, setSelectedBarber] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [taxRate, setTaxRate] = useState(0);

  useEffect(() => {
    apiClient.get('/settings').then(res => {
      setTaxRate(parseFloat(res.data.default_tax_rate || '0'));
    });
    apiClient.get('/barbers').then(res => {
      setBarbers(res.data);
      if (user?.role === 'BARBER' && user.barber_id) {
        setSelectedBarber(user.barber_id.toString());
      }
    }).catch(() => {});
    apiClient.get('/services').then(res => setServices(res.data)).catch(() => {});
    apiClient.get('/inventory').then(res => setProducts(res.data)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (appointmentId) {
      apiClient.get('/appointments').then(res => {
        const appt = res.data.find((a: any) => a.id === parseInt(appointmentId));
        if (appt) {
          setSelectedBarber(appt.barber_id.toString());
          
          apiClient.get(`/appointments/${appointmentId}/items`).then(itemsRes => {
            const finalItems = itemsRes.data.flatMap((item: any) => 
              Array.from({ length: item.quantity }, () => ({
                id: item.service_id,
                name: item.name,
                price: item.price,
                type: 'service',
                cartId: Math.random()
              }))
            );
            setCart(finalItems);
          });

          if (appt.customer_id) {
            apiClient.get('/customers').then(custRes => {
              const customer = custRes.data.find((c: any) => c.id === appt.customer_id);
              if (customer) {
                setCustomerEmail(customer.email || '');
                setCustomerPhone(customer.phone || '');
              }
            });
          }
        }
      });
    }
  }, [appointmentId]);

  const addToCart = (item: any, type: string) => {
    setCart([...cart, { ...item, type, cartId: Date.now() }]);
  };

  const removeFromCart = (cartId: number) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const submitSale = async () => {
    try {
      await apiClient.post('/sales', {
        barber_id: parseInt(selectedBarber),
        customer_email: customerEmail || undefined,
        customer_phone: customerPhone || undefined,
        items: cart.map(i => ({ id: i.id, name: i.name, type: i.type, price: i.price })),
        tip_amount: tipAmount || 0,
        discount_amount: discountAmount || 0
      });

      if (appointmentId) {
        await apiClient.patch(`/appointments/${appointmentId}`, { status: 'completed' });
      }

      setSaleSuccess(true);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error processing sale. Please check values.');
    }
  };

  const resetPOS = () => {
    setCart([]);
    setCustomerEmail('');
    setCustomerPhone('');
    setTipAmount(0);
    setDiscountAmount(0);
    setSaleSuccess(false);
    setShowCheckout(false);
  };

  const { subtotal, taxAmount, total } = calculatePOSTotals(cart, tipAmount || 0, discountAmount || 0, taxRate);

  if (saleSuccess) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
        <div style={{ background: 'var(--success)', color: 'white', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <CheckCircle size={32} />
        </div>
        <h2 style={{ marginBottom: '1rem' }}>{t('pos.payment_successful')}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{t('pos.transaction_recorded')}</p>
        <button onClick={resetPOS}>{t('pos.new_transaction')}</button>
      </div>
    );
  }

  return (
    <div className="pos-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>{t('pos.title')}</h1>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: '700', fontSize: '0.9rem' }}>
              <User size={16} /> {t('common.professional')}: {user.fullname || user.username}
            </div>
          )}
        </div>
        {appointmentId && (
          <div className="status-badge status-scheduled" style={{ padding: '0.5rem 1rem' }}>
            {t('pos.check_in')}: Appt #{appointmentId}
          </div>
        )}
      </div>
      
      <div className="pos-grid">
        <div className="items-section">
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Scissors size={20} color="var(--primary)" /> {t('pos.services')}
            </h2>
            <div className="item-list-grid">
              {services.map(s => (
                <button key={s.id} className="secondary" onClick={() => addToCart(s, 'service')} style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1rem', height: 'auto', textAlign: 'left', minHeight: '100px' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{s.name}</span>
                  <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{formatCurrency(s.price, settings.currency_symbol)}</span>
                  <div style={{ marginTop: 'auto', alignSelf: 'flex-end', background: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)' }}>
                    <Plus size={18} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart size={20} color="var(--primary)" /> {t('pos.products')}
            </h2>
            <div className="item-list-grid">
              {products.map(p => (
                <button key={p.id} className="secondary" onClick={() => addToCart(p, 'product')} style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1rem', height: 'auto', textAlign: 'left', minHeight: '100px' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{p.name}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginTop: 'auto' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{formatCurrency(p.price, settings.currency_symbol)}</span>
                    <span style={{ fontSize: '0.7rem', color: p.stock < 5 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: '700' }}>{t('common.stock')}: {p.stock}</span>
                  </div>
                  <div style={{ marginTop: '0.5rem', alignSelf: 'flex-end', background: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)' }}>
                    <Plus size={18} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="cart-section">
          <div className="card" style={{ position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 8rem)' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart size={24} color="var(--primary)" /> {t('pos.current_cart')}
            </h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('pos.serving_professional')}</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--text-muted)' }} />
                <select 
                  value={selectedBarber} 
                  onChange={e => setSelectedBarber(e.target.value)}
                  style={{ paddingLeft: '2.5rem', fontWeight: '700' }}
                >
                  <option value="">{t('pos.select_professional')}</option>
                  {barbers.map(b => <option key={b.id} value={b.id}>{b.fullname || b.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <ShoppingCart size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                  <p>{t('pos.empty_cart')}</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {cart.map(item => (
                    <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{item.type}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: '700' }}>{formatCurrency(item.price, settings.currency_symbol)}</span>
                        <button className="secondary" style={{ padding: '0.5rem', color: 'var(--danger)', borderColor: 'transparent', borderRadius: '0.5rem' }} onClick={() => removeFromCart(item.cartId)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ marginTop: 'auto', background: '#f9fafb', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem' }}>
                <span>{t('pos.subtotal')}</span>
                <span>{formatCurrency(subtotal, settings.currency_symbol)}</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--danger)', fontWeight: '600', fontSize: '0.9rem' }}>
                  <span>{t('pos.discount')}</span>
                  <span>-{formatCurrency(discountAmount, settings.currency_symbol)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem' }}>
                <span>{t('pos.tax')} ({taxRate}%)</span>
                <span>{formatCurrency(taxAmount, settings.currency_symbol)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-main)', borderTop: '1px dashed var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <span>{t('pos.total')}</span>
                <span>{formatCurrency(total, settings.currency_symbol)}</span>
              </div>
            </div>

            <button 
              disabled={cart.length === 0}
              onClick={() => setShowCheckout(true)}
              style={{ width: '100%', marginTop: '1.25rem', padding: '1rem', fontSize: '1.1rem' }}
            >
              {t('pos.review_checkout')}
            </button>
          </div>
        </div>
      </div>

      {showCheckout && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>{t('pos.checkout')}</h2>
              <button className="secondary" onClick={() => setShowCheckout(false)} style={{ padding: '0.5rem' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '700' }}>{t('pos.customer_contact_optional')}</label>
              <input type="email" placeholder={t('common.email')} value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} style={{ marginBottom: '0.5rem' }} />
              <input type="tel" placeholder={t('common.phone')} value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '700' }}>{t('pos.tips_amount')}</label>
                <input type="number" value={tipAmount} onChange={e => setTipAmount(parseFloat(e.target.value) || 0)} style={{ fontWeight: '700' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '700' }}>{t('pos.discount_amount')}</label>
                <input type="number" value={discountAmount} onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)} style={{ fontWeight: '700' }} />
              </div>
            </div>

            <div style={{ background: 'var(--primary)', color: 'white', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center', marginTop: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>{t('pos.amount_due')}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{formatCurrency(total, settings.currency_symbol)}</div>
            </div>

            <button onClick={submitSale} style={{ width: '100%', padding: '1.25rem', fontSize: '1.1rem' }}>
              {t('pos.complete_payment')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const CheckCircle = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
