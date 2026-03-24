import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { Trash2, ShoppingCart, User, Plus, X } from 'lucide-react';
import { calculatePOSTotals } from '../utils/pos';
import { useLocation } from 'react-router-dom';

export default function POS() {
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

  useEffect(() => {
    apiClient.get('/barbers').then(res => setBarbers(res.data)).catch(() => {});
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
        customer_email: customerEmail,
        customer_phone: customerPhone,
        items: cart.map(i => ({ id: i.id, name: i.name, type: i.type, price: i.price })),
        tip_amount: tipAmount,
        discount_amount: discountAmount
      });

      if (appointmentData?.appointmentId) {
        await apiClient.patch(`/appointments/${appointmentData.appointmentId}`, { status: 'completed' });
      }

      setCart([]);
      setCustomerEmail('');
      setCustomerPhone('');
      setTipAmount(0);
      setDiscountAmount(0);
      setShowCheckout(false);
      alert('Sale completed successfully!');
    } catch (err) {
      alert('Error processing sale');
    }
  };

  const { subtotal, total } = calculatePOSTotals(cart, tipAmount, discountAmount);

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
              >
                <option value="">Choose barber...</option>
                {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="card">
            <h2>2. Services</h2>
            <div className="item-list-grid">
              {services.map(s => (
                <button key={s.id} className="secondary" onClick={() => addToCart(s, 'service')} style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1rem', height: 'auto', textAlign: 'left' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{s.name}</span>
                  <span style={{ color: 'var(--primary)', fontWeight: '700' }}>${s.price.toFixed(2)}</span>
                  <div style={{ marginTop: '0.5rem', alignSelf: 'flex-end', background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={16} />
                  </div>
                </button>
              ))}
            </div>

            <h2 style={{ marginTop: '2rem' }}>3. Products</h2>
            <div className="item-list-grid">
              {products.map(p => (
                <button key={p.id} className="secondary" onClick={() => addToCart(p, 'product')} style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1rem', height: 'auto', textAlign: 'left' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{p.name}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: '700' }}>${p.price.toFixed(2)}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stock: {p.stock}</span>
                  </div>
                  <div style={{ marginTop: '0.5rem', alignSelf: 'flex-end', background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={16} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="summary-section">
          <div className="card" style={{ position: 'sticky', top: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <ShoppingCart size={24} color="var(--primary)" />
              <h2 style={{ marginBottom: 0 }}>Cart Summary</h2>
            </div>

            <div style={{ minHeight: '100px', maxHeight: '300px', overflowY: 'auto' }}>
              {cart.map(item => (
                <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{item.type}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600' }}>${item.price.toFixed(2)}</span>
                    <button className="secondary" style={{ padding: '0.4rem', color: 'var(--danger)', borderColor: 'transparent' }} onClick={() => removeFromCart(item.cartId)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <ShoppingCart size={40} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                  <p>Your cart is empty</p>
                </div>
              )}
            </div>
            
            <div style={{ marginTop: '1.5rem', background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <button 
              disabled={cart.length === 0}
              onClick={() => setShowCheckout(true)}
              style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1.1rem' }}
            >
              Checkout Now
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Modal (Full screen on mobile) */}
      {showCheckout && (
        <div className="modal-overlay">
          <div className="modal-content">
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
              </div>

              <div style={{ background: 'var(--primary)', color: 'white', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center', marginTop: '1rem' }}>
                <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>Amount Due</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>${total.toFixed(2)}</div>
              </div>

              <button onClick={submitSale} style={{ width: '100%', padding: '1.25rem', fontSize: '1.25rem', marginTop: '0.5rem' }}>
                Complete Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
