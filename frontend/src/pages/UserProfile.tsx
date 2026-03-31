import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/apiClient';
import { User, Mail, Lock, Shield, CheckCircle, AlertCircle, Save } from 'lucide-react';

export default function UserProfile() {
  const { user, updateUser } = useAuth();
  
  // Profile Info State
  const [username, setUsername] = useState(user?.username || '');
  const [fullname, setFullname] = useState(user?.fullname || '');
  const [email, setEmail] = useState(user?.email || '');
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      const res = await apiClient.patch('/auth/profile', { username, fullname, email });
      updateUser(res.data.user);
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setMessage({ text: 'New passwords do not match', type: 'error' });
    }

    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      await apiClient.patch('/auth/profile', { 
        current_password: currentPassword, 
        new_password: newPassword 
      });
      setMessage({ text: 'Password changed successfully!', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Failed to change password', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Account Settings</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage your personal information and security preferences.</p>
      </div>

      {message.text && (
        <div style={{ 
          padding: '1rem', 
          borderRadius: '0.75rem', 
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
          fontWeight: '600'
        }}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        {/* Profile Information */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <User size={20} color="var(--primary)" />
            <h2 style={{ margin: 0 }}>Personal Information</h2>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Full Legal Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  value={fullname}
                  onChange={e => setFullname(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: '#94a3b8' }} />
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Shield size={14} color="var(--primary)" />
                <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Role & Access</span>
              </div>
              <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{user?.role} Account</div>
            </div>

            <button type="submit" disabled={saving} style={{ width: '100%', gap: '0.5rem' }}>
              <Save size={18} /> Update Profile
            </button>
          </form>
        </div>

        {/* Security / Password */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Lock size={20} color="var(--primary)" />
            <h2 style={{ margin: 0 }}>Security</h2>
          </div>

          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Current Password</label>
              <input 
                type="password" 
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div style={{ height: '1px', background: 'var(--border)', margin: '1.5rem 0' }}></div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>New Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Confirm New Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>

            <button type="submit" className="secondary" disabled={saving} style={{ width: '100%' }}>
              Change Password
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
