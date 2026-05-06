import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../hooks/useAuth';
import { Loader2, User, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PasswordInput } from '../components/index';

export default function Signup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [shopName, setShopName] = useState('');
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(t('resetPassword.tooShort', 'Password must be at least 8 characters.'));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/auth/signup', { shop_name: shopName, owner_fullname: fullname, owner_email: email, owner_password: password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || t('signup.error', 'Could not create account. Try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-two-col">
      {/* Hero */}
      <div className="login-hero">
        <div className="brand" style={{ marginBottom: '3rem', color: 'white' }}>
          <div className="brand-mark" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }} aria-hidden="true" />
          <span>BarbaSys</span>
        </div>
        <p className="login-hero-tagline">{t('login.hero_tagline')}</p>
        <p className="login-hero-sub">{t('login.hero_sub')}</p>
      </div>

      {/* Form */}
      <div className="login-form-col">
        <div className="login-card">
          <div className="login-header">
            <div className="brand-mark" style={{ width: 48, height: 48, borderRadius: 14, fontSize: 22, margin: '0 auto 0.75rem' }} aria-hidden="true" />
            <h1>{t('signup.title', 'Create your barbershop')}</h1>
            <p>{t('signup.subtitle', 'Up and running in 2 minutes.')}</p>
          </div>

          {error && <div className="login-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="shop-name">{t('signup.shopName', 'Barbershop name')}</label>
              <div className="input-with-icon">
                <Building2 size={18} className="input-icon" />
                <input
                  id="shop-name"
                  type="text"
                  placeholder={t('signup.shopNamePlaceholder', 'e.g. Barber King')}
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  required
                  autoFocus
                  style={{ paddingLeft: '2.75rem' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="fullname">{t('signup.yourName', 'Your name')}</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  id="fullname"
                  type="text"
                  placeholder={t('signup.yourNamePlaceholder', 'e.g. Juan Pérez')}
                  value={fullname}
                  onChange={e => setFullname(e.target.value)}
                  required
                  style={{ paddingLeft: '2.75rem' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">{t('common.email')}</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">{t('login.password')}</label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="login-button" disabled={isSubmitting}>
              {isSubmitting
                ? <><Loader2 size={18} className="spinner" style={{ marginRight: '0.5rem' }} />{t('common.loading')}</>
                : t('signup.submit', 'Create my barbershop')
              }
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {t('signup.alreadyHaveAccount', 'Already have an account?')}{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>
              {t('login.sign_in')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
