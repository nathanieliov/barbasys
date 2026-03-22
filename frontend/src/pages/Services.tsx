import { useEffect, useState } from 'react';
import axios from 'axios';
import { PlusCircle, Edit2, Trash2, Clock, DollarSign, X, Save } from 'lucide-react';

export default function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchServices = () => {
    axios.get('/api/services').then(res => setServices(res.data)).catch(() => {});
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const resetForm = () => {
    setName('');
    setPrice('');
    setDuration('30');
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    try {
      if (editingId) {
        await axios.put(`/api/services/${editingId}`, {
          name,
          price: parseFloat(price),
          duration_minutes: parseInt(duration)
        });
      } else {
        await axios.post('/api/services', {
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
  };

  const deleteService = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await axios.delete(`/api/services/${id}`);
      fetchServices();
    } catch (err) {
      alert('Failed to delete service');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Service Catalog</h1>
      </div>

      <div className="grid">
        <div className="card">
          <h2>{editingId ? 'Edit Service' : 'Add New Service'}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ marginBottom: '0.5rem', color: '#94a3b8' }}>Service Name</p>
              <input 
                type="text" 
                placeholder="e.g., Haircut, Beard Trim" 
                value={name} 
                onChange={e => setName(e.target.value)} 
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <p style={{ marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>Price ($)</p>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    placeholder="0.00"
                    value={price} 
                    onChange={e => setPrice(e.target.value)} 
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>Duration (min)</p>
                <div style={{ position: 'relative' }}>
                  <Clock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    type="number" 
                    min="1" 
                    value={duration} 
                    onChange={e => setDuration(e.target.value)} 
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {editingId ? <Save size={20} /> : <PlusCircle size={20} />} 
                {editingId ? 'Update Service' : 'Add Service'}
              </button>
              {editingId && (
                <button type="button" className="secondary" onClick={resetForm} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <X size={20} /> Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <h2>Available Services</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {services.map(s => (
              <div key={s.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{s.name}</div>
                  <div style={{ display: 'flex', gap: '1.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><DollarSign size={14} /> {s.price.toFixed(2)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {s.duration_minutes} min</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="secondary" style={{ padding: '0.5rem' }} onClick={() => startEdit(s)}>
                    <Edit2 size={18} />
                  </button>
                  <button className="secondary" style={{ padding: '0.5rem', color: '#ef4444' }} onClick={() => deleteService(s.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {services.length === 0 && <p style={{ color: '#94a3b8' }}>No services in catalog.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
