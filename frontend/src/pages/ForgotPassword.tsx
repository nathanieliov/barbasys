import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { Scissors, ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch {
      // Always show the success message — don't enumerate whether email exists
    } finally {
      setSent(true);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', color: 'var(--primary)' }}>
          <Scissors size={28} />
          <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>BarbaSys</span>
        </div>

        <h2 style={{ marginBottom: '0.5rem' }}>{t('forgotPassword.title', 'Forgot password?')}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          {t('forgotPassword.description', 'Enter your email and we will send you a code to reset your password.')}
        </p>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: 'var(--success-light, #dcfce7)', color: 'var(--success)', padding: '1.25rem', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: '600' }}>
              {t('forgotPassword.sent', 'If an account exists for that email, a reset code has been sent.')}
            </div>
            <Link to="/reset-password" className="login-button" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '0.875rem', marginBottom: '1rem' }}>
              {t('forgotPassword.enterCode', 'Enter reset code')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">{t('common.email')}</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>
            <button type="submit" className="login-button" disabled={isSubmitting}>
              {isSubmitting
                ? <><Loader2 size={18} className="spinner" style={{ marginRight: '0.5rem' }} />{t('common.loading')}</>
                : t('forgotPassword.sendCode', 'Send reset code')
              }
            </button>
          </form>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>
            <ArrowLeft size={16} /> {t('forgotPassword.backToLogin', 'Back to login')}
          </Link>
        </div>
      </div>
    </div>
  );
}
