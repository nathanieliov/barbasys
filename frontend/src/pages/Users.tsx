import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { Trash2, PlusCircle, X, CheckCircle, AlertCircle, Key } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'BARBER',
    barber_id: ''
  });

  const fetchData = async () => {
    try {
      const [uRes, bRes] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/barbers')
      ]);
      setUsers(uRes.data);
      setBarbers(bRes.data);
    } catch (err) {
      console.error('Failed to fetch user management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    
    try {
      await apiClient.post('/auth/register', {
        ...formData,
        barber_id: formData.barber_id ? parseInt(formData.barber_id) : null
      });
      setMessage({ text: 'User created successfully!', type: 'success' });
      setShowAddModal(false);
      setFormData({ username: '', email: '', password: '', role: 'BARBER', barber_id: '' });
      fetchData();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Failed to create user', type: 'error' });
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to remove this user? They will lose all access.')) return;
    
    try {
      await apiClient.delete(`/users/${id}`);
      fetchData();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  if (loading) return <div className="loading">Loading team...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Team Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage system access and roles for your shop personnel.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} style={{ gap: '0.5rem' }}>
          <PlusCircle size={20} /> Create New User
        </button>
      </div>

      {message.text && (
        <div style={{ padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: message.type === 'success' ? 'var(--success)' : 'var(--danger)', fontWeight: '600', border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}` }}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '1.25rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '800' }}>User</th>
              <th style={{ padding: '1.25rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '800' }}>Role</th>
              <th style={{ padding: '1.25rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '800' }}>Linked Professional</th>
              <th style={{ padding: '1.25rem', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '800' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700' }}>{u.username}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1.25rem' }}>
                  <span className={`status-badge ${u.role === 'OWNER' ? 'status-scheduled' : 'status-completed'}`} style={{ fontSize: '0.7rem' }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {u.barber_id ? barbers.find(b => b.id === u.barber_id)?.name || 'Linked' : 'No link'}
                </td>
                <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                  <button 
                    onClick={() => handleDeleteUser(u.id)}
                    className="btn btn-ghost"
                    style={{ color: 'var(--danger)', border: 'none', background: 'transparent' }}
                    title="Remove Access"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Create System User</h2>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Username</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    placeholder="jdoe"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Email</label>
                  <input 
                    type="email" 
                    required 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Initial Password</label>
                  <div style={{ position: 'relative' }}>
                    <Key size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: '#94a3b8' }} />
                    <input 
                      type="password" 
                      required 
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>System Role</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="BARBER">Barber (Restricted to own data)</option>
                    <option value="MANAGER">Manager (Full shop access)</option>
                    <option value="OWNER">Owner (Full access + User management)</option>
                  </select>
                </div>
                {formData.role === 'BARBER' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Link to Professional Profile</label>
                    <select 
                      value={formData.barber_id}
                      onChange={e => setFormData({...formData, barber_id: e.target.value})}
                      required
                    >
                      <option value="">Select identity...</option>
                      {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Required for BARBER role to filter data correctly.</p>
                  </div>
                )}
                
                <button type="submit" style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}>
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
