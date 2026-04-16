import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { Search, Mail, Phone, Calendar, X, ShoppingBag, Scissors, Tag, Save, History, MessageSquare, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Customers() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [editingNotes, setEditingNotes] = useState('');
  const [editingTags, setEditingTags] = useState('');

  const fetchCustomers = () => {
    apiClient.get('/customers').then(res => setCustomers(res.data));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openProfile = async (customer: any) => {
    try {
      const res = await apiClient.get(`/customers/${customer.id}`);
      setSelectedCustomer(res.data);
      setHistory(res.data.history || []);
      setEditingNotes(res.data.notes || '');
      setEditingTags(res.data.tags || '');
    } catch (err) {
      alert(t('customers.failed_load'));
    }
  };

  const saveProfile = async () => {
    try {
      await apiClient.patch(`/customers/${selectedCustomer.id}`, {
        ...selectedCustomer,
        notes: editingNotes,
        tags: editingTags
      });
      setSelectedCustomer({ ...selectedCustomer, notes: editingNotes, tags: editingTags });
      fetchCustomers();
      alert(t('customers.update_success'));
    } catch (err) {
      alert(t('customers.failed_update'));
    }
  };

  const filtered = customers.filter(c => 
    (c.email?.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone?.includes(search)) ||
    (c.name?.toLowerCase().includes(search.toLowerCase()))
  );

  const formatVisitDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="customers-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>{t('customers.title')}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{t('customers.manage_clients')}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '0.75rem', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder={t('customers.search_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '3rem', marginBottom: 0 }}
          />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {filtered.map(c => (
          <div key={c.id} className="card" style={{ marginBottom: 0, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '48px', height: '48px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: '800' }}>
                {(c.name || 'A').charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>{c.name || t('customers.anonymous_client')}</h3>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {c.tags?.split(',').filter(Boolean).map((t: string) => (
                    <span key={t} style={{ fontSize: '0.65rem', background: '#f3f4f6', color: 'var(--text-muted)', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: '600', border: '1px solid var(--border)' }}>
                      {t.trim()}
                    </span>
                  ))}
                  {!c.tags && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{t('customers.no_tags')}</span>}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {c.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <Phone size={16} color="var(--success)" /> 
                  <a href={`tel:${c.phone}`} style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: '500' }}>{c.phone}</a>
                </div>
              )}
              {c.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <Mail size={16} color="var(--primary)" /> 
                  <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                <Calendar size={16} color="var(--warning)" /> 
                <span style={{ color: 'var(--text-muted)' }}>{t('customers.last_visit', { date: c.last_visit ? formatVisitDate(c.last_visit) : t('customers.first_time') })}</span>
              </div>
            </div>
            
            <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
              <button className="secondary" style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }} onClick={() => openProfile(c)}>
                {t('customers.full_profile')}
              </button>
              {c.phone && (
                <button className="secondary" style={{ padding: '0.6rem', color: 'var(--success)' }} onClick={() => window.location.href=`tel:${c.phone}`}>
                  <Phone size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <Search size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
            <p>{t('customers.no_customers_found')}</p>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px', display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                  {(selectedCustomer.name || 'A').charAt(0)}
                </div>
                <div>
                  <h2 style={{ marginBottom: 0 }}>{selectedCustomer.name || t('customers.profile_title')}</h2>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={14} /> {selectedCustomer.email || t('customers.no_email')}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={14} /> {selectedCustomer.phone || t('customers.no_phone')}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{t('customers.member_since', { date: formatVisitDate(selectedCustomer.created_at) })}</div>
                </div>
              </div>
              <button className="secondary" style={{ padding: '0.5rem' }} onClick={() => setSelectedCustomer(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="pos-grid" style={{ gap: '2rem' }}>
              {/* Info Section */}
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Tag size={18} color="var(--primary)" /> {t('customers.classification_tags')}
                  </h3>
                  <input 
                    type="text" 
                    value={editingTags} 
                    onChange={e => setEditingTags(e.target.value)} 
                    placeholder={t('customers.tags_placeholder')}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-0.5rem' }}>{t('customers.tags_hint')}</p>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare size={18} color="var(--primary)" /> {t('customers.internal_notes')}
                  </h3>
                  <textarea 
                    rows={6} 
                    value={editingNotes} 
                    onChange={e => setEditingNotes(e.target.value)}
                    placeholder={t('customers.notes_placeholder')}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '0.9rem', resize: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{t('customers.total_visits')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{history.length}</div>
                  </div>
                  <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{t('customers.lifetime_spend')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--success)' }}>
                      ${history.reduce((acc, v) => acc + v.total_amount, 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                <button onClick={saveProfile} style={{ width: '100%', padding: '1rem', gap: '0.5rem' }}>
                  <Save size={20} /> {t('customers.save_profile')}
                </button>
              </div>

              {/* History Section */}
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <History size={18} color="var(--primary)" /> {t('customers.recent_activity')}
                </h3>
                
                <div style={{ display: 'grid', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {history.map((visit: any) => (
                    <div key={visit.sale_id} style={{ background: 'white', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', borderLeft: '4px solid var(--primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                        <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>{formatVisitDate(visit.timestamp)}</div>
                        <div style={{ color: 'var(--success)', fontWeight: '800' }}>${visit.total_amount.toFixed(2)}</div>
                      </div>
                      
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.85rem' }}>
                          <Scissors size={14} style={{ marginTop: '0.1rem' }} color="var(--text-muted)" />
                          <span style={{ color: 'var(--text-main)' }}>{visit.services?.split('||').join(', ') || t('customers.no_services')}</span>
                        </div>
                        {visit.products && (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.85rem' }}>
                            <ShoppingBag size={14} style={{ marginTop: '0.1rem' }} color="var(--text-muted)" />
                            <span style={{ color: 'var(--text-main)' }}>{visit.products.split('||').join(', ')}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)' }}>
                          <div style={{ width: '18px', height: '18px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>
                            {visit.barber_name?.charAt(0)}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('customers.served_by', { name: visit.barber_name })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem 0', background: '#f9fafb', borderRadius: '1rem', border: '1px dashed var(--border)' }}>
                      <Clock size={32} style={{ marginBottom: '1rem', opacity: 0.1, margin: '0 auto' }} />
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('customers.no_visit_history')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
