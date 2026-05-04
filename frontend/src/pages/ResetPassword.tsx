import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { Scissors, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PasswordInput } from '../components/index';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirm) {
      setError(t('resetPassword.mismatch', 'Passwords do not match.'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('resetPassword.tooShort', 'Password must be at least 8 characters.'));
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/reset-password', { email, code, new_password: newPassword });
      navigate('/login', { state: { message: t('resetPassword.success', 'Password updated. Please sign in.') } });
    } catch (err: any) {
      setError(err.response?.data?.error || t('resetPassword.error', 'Invalid code or expired link.'));
    } finally {
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

        <h2 style={{ marginBottom: '0.5rem' }}>{t('resetPassword.title', 'Reset your password')}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          {t('resetPassword.description', 'Enter the code we sent to your email and choose a new password.')}
        </p>

        {error && <div className="login-error" role="alert">{error}</div>}

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
          <div className="form-group">
            <label htmlFor="code">{t('resetPassword.codeLabel', 'Reset code')}</label>
            <input
              id="code"
              type="text"
              placeholder="123456"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              style={{ letterSpacing: '0.25em', fontSize: '1.2rem' }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="new-password">{t('resetPassword.newPassword', 'New password')}</label>
            <PasswordInput
              id="new-password"
              placeholder="••••••••"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password">{t('resetPassword.confirmPassword', 'Confirm password')}</label>
            <PasswordInput
              id="confirm-password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting
              ? <><Loader2 size={18} className="spinner" style={{ marginRight: '0.5rem' }} />{t('common.loading')}</>
              : t('resetPassword.submit', 'Set new password')
            }
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>
            {t('forgotPassword.backToLogin', 'Back to login')}
          </Link>
        </div>
      </div>
    </div>
  );
}
