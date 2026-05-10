import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/apiClient';
import { ShoppingCart, User, Plus, Minus, X, CheckCircle } from 'lucide-react';
import { calculatePOSTotals } from '../utils/pos';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/format';
import { useTranslation } from 'react-i18next';
import Modal from '../components/Modal';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useScrollLock } from '../hooks/useScrollLock';
import { useFocusTrap } from '../hooks/useFocusTrap';

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
  
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [showCheckout, setShowCheckout] = useState(false);
  type SuccessInfo = { id: number; email: string; phone: string };
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendPhone, setResendPhone] = useState('');
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState('');
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
  const [barberError, setBarberError] = useState('');
  const [showMobileCart, setShowMobileCart] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const mobileCartRef = useRef<HTMLDivElement>(null);
  useScrollLock(showMobileCart);
  useFocusTrap(mobileCartRef, showMobileCart);

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

  const handleResend = async () => {
    if (!successInfo) return;
    if (!resendEmail.trim() && !resendPhone.trim()) {
      setResendError(t('pos.email_or_phone_required', 'Enter at least an email or a phone number.'));
      return;
    }
    setResending(true);
    setResendError('');
    try {
      await apiClient.post(`/sales/${successInfo.id}/resend-receipt`, {
        email: resendEmail.trim() || null,
        phone: resendPhone.trim() || null,
      });
      setSuccessInfo({ ...successInfo, email: resendEmail.trim(), phone: resendPhone.trim() });
      setShowResend(false);
      setResendEmail('');
      setResendPhone('');
    } catch (err: any) {
      setResendError(err.response?.data?.error || 'Failed to send receipt');
    } finally {
      setResending(false);
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
      <>
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

        <Modal
          isOpen={showResend}
          onClose={() => { setShowResend(false); setResendError(''); }}
          title={t('pos.send_receipt', 'Send receipt')}
          size="sm"
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-soft btn-sm" onClick={() => { setShowResend(false); setResendError(''); }}>
                {t('common.cancel', 'Cancel')}
              </button>
              <button className="btn btn-accent btn-sm" disabled={resending} onClick={handleResend}>
                {t('pos.send', 'Send')}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label className="field-label">{t('common.email', 'Email')}</label>
              <input className="input" type="email" value={resendEmail} onChange={e => setResendEmail(e.target.value)} placeholder="alice@example.com" />
            </div>
            <div className="field">
              <label className="field-label">{t('common.phone', 'Phone')}</label>
              <input className="input" type="tel" value={resendPhone} onChange={e => setResendPhone(e.target.value)} placeholder="+1 555 123 4567" />
            </div>
            {resendError && (
              <div style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)', padding: '10px 14px', borderRadius: 'var(--r)', fontSize: 13 }}>
                {resendError}
              </div>
            )}
          </div>
        </Modal>
      </>
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
          <div className="pos-tabs">
            <button
              className={activeTab === 'services' ? 'active' : ''}
              onClick={() => setActiveTab('services')}
            >
              {t('pos.services', 'Services')}
            </button>
            <button
              className={activeTab === 'products' ? 'active' : ''}
              onClick={() => setActiveTab('products')}
            >
              {t('pos.products', 'Products')}
            </button>
          </div>

          {activeTab === 'services' && (
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
          )}

          {activeTab === 'products' && (
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
          )}
        </div>

        {/* Desktop cart sidebar */}
        {!isMobile && (
          <div className="cart-section">
            <CartPanel
              cart={cart}
              barbers={barbers}
              selectedBarber={selectedBarber}
              onBarberChange={v => { setSelectedBarber(v); setBarberError(''); }}
              barberError={barberError}
              subtotal={subtotal}
              taxAmount={taxAmount}
              taxRate={taxRate}
              discountAmount={discountAmount}
              total={total}
              onCheckout={() => {
                if (!selectedBarber) {
                  setBarberError(t('pos.select_barber_required', 'Please select a professional before continuing.'));
                  return;
                }
                setBarberError('');
                setShowCheckout(true);
              }}
              onQtyChange={changeQty}
              settings={settings}
              formatCurrency={formatCurrency}
            />
          </div>
        )}
      </div>

      {/* Mobile sticky bottom bar */}
      {isMobile && (
        <>
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'var(--surface)',
            borderTop: '1px solid var(--line)',
            padding: '12px 16px',
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            zIndex: 60,
          }}>
            <button
              className="btn btn-soft"
              style={{ position: 'relative', flexShrink: 0 }}
              onClick={() => setShowMobileCart(true)}
              aria-label={`${t('pos.current_cart')} (${cart.reduce((sum, i) => sum + i.quantity, 0)} items)`}
            >
              <ShoppingCart size={18} />
              {cart.length > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center' }}>
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              )}
            </button>
            <div style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>
              {cart.length === 0 ? t('pos.empty_cart') : formatCurrency(total, settings.currency_symbol)}
            </div>
            <button
              className="btn btn-accent"
              disabled={cart.length === 0}
              onClick={() => {
                if (!selectedBarber) {
                  setBarberError(t('pos.select_barber_required', 'Please select a professional before continuing.'));
                  setShowMobileCart(true);
                  return;
                }
                setBarberError('');
                setShowCheckout(true);
              }}
            >
              {t('pos.review_checkout')}
            </button>
          </div>

          {/* Mobile cart bottom sheet */}
          {showMobileCart && (
            <div
              className="modal-overlay"
              onClick={() => setShowMobileCart(false)}
              style={{ zIndex: 70 }}
            >
              <div
                ref={mobileCartRef}
                className="modal-content"
                style={{ maxWidth: '100%', maxHeight: '85dvh' }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShoppingCart size={20} /> {t('pos.current_cart')}
                  </h2>
                  <button className="icon-btn" onClick={() => setShowMobileCart(false)} aria-label={t('common.close')}>
                    <X size={18} />
                  </button>
                </div>
                <CartPanel
                  cart={cart}
                  barbers={barbers}
                  selectedBarber={selectedBarber}
                  onBarberChange={v => { setSelectedBarber(v); setBarberError(''); }}
                  barberError={barberError}
                  subtotal={subtotal}
                  taxAmount={taxAmount}
                  taxRate={taxRate}
                  discountAmount={discountAmount}
                  total={total}
                  onCheckout={() => {
                    if (!selectedBarber) {
                      setBarberError(t('pos.select_barber_required', 'Please select a professional before continuing.'));
                      return;
                    }
                    setBarberError('');
                    setShowMobileCart(false);
                    setShowCheckout(true);
                  }}
                  onQtyChange={changeQty}
                  settings={settings}
                  formatCurrency={formatCurrency}
                />
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        title={t('pos.checkout')}
        size="sm"
        footer={
          <>
            {saleError && (
              <div style={{ padding: '0.75rem', background: '#fee2e2', color: 'var(--danger)', borderRadius: 'var(--r)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                {saleError}
              </div>
            )}
            <button className="btn btn-accent" onClick={submitSale} style={{ width: '100%', justifyContent: 'center', fontSize: '1rem' }}>
              {t('pos.complete_payment')}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '700' }}>{t('pos.customer_contact_optional')}</label>
            <input type="email" placeholder={t('common.email')} value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} style={{ marginBottom: '0.5rem' }} />
            <input type="tel" placeholder={t('common.phone')} value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} style={{ marginBottom: 0 }} />
          </div>

          <div className="form-row form-row--2">
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '700' }}>{t('pos.tips_amount')}</label>
              <input type="number" value={tipAmount} onChange={e => setTipAmount(parseFloat(e.target.value) || 0)} style={{ fontWeight: '700', marginBottom: 0 }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '700' }}>{t('pos.discount_amount')}</label>
              <input type="number" value={discountAmount} onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)} style={{ fontWeight: '700', marginBottom: 0 }} />
            </div>
          </div>

          <div style={{ background: 'var(--primary)', color: 'white', padding: '1.5rem', borderRadius: 'var(--r-lg)', textAlign: 'center' }}>
            <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>{t('pos.amount_due')}</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{formatCurrency(total, settings.currency_symbol)}</div>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* ── Cart panel (shared between desktop sidebar and mobile sheet) ── */

