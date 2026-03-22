import { useEffect, useState } from 'react';
import axios from 'axios';
import { Truck, User, Mail, Phone, Clock, Plus, Trash2 } from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [leadTime, setLeadTime] = useState('7');

  const fetchSuppliers = () => {
    axios.get('/api/suppliers').then(res => setSuppliers(res.data));
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const addSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/suppliers', {
        name,
        contact_name: contact,
        email,
        phone,
        lead_time_days: parseInt(leadTime)
      });
      setName('');
      setContact('');
      setEmail('');
      setPhone('');
      setLeadTime('7');
      fetchSuppliers();
    } catch (err) {
      alert('Failed to add supplier');
    }
  };

  const deleteSupplier = async (id: number) => {
    if (!window.confirm('Delete this supplier?')) return;
    try {
      await axios.delete(`/api/suppliers/${id}`);
      fetchSuppliers();
    } catch (err) {
      alert('Failed to delete supplier');
    }
  };

  return (
    <div>
      <h1>Supplier Management</h1>
      
      <div className="grid">
        <div className="card">
          <h2>Add New Partner</h2>
          <form onSubmit={addSupplier}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Company Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Contact Person</label>
              <input type="text" value={contact} onChange={e => setContact(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Phone</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Est. Lead Time (Days)</label>
              <input type="number" value={leadTime} onChange={e => setLeadTime(e.target.value)} min="1" />
            </div>
            <button type="submit" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Plus size={20} /> Add Supplier
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Current Partners</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {suppliers.map(s => (
              <div key={s.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '0.75rem', position: 'relative' }}>
                <Trash2 
                  size={18} 
                  style={{ position: 'absolute', top: '1rem', right: '1rem', cursor: 'pointer', color: '#ef4444' }} 
                  onClick={() => deleteSupplier(s.id)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <Truck size={24} color="var(--primary)" />
                  <h3 style={{ margin: 0 }}>{s.name}</h3>
                </div>
                <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={14} /> {s.contact_name || 'N/A'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={14} /> {s.email || 'N/A'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone size={14} /> {s.phone || 'N/A'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                    <Clock size={14} /> Lead time: {s.lead_time_days} days
                  </div>
                </div>
              </div>
            ))}
            {suppliers.length === 0 && <p style={{ color: '#94a3b8' }}>No suppliers added yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
