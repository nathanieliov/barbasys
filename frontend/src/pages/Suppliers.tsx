import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { PlusCircle, X, Truck, Mail, Phone, User, Edit2, Trash2, Clock } from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [leadTime, setLeadTime] = useState('7');

  const fetchSuppliers = () => {
    apiClient.get('/suppliers').then(res => setSuppliers(res.data)).catch(() => {});
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const resetForm = () => {
    setName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setLeadTime('7');
    setEditingSupplier(null);
    setShowModal(false);
  };

  const startEdit = (s: any) => {
    setEditingSupplier(s);
    setName(s.name);
    setContactName(s.contact_name || '');
    setEmail(s.email || '');
    setPhone(s.phone || '');
    setLeadTime(s.lead_time_days.toString());
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name,
      contact_name: contactName,
      email,
      phone,
      lead_time_days: parseInt(leadTime)
    };

    try {
      if (editingSupplier) {
        await apiClient.put(`/suppliers/${editingSupplier.id}`, data);
      } else {
        await apiClient.post('/suppliers', data);
      }
      resetForm();
      fetchSuppliers();
    } catch (err) {
      alert('Failed to save supplier');
    }
  };

  const deleteSupplier = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this supplier?')) return;
    try {
      await apiClient.delete(`/suppliers/${id}`);
      fetchSuppliers();
    } catch (err) {
      alert('Failed to delete supplier');
    }
  };

  return (
    <div className="suppliers-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Supplier Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your product vendors and procurement contacts.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ gap: '0.5rem' }}>
          <PlusCircle size={20} /> <span className="hide-mobile">Add Supplier</span>
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {suppliers.map(s => (
          <div key={s.id} className="card" style={{ marginBottom: 0, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{s.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <User size={12} /> {s.contact_name || 'No primary contact'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button className="secondary" style={{ padding: '0.4rem', border: 'none' }} onClick={() => startEdit(s)}>
                  <Edit2 size={16} />
                </button>
                <button className="secondary" style={{ padding: '0.4rem', color: 'var(--danger)', border: 'none' }} onClick={() => deleteSupplier(s.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {s.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <Mail size={16} color="var(--primary)" />
                  <span style={{ color: 'var(--text-muted)' }}>{s.email}</span>
                </div>
              )}
              {s.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <Phone size={16} color="var(--success)" />
                  <span style={{ color: 'var(--text-muted)' }}>{s.phone}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                <Clock size={16} color="var(--warning)" />
                <span style={{ color: 'var(--text-muted)' }}>Avg. Lead Time: <strong>{s.lead_time_days} days</strong></span>
              </div>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <button className="secondary" style={{ width: '100%', fontSize: '0.85rem' }}>
                View Catalog
              </button>
            </div>
          </div>
        ))}
        {suppliers.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <Truck size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
            <p>No suppliers registered yet.</p>
            <button className="secondary" style={{ marginTop: '1rem' }} onClick={() => setShowModal(true)}>Add your first supplier</button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={20} color="var(--primary)" />
                <h2 style={{ marginBottom: 0 }}>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
              </div>
              <button className="secondary" style={{ padding: '0.5rem' }} onClick={resetForm}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Company Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Grooming Essentials Co." 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Contact Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Jane Smith" 
                  value={contactName} 
                  onChange={e => setContactName(e.target.value)} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Email</label>
                  <input 
                    type="email" 
                    placeholder="orders@supplier.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    style={{ marginBottom: 0 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Phone</label>
                  <input 
                    type="tel" 
                    placeholder="+1 (555) 000-0000" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    style={{ marginBottom: 0 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Lead Time (Days)</label>
                <input 
                  type="number" 
                  min="1"
                  value={leadTime} 
                  onChange={e => setLeadTime(e.target.value)} 
                />
              </div>

              <button type="submit" style={{ width: '100%', padding: '1.1rem', fontSize: '1.1rem' }}>
                {editingSupplier ? 'Update Supplier' : 'Confirm Registration'}
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
