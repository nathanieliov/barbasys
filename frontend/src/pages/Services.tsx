import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { PlusCircle, Edit2, Trash2, Clock, DollarSign, X, Scissors } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/format';

export default function Services() {
  const { settings } = useSettings();
  const [services, setServices] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchServices = () => {
    apiClient.get('/services').then(res => setServices(res.data)).catch(() => {});
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const resetForm = () => {
    setName('');
    setPrice('');
    setDuration('30');
    setEditingId(null);
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    try {
      if (editingId) {
        await apiClient.put(`/services/${editingId}`, {
          name,
          price: parseFloat(price),
          duration_minutes: parseInt(duration)
        });
      } else {
        await apiClient.post('/services', {
          name,
          price: parseFloat(price),
          duration_minutes: parseInt(duration)
        });
      }
      resetForm();
      fetchServices();
    } catch (err) {
      alert('Failed to save service');
    }
  };

  const startEdit = (service: any) => {
    setEditingId(service.id);
    setName(service.name);
    setPrice(service.price.toString());
    setDuration(service.duration_minutes.toString());
    setShowModal(true);
  };

  const deleteService = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await apiClient.delete(`/services/${id}`);
      fetchServices();
    } catch (err) {
      alert('Failed to delete service');
    }
  };

  return (
    <div className="services-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Service Catalog</h1>
          <p style={{ color: 'var(--text-muted)' }}>Configure your available shop services.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ gap: '0.5rem' }}>
          <PlusCircle size={20} /> <span className="hide-mobile">Add New Service</span>
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {services.map(s => (
          <div key={s.id} className="card" style={{ marginBottom: 0, padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ width: '44px', height: '44px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Scissors size={20} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="secondary" style={{ padding: '0.4rem', border: 'none' }} onClick={() => startEdit(s)}>
                  <Edit2 size={16} />
                </button>
                <button className="secondary" style={{ padding: '0.4rem', color: 'var(--danger)', border: 'none' }} onClick={() => deleteService(s.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{s.name}</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Standard professional service</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: 'auto' }}>
              <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--success)' }}>{formatCurrency(s.price, settings.currency_symbol)}</span>
              </div>
              <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} color="var(--primary)" />
                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{s.duration_minutes}m</span>
              </div>
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <Scissors size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
            <p>No services in your catalog yet.</p>
            <button className="secondary" style={{ marginTop: '1rem' }} onClick={() => setShowModal(true)}>Create your first service</button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Scissors size={20} color="var(--primary)" />
                <h2 style={{ marginBottom: 0 }}>{editingId ? 'Edit Service' : 'Add New Service'}</h2>
              </div>
              <button className="secondary" style={{ padding: '0.5rem' }} onClick={resetForm}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Service Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Executive Haircut, Beard Trim" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Price ($)</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={18} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--text-muted)' }} />
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      placeholder="0.00"
                      value={price} 
                      onChange={e => setPrice(e.target.value)} 
                      style={{ paddingLeft: '2.25rem', fontWeight: '700', marginBottom: 0 }}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Duration (min)</label>
                  <div style={{ position: 'relative' }}>
                    <Clock size={18} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--text-muted)' }} />
                    <input 
                      type="number" 
                      min="1" 
                      value={duration} 
                      onChange={e => setDuration(e.target.value)} 
                      style={{ paddingLeft: '2.25rem', fontWeight: '700', marginBottom: 0 }}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" style={{ flex: 1, padding: '1rem', fontSize: '1.1rem' }}>
                  {editingId ? 'Update Service' : 'Confirm Service'}
                </button>
              </div>
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
