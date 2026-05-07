import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { ShoppingCart, User, Plus, Minus, X, CheckCircle } from 'lucide-react';
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
  type SuccessInfo = { id: number; email: string; phone: string };
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const [_showResend, setShowResend] = useState(false);
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
      apiClient.get(`/appointments/${appointmentId}`).then(apptRes => {
        const appt = apptRes.data;
        setSelectedBarber(appt.barber_id.toString());

        apiClient.get(`/appointments/${appointmentId}/items`).then(itemsRes => {
          setCart(itemsRes.data.map((item: any) => ({
            id: item.service_id,
            name: item.name,
            price: item.price,
            type: 'service',
            cartId: item.service_id,
            quantity: item.quantity
          })));
        });

        if (appt.customer_id) {
          apiClient.get(`/customers/${appt.customer_id}`).then(custRes => {
            setCustomerEmail(custRes.data.email || '');
            setCustomerPhone(custRes.data.phone || '');
          }).catch(() => {});
        }
      }).catch(() => {});
    }
  }, [appointmentId]);

  const addToCart = (item: any, type: string) => {
    setCart(prev => {
      const key = `${type}-${item.id}`;
      const existing = prev.find(i => i.cartId === key);
      if (existing) {
        return prev.map(i => i.cartId === key ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, type, cartId: key, quantity: 1 }];
    });
  };

  const changeQty = (cartId: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.cartId === cartId ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const [saleError, setSaleError] = useState('');

  const submitSale = async () => {
    setSaleError('');
    try {
      const response = await apiClient.post('/sales', {
        barber_id: parseInt(selectedBarber),
        customer_email: customerEmail || undefined,
        customer_phone: customerPhone || undefined,
        items: cart.map(i => ({ id: i.id, name: i.name, type: i.type, price: i.price, quantity: i.quantity })),
        tip_amount: tipAmount || 0,
        discount_amount: discountAmount || 0,
        appointment_id: appointmentId ? parseInt(appointmentId) : undefined
      });

      setSuccessInfo({ id: response.data.saleId, email: customerEmail, phone: customerPhone });
    } catch (err: any) {
      setSaleError(err.response?.data?.error || 'Error processing sale. Please check values.');
    }
  };

  const resetPOS = () => {
    setCart([]);
    setCustomerEmail('');
    setCustomerPhone('');
    setTipAmount(0);
    setDiscountAmount(0);
    setSuccessInfo(null);
    setShowCheckout(false);
  };

  const { subtotal, taxAmount, total } = calculatePOSTotals(cart, tipAmount || 0, discountAmount || 0, taxRate);

  if (successInfo) {
    const sentTo = [successInfo.email, successInfo.phone].filter(Boolean);
    const hasContact = sentTo.length > 0;

    return (
      <div className="card" style={{ maxWidth: 480, margin: '40px auto', padding: 36, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--sage-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 18px', color: '#4d6648' }}>
          <CheckCircle size={32} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '0 0 6px' }}>{t('pos.payment_successful')}</h2>
        <p className="muted" style={{ margin: '0 0 22px' }}>
          {hasContact
            ? t('pos.receipt_sent_to', 'Receipt sent to {{recipients}}', { recipients: sentTo.join(' & ') })
            : t('pos.no_contact_info', 'No contact info captured — no receipt sent.')}
        </p>
        {!hasContact && (
          <button className="btn btn-soft btn-sm" style={{ marginBottom: 12 }} onClick={() => setShowResend(true)}>
            {t('pos.send_receipt', 'Send receipt')}
          </button>
        )}
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={resetPOS}>
          {t('pos.new_transaction')}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1>{t('pos.title')}</h1>
        {appointmentId && <span className="chip chip-success dot">Appt #{appointmentId}</span>}
        <div className="spacer" />
        {user && <span className="chip"><User size={12} /> {user.fullname || user.username}</span>}
      </div>

      <div className="pos-grid">
        <div>
          {/* Services */}
          <div className="pos-tabs">
            <button className="active">{t('pos.services', 'Services')}</button>
            <button>{t('pos.products', 'Products')}</button>
          </div>

          <div className="svc-grid" style={{ marginBottom: 20 }}>
            {services.map(s => (
              <button key={s.id} className="svc-tile" onClick={() => addToCart(s, 'service')}>
                <div className="svc-icon">✂️</div>
                <div className="svc-name">{s.name}</div>
                <div className="svc-meta">{s.duration_minutes ?? 30} min</div>
                <div className="svc-price">{formatCurrency(s.price, settings.currency_symbol)}</div>
              </button>
            ))}
          </div>

          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12, color: 'var(--ink-2)' }}>{t('pos.products', 'Products')}</div>
          <div className="svc-grid">
            {products.map(p => (
              <button key={p.id} className="svc-tile" onClick={() => addToCart(p, 'product')} disabled={p.stock === 0} style={{ opacity: p.stock === 0 ? 0.5 : 1 }}>
                <div className="svc-icon">🧴</div>
                <div className="svc-name">{p.name}</div>
                <div className="svc-meta">{p.stock === 0 ? t('pos.out_of_stock', 'Out of stock') : `${p.stock} ${t('common.stock', 'in stock')}`}</div>
                <div className="svc-price">{formatCurrency(p.price, settings.currency_symbol)}</div>
              </button>
            ))}
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
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: '700', minWidth: '4rem', textAlign: 'right' }}>{formatCurrency(item.price * item.quantity, settings.currency_symbol)}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                          <button className="secondary" style={{ padding: '0.35rem 0.5rem', borderColor: 'transparent', borderRadius: 0 }} onClick={() => changeQty(item.cartId, -1)} aria-label="Decrease quantity">
                            <Minus size={14} />
                          </button>
                          <span style={{ padding: '0 0.5rem', fontWeight: '700', fontSize: '0.9rem' }}>{item.quantity}</span>
                          <button className="secondary" style={{ padding: '0.35rem 0.5rem', borderColor: 'transparent', borderRadius: 0 }} onClick={() => changeQty(item.cartId, 1)} aria-label="Increase quantity">
                            <Plus size={14} />
                          </button>
                        </div>
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

            {saleError && (
              <div style={{ padding: '0.75rem', background: 'var(--danger-light, #fee2e2)', color: 'var(--danger)', borderRadius: '0.5rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
                {saleError}
              </div>
            )}
            <button className="btn btn-accent" onClick={submitSale} style={{ width: '100%', justifyContent: 'center', fontSize: '1rem' }}>
              {t('pos.complete_payment')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

