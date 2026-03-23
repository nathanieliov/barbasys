import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { Trash2 } from 'lucide-react';
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

  useEffect(() => {
    apiClient.get('/barbers').then(res => setBarbers(res.data)).catch(() => {});
    apiClient.get('/services').then(res => setServices(res.data)).catch(() => {});
    apiClient.get('/inventory').then(res => setProducts(res.data)).catch(() => {});

    // If navigated from Schedule with an appointment
    if (appointmentData) {
      setSelectedBarber(appointmentData.barberId.toString());
      if (appointmentData.service) {
        setCart([{ ...appointmentData.service, cartId: Date.now() }]);
      }
      // If we had customer data, we'd fetch it here or pass it in state
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

      // If this was an appointment, mark it completed
      if (appointmentData?.appointmentId) {
        await apiClient.patch(`/appointments/${appointmentData.appointmentId}`, { status: 'completed' });
      }

      setCart([]);
      setCustomerEmail('');
      setCustomerPhone('');
      setTipAmount(0);
      setDiscountAmount(0);
      alert('Sale completed and appointment closed!');
    } catch (err) {
      alert('Error processing sale');
    }
  };

  const { subtotal, total } = calculatePOSTotals(cart, tipAmount, discountAmount);

  return (
    <div className="pos-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>New Sale</h1>
        {appointmentData && (
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #6366f1', color: '#6366f1', fontSize: '0.875rem' }}>
            Checking in Appointment #{appointmentData.appointmentId}
          </div>
        )}
      </div>
      
      <div className="grid">
        <div className="card">
          <h2>1. Select Barber</h2>
          <select value={selectedBarber} onChange={e => setSelectedBarber(e.target.value)}>
            <option value="">Choose barber...</option>
            {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <h2>2. Services</h2>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {services.map(s => (
              <button key={s.id} className="secondary" onClick={() => addToCart(s, 'service')} style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                <span>{s.name}</span>
                <span>${s.price.toFixed(2)}</span>
              </button>
            ))}
          </div>

          <h2 style={{ marginTop: '1.5rem' }}>3. Products</h2>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {products.map(p => (
              <button key={p.id} className="secondary" onClick={() => addToCart(p, 'product')} style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                <span>{p.name} ({p.stock} left)</span>
                <span>${p.price.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Summary</h2>
          <div style={{ minHeight: '150px' }}>
            {cart.map(item => (
              <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                <span>{item.name}</span>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span>${item.price.toFixed(2)}</span>
                  <Trash2 size={16} onClick={() => removeFromCart(item.cartId)} style={{ cursor: 'pointer', color: '#ef4444' }} />
                </div>
              </div>
            ))}
            {cart.length === 0 && <p style={{ color: '#94a3b8' }}>Cart is empty</p>}
          </div>
          
          <div style={{ marginTop: '2rem', borderTop: '2px solid var(--border)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>Discount ($)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={discountAmount || ''}
                  onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>Tip ($)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={tipAmount || ''}
                  onChange={e => setTipAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <h3 style={{ marginBottom: '1rem' }}>Customer Receipt</h3>
            <input 
              type="email" 
              placeholder="Customer Email" 
              value={customerEmail}
              onChange={e => setCustomerEmail(e.target.value)}
            />
            <input 
              type="tel" 
              placeholder="Customer Phone" 
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
            />
            
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', color: '#64748b' }}>
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', color: '#10b981' }}>
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0' }}>
                  <span>Tip</span>
                  <span>${tipAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 'bold', margin: '1rem 0 1.5rem 0', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <button onClick={submitSale} style={{ width: '100%', padding: '1.5rem', fontSize: '1.25rem' }}>
              Complete Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
