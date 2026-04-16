import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/apiClient';
import { Scissors, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Login: React.FC = () => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user && user.role !== 'CUSTOMER') {
      navigate('/');
    }
  }, [user, navigate]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/auth/login', { username, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || t('login.invalid_credentials'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '1.25rem', marginBottom: '1rem' }}>
            <Scissors size={40} color="var(--primary)" />
          </div>
          <h1>{t('login.title')}</h1>
          <p>{t('login.professional_management')}</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleAdminLogin}>
          <div className="form-group">
            <label htmlFor="username">{t('login.username')}</label>
            <div className="input-with-icon">
              <UserIcon size={18} className="input-icon" />
              <input
                id="username"
                type="text"
                placeholder={t('login.username_placeholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('login.password')}</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={18} className="spinner" /> : t('login.sign_in')}
          </button>
        </form>
        
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem' }}>
          <button 
            onClick={() => navigate('/discovery')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer' }}
          >
            {t('login.i_am_a_customer')}
          </button>
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          &copy; 2026 BarbaSys v2.0 • {t('login.secure_access')}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
};

export default Login;
