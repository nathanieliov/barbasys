import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/apiClient';
import { Scissors, Lock, User as UserIcon, Loader2, Mail, Key } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setOtpStep] = useState<'ID' | 'OTP'>('ID');
  const [loginType, setLoginType] = useState<'ADMIN' | 'CUSTOMER'>('CUSTOMER');
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
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
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/otp/send', { email });
      setOtpStep('OTP');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/auth/otp/verify', { email, code: otp });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid OTP.');
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
          <h1>BarbaSys</h1>
          <p>{loginType === 'CUSTOMER' ? 'Customer Portal' : 'Professional Management'}</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', padding: '0.25rem', background: '#f3f4f6', borderRadius: '0.75rem' }}>
          <button 
            onClick={() => { setLoginType('CUSTOMER'); setError(''); }}
            className={loginType === 'CUSTOMER' ? 'primary' : 'secondary'}
            style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }}
          >
            Customer
          </button>
          <button 
            onClick={() => { setLoginType('ADMIN'); setError(''); }}
            className={loginType === 'ADMIN' ? 'primary' : 'secondary'}
            style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }}
          >
            Team
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        {loginType === 'ADMIN' ? (
          <form onSubmit={handleAdminLogin}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <div className="input-with-icon">
                <UserIcon size={18} className="input-icon" />
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
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
              {isSubmitting ? <Loader2 size={18} className="spinner" /> : 'Sign In'}
            </button>
          </form>
        ) : (
          step === 'ID' ? (
            <form onSubmit={handleSendOTP}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="login-button" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 size={18} className="spinner" /> : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  We sent a code to <br/> <strong>{email}</strong>
                </p>
                <button 
                  type="button" 
                  onClick={() => setOtpStep('ID')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem' }}
                >
                  Change Email
                </button>
              </div>
              <div className="form-group">
                <label htmlFor="otp">Verification Code</label>
                <div className="input-with-icon">
                  <Key size={18} className="input-icon" />
                  <input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.25rem', fontWeight: 'bold' }}
                  />
                </div>
              </div>
              <button type="submit" className="login-button" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 size={18} className="spinner" /> : 'Verify & Enter'}
              </button>
            </form>
          )
        )}
        
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          &copy; 2026 BarbaSys v2.0 • Secure Access
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
