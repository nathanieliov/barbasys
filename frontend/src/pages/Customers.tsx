import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, User, Mail, Phone, Calendar, X, ShoppingBag, Scissors, Tag, Save, History } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [editingNotes, setEditingNotes] = useState('');
  const [editingTags, setEditingTags] = useState('');

  const fetchCustomers = () => {
    axios.get('/api/customers').then(res => setCustomers(res.data));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openProfile = async (customer: any) => {
    try {
      const res = await axios.get(`/api/customers/${customer.id}`);
      setSelectedCustomer(res.data);
      setHistory(res.data.history || []);
      setEditingNotes(res.data.notes || '');
      setEditingTags(res.data.tags || '');
    } catch (err) {
      alert('Failed to load profile');
    }
  };

  const saveProfile = async () => {
    try {
      await axios.patch(`/api/customers/${selectedCustomer.id}`, {
        ...selectedCustomer,
        notes: editingNotes,
        tags: editingTags
      });
      setSelectedCustomer({ ...selectedCustomer, notes: editingNotes, tags: editingTags });
      fetchCustomers();
      alert('Profile updated');
    } catch (err) {
      alert('Failed to update profile');
    }
  };

  const filtered = customers.filter(c => 
    (c.email?.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone?.includes(search)) ||
    (c.name?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Customer Directory</h1>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input 
            type="text" 
            placeholder="Search customers..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '3rem', marginBottom: 0 }}
          />
        </div>
      </div>

      <div className="grid">
        {filtered.map(c => (
          <div key={c.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--primary)', padding: '0.75rem', borderRadius: '50%' }}>
                <User size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{c.name || 'Anonymous Client'}</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>Member since {new Date(c.created_at).toLocaleDateString()}</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {c.tags?.split(',').filter(Boolean).map((t: string) => (
                      <span key={t} style={{ fontSize: '0.7rem', background: 'rgba(99, 102, 241, 0.2)', color: '#6366f1', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>{t.trim()}</span>
                    ))}
                  </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem', color: '#cbd5e1', fontSize: '0.9rem' }}>
              {c.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Mail size={16} color="#6366f1" /> {c.email}
                </div>
              )}
              {c.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Phone size={16} color="#10b981" /> {c.phone}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Calendar size={16} color="#f59e0b" /> Last Visit: {c.last_visit ? new Date(c.last_visit).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            
            <button className="secondary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => openProfile(c)}>
              View Profile
            </button>
          </div>
        ))}
      </div>

      {selectedCustomer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
            <X size={24} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', cursor: 'pointer', zIndex: 10 }} onClick={() => setSelectedCustomer(null)} />
            
            {/* Left Column: Info & Notes */}
            <div style={{ borderRight: '1px solid var(--border)', paddingRight: '1.5rem' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Customer Profile</h2>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <Tag size={16} /> <span>Tags (comma-separated)</span>
                </div>
                <input 
                  type="text" 
                  value={editingTags} 
                  onChange={e => setEditingTags(e.target.value)} 
                  placeholder="VIP, Regular, etc"
                />
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <Mail size={16} /> <span>Internal Notes</span>
                </div>
                <textarea 
                  rows={8} 
                  value={editingNotes} 
                  onChange={e => setEditingNotes(e.target.value)}
                  placeholder="Preferences, styles, allergies..."
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <button onClick={saveProfile} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Save size={20} /> Save Profile
              </button>
            </div>

            {/* Right Column: History */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <History size={24} color="#10b981" />
                <h2 style={{ margin: 0 }}>Visit History</h2>
              </div>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                {history.map((visit: any) => (
                  <div key={visit.sale_id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '0.75rem', borderLeft: '4px solid #6366f1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div style={{ fontWeight: 'bold' }}>{new Date(visit.timestamp).toLocaleDateString()}</div>
                      <div style={{ color: '#10b981', fontWeight: 'bold' }}>${visit.total_amount.toFixed(2)}</div>
                    </div>
                    
                    <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <Scissors size={14} style={{ marginTop: '0.2rem' }} color="#94a3b8" />
                        <div>
                          <span style={{ color: '#94a3b8' }}>Services: </span>
                          <span>{visit.services?.split('||').join(', ') || 'None'}</span>
                        </div>
                      </div>
                      {visit.products && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                          <ShoppingBag size={14} style={{ marginTop: '0.2rem' }} color="#94a3b8" />
                          <div>
                            <span style={{ color: '#94a3b8' }}>Products: </span>
                            <span>{visit.products.split('||').join(', ')}</span>
                          </div>
                        </div>
                      )}
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                        Barber: {visit.barber_name}
                      </div>
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
                    <History size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                    <p>No past visits recorded.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
