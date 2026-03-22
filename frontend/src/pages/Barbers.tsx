import { useEffect, useState } from 'react';
import axios from 'axios';
import { UserPlus, User } from 'lucide-react';

export default function Barbers() {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [serviceRate, setServiceRate] = useState('0.6');
  const [productRate, setProductRate] = useState('0.1');

  const fetchBarbers = () => {
    axios.get('/api/barbers').then(res => setBarbers(res.data)).catch(() => {});
  };

  useEffect(() => {
    fetchBarbers();
  }, []);

  const addBarber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await axios.post('/api/barbers', { 
        name, 
        service_commission_rate: parseFloat(serviceRate),
        product_commission_rate: parseFloat(productRate)
      });
      setName('');
      setServiceRate('0.6');
      setProductRate('0.1');
      fetchBarbers();
    } catch (err) {
      alert('Failed to add barber');
    }
  };

  return (
    <div>
      <h1>Manage Barbers</h1>
      
      <div className="grid">
        <div className="card">
          <h2>Add New Barber</h2>
          <form onSubmit={addBarber}>
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ marginBottom: '0.5rem', color: '#94a3b8' }}>Barber Name</p>
              <input 
                type="text" 
                placeholder="Full Name" 
                value={name} 
                onChange={e => setName(e.target.value)} 
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <p style={{ marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>Service Rate (0 to 1)</p>
                <input 
                  type="number" 
                  step="0.05" 
                  min="0" 
                  max="1" 
                  value={serviceRate} 
                  onChange={e => setServiceRate(e.target.value)} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>Product Rate (0 to 1)</p>
                <input 
                  type="number" 
                  step="0.05" 
                  min="0" 
                  max="1" 
                  value={productRate} 
                  onChange={e => setProductRate(e.target.value)} 
                />
              </div>
            </div>
            <button type="submit" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <UserPlus size={20} /> Add Barber
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Current Team</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {barbers.map(b => (
              <div key={b.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: '50%' }}>
                  <User size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{b.name}</div>
                  <div style={{ display: 'flex', gap: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                    <span>Services: {(b.service_commission_rate * 100).toFixed(0)}%</span>
                    <span>Products: {(b.product_commission_rate * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
            {barbers.length === 0 && <p style={{ color: '#94a3b8' }}>No barbers added yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
