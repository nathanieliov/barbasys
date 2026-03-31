import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { Trash2, ShoppingCart, User, Plus, X } from 'lucide-react';
import { calculatePOSTotals } from '../utils/pos';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function POS() {
  const { user } = useAuth();
  const location = useLocation();
  const appointmentData = location.state;

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

  useEffect(() => {
    apiClient.get('/barbers').then(res => {
      setBarbers(res.data);
      if (user?.role === 'BARBER' && user.barber_id) {
        setSelectedBarber(user.barber_id.toString());
      }
    }).catch(() => {});
    apiClient.get('/services').then(res => setServices(res.data)).catch(() => {});
    apiClient.get('/inventory').then(res => setProducts(res.data)).catch(() => {});

    if (appointmentData) {
      setSelectedBarber(appointmentData.barberId.toString());
      if (appointmentData.service) {
        setCart([{ ...appointmentData.service, cartId: Date.now() }]);
      }
      if (appointmentData.customerId) {
        apiClient.get('/customers').then(res => {
          const customer = res.data.find((c: any) => c.id === appointmentData.customerId);
          if (customer) {
            setCustomerEmail(customer.email || '');
            setCustomerPhone(customer.phone || '');
          }
        });
      }
    }
  }, [appointmentData]);

  const addToCart = (item: any, type: string) => {
    setCart([...cart, { ...item, type, cartId: Date.now() }]);
  };

  const removeFromCart = (cartId: number) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const submitSale = async () => {
    if (!selectedBarber || cart.length === 0) return alert('Select barber and items');
    
    try {
      await apiClient.post('/sales', {
        barber_id: parseInt(selectedBarber),
        customer_email: customerEmail.trim() || null,
        customer_phone: customerPhone.trim() || null,
        items: cart.map(i => ({ id: i.id, name: i.name, type: i.type, price: i.price })),
        tip_amount: tipAmount || 0,
        discount_amount: discountAmount || 0
      });

      if (appointmentData?.appointmentId) {
        await apiClient.patch(`/appointments/${appointmentData.appointmentId}`, { status: 'completed' });
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

  const { subtotal, total } = calculatePOSTotals(cart, tipAmount || 0, discountAmount || 0);

  return (
    <div className="pos-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>Point of Sale</h1>
        {appointmentData && (
          <div className="status-badge status-scheduled" style={{ padding: '0.5rem 1rem' }}>
            Check-in: Appt #{appointmentData.appointmentId}
          </div>
        )}
      </div>
      
      <div className="pos-grid">
        <div className="items-section">
          <div className="card">
            <h2>1. Select Professional</h2>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--text-muted)' }} />
              <select 
                value={selectedBarber} 
                onChange={e => setSelectedBarber(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                disabled={user?.role === 'BARBER'}
              >
                <option value="">Choose barber...</option>
                {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              2. Services
            </h2>
            <div className="item-list-grid">
              {services.map(s => (
                <button key={s.id} className="secondary" onClick={() => addToCart(s, 'service')} style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1rem', height: 'auto', textAlign: 'left', minHeight: '100px' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{s.name}</span>
                  <span style={{ color: 'var(--primary)', fontWeight: '700' }}>${s.price.toFixed(2)}</span>
                  <div style={{ marginTop: 'auto', alignSelf: 'flex-end', background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)' }}>
                    <Plus size={18} />
                  </div>
                </button>
              ))}
            </div>

            <h2 style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              3. Products
            </h2>
            <div className="item-list-grid">
              {products.map(p => (
                <button key={p.id} className="secondary" onClick={() => addToCart(p, 'product')} style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1rem', height: 'auto', textAlign: 'left', minHeight: '100px' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{p.name}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginTop: 'auto' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: '700' }}>${p.price.toFixed(2)}</span>
                    <span style={{ fontSize: '0.7rem', color: p.stock < 5 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: '600' }}>Stock: {p.stock}</span>
                  </div>
                  <div style={{ marginTop: '0.5rem', alignSelf: 'flex-end', background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)' }}>
                    <Plus size={18} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="summary-section hide-mobile">
          <div className="card" style={{ position: 'sticky', top: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <ShoppingCart size={24} color="var(--primary)" />
              <h2 style={{ marginBottom: 0 }}>Cart Summary</h2>
            </div>

            <div style={{ minHeight: '100px', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {cart.map(item => (
                <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.025em' }}>{item.type}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700' }}>${item.price.toFixed(2)}</span>
                    <button className="secondary" style={{ padding: '0.5rem', color: 'var(--danger)', borderColor: 'transparent', borderRadius: '0.5rem' }} onClick={() => removeFromCart(item.cartId)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <ShoppingCart size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.1 }} />
                  <p style={{ fontWeight: '600' }}>Your cart is empty</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Select services or products to begin checkout.</p>
                </div>
              )}
            </div>
            
            <div style={{ marginTop: '2rem', background: '#f9fafb', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem' }}>
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-main)', borderTop: '1px dashed var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <button 
              disabled={cart.length === 0}
              onClick={() => setShowCheckout(true)}
              style={{ width: '100%', marginTop: '1.5rem', padding: '1.1rem', fontSize: '1.1rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}
            >
              Review & Checkout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Floating Cart Bar */}
      <div className="mobile-cart-bar show-mobile">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ position: 'relative', background: 'white', color: 'var(--primary)', padding: '0.75rem', borderRadius: '0.75rem' }}>
              <ShoppingCart size={24} />
              {cart.length > 0 && (
                <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: 'white', fontSize: '0.7rem', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', border: '2px solid var(--primary)' }}>
                  {cart.length}
                </span>
              )}
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: '800', opacity: 0.8 }}>Current Total</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900' }}>${total.toFixed(2)}</div>
            </div>
          </div>
          <button 
            disabled={cart.length === 0}
            onClick={() => setShowCheckout(true)}
            style={{ background: 'white', color: 'var(--primary)', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', fontWeight: '800' }}
          >
            Checkout
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 1023px) {
          .hide-mobile { display: none !important; }
          .pos-container { padding-bottom: 80px; }
        }
        @media (min-width: 1024px) {
          .show-mobile { display: none !important; }
        }
        .mobile-cart-bar {
          position: fixed;
          bottom: 1.5rem;
          left: 1.5rem;
          right: 1.5rem;
          background: var(--primary);
          color: white;
          padding: 1rem 1.25rem;
          border-radius: 1.25rem;
          box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.5);
          z-index: 100;
          display: flex;
        }
      `}} />

      {/* Checkout Modal (Full screen on mobile) */}
      {showCheckout && (
        <div className="modal-overlay">
          <div className="modal-content">
            {saleSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ background: 'var(--success)', color: 'white', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <ShoppingCart size={32} />
                </div>
                <h2>Sale Completed!</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>The transaction has been recorded successfully.</p>
                <button onClick={resetPOS} style={{ width: '100%', padding: '1rem' }}>
                  New Sale
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2>Finalize Sale</h2>
                  <button className="secondary" style={{ padding: '0.5rem' }} onClick={() => setShowCheckout(false)}>
                    <X size={20} />
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Discount ($)</label>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={discountAmount || ''}
                      onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Tip ($)</label>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={tipAmount || ''}
                      onChange={e => setTipAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Customer Email (Receipt)</label>
                    <input 
                      type="email" 
                      placeholder="name@example.com" 
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                    />
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Customer Phone</label>
                    <input 
                      type="tel" 
                      placeholder="+1 (555) 000-0000" 
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                    />
                    {(customerEmail || customerPhone) && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.5rem', fontWeight: '600' }}>
                        ✓ Digital receipt will be sent automatically.
                      </p>
                    )}
                    </div>
                  <div style={{ background: 'var(--primary)', color: 'white', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center', marginTop: '1rem' }}>
                    <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>Amount Due</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>${total.toFixed(2)}</div>
                  </div>

                  <button onClick={submitSale} style={{ width: '100%', padding: '1.25rem', fontSize: '1.25rem', marginTop: '0.5rem' }}>
                    Complete Payment
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