interface CartPanelProps {
  cart: any[];
  barbers: any[];
  selectedBarber: string;
  onBarberChange: (v: string) => void;
  barberError: string;
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  discountAmount: number;
  total: number;
  onCheckout: () => void;
  onQtyChange: (cartId: string, delta: number) => void;
  settings: any;
  formatCurrency: (n: number, sym?: string) => string;
}

function CartPanel({ cart, barbers, selectedBarber, onBarberChange, barberError, subtotal, taxAmount, taxRate, discountAmount, total, onCheckout, onQtyChange, settings, formatCurrency }: CartPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="card" style={{ position: 'sticky', top: 'calc(var(--app-top-h) + 16px)', display: 'flex', flexDirection: 'column', minHeight: 'min(calc(100vh - 6rem), 600px)' }}>
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ShoppingCart size={20} color="var(--primary)" /> {t('pos.current_cart')}
      </h2>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('pos.serving_professional')}</label>
        <div style={{ position: 'relative' }}>
          <User size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <select
            value={selectedBarber}
            onChange={e => onBarberChange(e.target.value)}
            style={{ paddingLeft: '2.5rem', fontWeight: '700', marginBottom: 0 }}
          >
            <option value="">{t('pos.select_professional')}</option>
            {barbers.map(b => <option key={b.id} value={b.id}>{b.fullname || b.name}</option>)}
          </select>
        </div>
        {barberError && (
          <div style={{ marginTop: 6, padding: '0.6rem 0.9rem', background: 'var(--primary-soft)', color: 'var(--primary-deep)', borderRadius: 'var(--r)', fontSize: 13 }}>
            {barberError}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <ShoppingCart size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
            <p>{t('pos.empty_cart')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {cart.map(item => (
              <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--r)', border: '1px solid var(--line)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{item.type}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontWeight: '700', minWidth: '4rem', textAlign: 'right' }}>{formatCurrency(item.price * item.quantity, settings.currency_symbol)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                    <button className="secondary" style={{ padding: '0.35rem 0.5rem', minWidth: 32, minHeight: 32, borderColor: 'transparent', borderRadius: 0 }} onClick={() => onQtyChange(item.cartId, -1)} aria-label="Decrease quantity">
                      <Minus size={14} />
                    </button>
                    <span style={{ padding: '0 0.5rem', fontWeight: '700', fontSize: '0.9rem' }}>{item.quantity}</span>
                    <button className="secondary" style={{ padding: '0.35rem 0.5rem', minWidth: 32, minHeight: 32, borderColor: 'transparent', borderRadius: 0 }} onClick={() => onQtyChange(item.cartId, 1)} aria-label="Increase quantity">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: 'var(--surface-2)', padding: '1.25rem', borderRadius: 'var(--r-lg)', border: '1px solid var(--line)' }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: '900', color: 'var(--ink)', borderTop: '1px dashed var(--line)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
          <span>{t('pos.total')}</span>
          <span>{formatCurrency(total, settings.currency_symbol)}</span>
        </div>
      </div>

      <button
        disabled={cart.length === 0}
        className="btn btn-accent"
        onClick={onCheckout}
        style={{ width: '100%', marginTop: '1.25rem', justifyContent: 'center', fontSize: '1rem' }}
      >
        {t('pos.review_checkout')}
      </button>
    </div>
  );
}

