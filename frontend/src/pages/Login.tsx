import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/apiClient';
import { User as UserIcon, Loader2, Scissors } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PasswordInput } from '../components/index';

const Login: React.FC = () => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<'staff' | 'customer'>('staff');
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  React.useEffect(() => {
    if (user && user.role !== 'CUSTOMER') {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/auth/login', { username, password });
      login(res.data.token, res.data.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      const code = err.response?.data?.error;
      const localizedKey = `auth.errors.${code}`;
      const translated = t(localizedKey, { defaultValue: '' });
      setError(translated || t('auth.errors.invalid_credentials'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-two-col">
      {/* Hero column — visible on desktop */}
      <div className="login-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
          <Scissors size={32} color="white" />
          <span style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.025em' }}>BarbaSys</span>
        </div>
        <p className="login-hero-tagline">{t('login.hero_tagline', 'Gestiona tu barbería desde un solo lugar')}</p>
        <p className="login-hero-sub">{t('login.hero_sub', 'Agenda, pagos, inventario y más — todo integrado.')}</p>
      </div>

      {/* Form column */}
      <div className="login-form-col">
        <div className="login-card">
          <div className="login-header">
            <div style={{ display: 'inline-flex', padding: '0.875rem', background: 'rgba(79, 70, 229, 0.07)', borderRadius: '1.25rem', marginBottom: '0.75rem' }}>
              <Scissors size={36} color="var(--primary)" />
            </div>
            <h1>{t('login.title')}</h1>
            <p>{t('login.professional_management')}</p>
          </div>

          {/* Staff / Customer toggle */}
          <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: '0.75rem', padding: '4px', marginBottom: '1.5rem', gap: '4px' }}>
            {(['staff', 'customer'] as const).map(t2 => (
              <button
                key={t2}
                type="button"
                onClick={() => { setTab(t2); setError(''); if (t2 === 'customer') navigate('/discovery'); }}
                className={tab === t2 ? '' : 'secondary'}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  fontSize: '0.85rem',
                  ...(tab !== t2 ? { borderColor: 'transparent', background: 'transparent' } : {})
                }}
              >
                {t2 === 'staff' ? t('login.staff', 'Staff') : t('login.customer', 'Customer')}
              </button>
            ))}
          </div>

          {error && (
            <div className="login-error" role="alert" id="login-error">{error}</div>
          )}

          <form onSubmit={handleAdminLogin} aria-describedby={error ? 'login-error' : undefined}>
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
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                <label htmlFor="password" style={{ marginBottom: 0 }}>{t('login.password')}</label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ background: '#f9fafb' }}
              />
            </div>

            <button type="submit" className="login-button" disabled={isSubmitting}>
              {isSubmitting
                ? <><Loader2 size={18} className="spinner" style={{ marginRight: '0.5rem' }} />{t('auth.signingIn')}</>
                : t('login.sign_in')
              }
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {t('login.no_account', "Don't have a barbershop yet?")}{' '}
            <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>
              {t('auth.createShop')}
            </Link>
          </div>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            &copy; 2026 BarbaSys Pro • {t('login.secure_access')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
