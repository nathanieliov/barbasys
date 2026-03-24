import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { UserPlus, User, X, Percent, BadgeCheck, Phone, Mail, Trash2, Edit2 } from 'lucide-react';

export default function Barbers() {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBarber, setEditingBarber] = useState<any>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [serviceRate, setServiceRate] = useState('0.6');
  const [productRate, setProductRate] = useState('0.1');

  const fetchBarbers = () => {
    apiClient.get('/barbers').then(res => setBarbers(res.data)).catch(() => {});
  };

  useEffect(() => {
    fetchBarbers();
  }, []);

  const resetForm = () => {
    setName('');
    setServiceRate('0.6');
    productRate === '0.1' ? setProductRate('0.1') : setProductRate('0.1'); // Keep consistent default
    setEditingBarber(null);
    setShowModal(false);
  };

  const startEdit = (barber: any) => {
    setEditingBarber(barber);
    setName(barber.name);
    setServiceRate(barber.service_commission_rate.toString());
    setProductRate(barber.product_commission_rate.toString());
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const data = { 
      name, 
      service_commission_rate: parseFloat(serviceRate),
      product_commission_rate: parseFloat(productRate)
    };

    try {
      if (editingBarber) {
        await apiClient.put(`/barbers/${editingBarber.id}`, data);
      } else {
        await apiClient.post('/barbers', data);
      }
      resetForm();
      fetchBarbers();
    } catch (err) {
      alert('Failed to save barber');
    }
  };

  const deleteBarber = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this barber from the team?')) return;
    try {
      await apiClient.delete(`/barbers/${id}`);
      fetchBarbers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete barber');
    }
  };

  return (
    <div className="barbers-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Team Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your professional barbers and their commission rates.</p>
        </div>
        <button onClick={() => { setEditingBarber(null); setShowModal(true); }} style={{ gap: '0.5rem' }}>
          <UserPlus size={20} /> <span className="hide-mobile">Add Professional</span>
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {barbers.map(b => (
          <div key={b.id} className="card" style={{ marginBottom: 0, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '56px', height: '56px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: '800', border: '2px solid white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  {b.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--text-main)' }}>{b.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)', fontSize: '0.75rem', fontWeight: '700' }}>
                    <BadgeCheck size={14} /> Active Professional
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button className="secondary" style={{ padding: '0.4rem', border: 'none' }} onClick={() => startEdit(b)}>
                  <Edit2 size={16} />
                </button>
                <button className="secondary" style={{ padding: '0.4rem', color: 'var(--danger)', border: 'none' }} onClick={() => deleteBarber(b.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Percent size={12} /> Service Rate
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--primary)' }}>{(b.service_commission_rate * 100).toFixed(0)}%</div>
              </div>
              <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Percent size={12} /> Product Rate
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--success)' }}>{(b.product_commission_rate * 100).toFixed(0)}%</div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
              <button className="secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', gap: '0.4rem' }}>
                <Phone size={14} /> Contact
              </button>
              <button className="secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', gap: '0.4rem' }}>
                <Mail size={14} /> Performance
              </button>
            </div>
          </div>
        ))}
        {barbers.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <User size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
            <p>No professionals in your team yet.</p>
            <button className="secondary" style={{ marginTop: '1rem' }} onClick={() => setShowModal(true)}>Register your first barber</button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} color="var(--primary)" />
                <h2 style={{ marginBottom: 0 }}>{editingBarber ? 'Edit Professional' : 'Register Professional'}</h2>
              </div>
              <button className="secondary" style={{ padding: '0.5rem' }} onClick={resetForm}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '0.85rem', top: '0.75rem', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="e.g. John Doe" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Service Rate (0–1)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    max="1" 
                    value={serviceRate} 
                    onChange={e => setServiceRate(e.target.value)} 
                    style={{ fontWeight: '700', marginBottom: '0.25rem' }}
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Typical: 0.5 to 0.7</div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Product Rate (0–1)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    max="1" 
                    value={productRate} 
                    onChange={e => setProductRate(e.target.value)} 
                    style={{ fontWeight: '700', marginBottom: '0.25rem' }}
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Typical: 0.1 to 0.2</div>
                </div>
              </div>

              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Service Commission</span>
                  <span style={{ fontWeight: '800', color: 'var(--primary)' }}>{(parseFloat(serviceRate) * 100 || 0).toFixed(0)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Product Commission</span>
                  <span style={{ fontWeight: '800', color: 'var(--success)' }}>{(parseFloat(productRate) * 100 || 0).toFixed(0)}%</span>
                </div>
              </div>

              <button type="submit" style={{ width: '100%', padding: '1.1rem', fontSize: '1.1rem' }}>
                {editingBarber ? 'Update Professional' : 'Confirm Registration'}
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
