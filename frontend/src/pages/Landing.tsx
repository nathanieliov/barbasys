import { useNavigate } from 'react-router-dom';
import { Scissors, Calendar, Zap, ArrowRight, Key, Search, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Landing(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user?.role === 'CUSTOMER') {
    navigate('/');
    return null as any;
  }

  return (
    <div className="landing-page" style={{ background: '#fff', minHeight: '100vh', color: 'var(--text-main)' }}>
      {/* Navigation */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '900', fontSize: '1.5rem', color: 'var(--primary)' }}>
          <Scissors size={28} /> BarbaSys
        </div>
        <button className="secondary" onClick={() => navigate('/login')} style={{ fontWeight: '700' }}>
          Team Access
        </button>
      </nav>

      {/* Hero Section */}
      <header style={{ padding: '4rem 1.5rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: '900', lineHeight: '1.1', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
          Fresh Look, <br/> 
          <span style={{ color: 'var(--primary)' }}>Effortless Booking.</span>
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '3rem', lineHeight: '1.6' }}>
          Pick your favorite barber, select your services, and grab a spot in seconds.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
          <button 
            className="primary" 
            onClick={() => navigate('/discovery')}
            style={{ padding: '1.5rem', fontSize: '1.1rem', borderRadius: '1.25rem', fontWeight: '800', gap: '0.75rem', flexDirection: 'column', height: 'auto' }}
          >
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '1rem', marginBottom: '0.5rem' }}>
              <Calendar size={32} />
            </div>
            Book New Appointment
            <ArrowRight size={20} style={{ marginTop: '0.5rem' }} />
          </button>

          <button 
            className="secondary" 
            onClick={() => navigate('/my-bookings')}
            style={{ padding: '1.5rem', fontSize: '1.1rem', borderRadius: '1.25rem', fontWeight: '800', gap: '0.75rem', flexDirection: 'column', height: 'auto', border: '2px solid var(--border)' }}
          >
            <div style={{ background: 'rgba(79, 70, 229, 0.05)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '1rem', marginBottom: '0.5rem' }}>
              <Key size={32} />
            </div>
            Manage My Bookings
            <p style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Sign in with Email (OTP)</p>
          </button>
        </div>
      </header>

      {/* Features */}
      <section style={{ background: '#f9fafb', padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><Search size={32} /></div>
            <h3 style={{ marginBottom: '0.5rem' }}>Easy Discovery</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Find the best shops and professionals in your area instantly.</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><Clock size={32} /></div>
            <h3 style={{ marginBottom: '0.5rem' }}>Real-time Slots</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>See exactly when your barber is free. No more double bookings.</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><Zap size={32} /></div>
            <h3 style={{ marginBottom: '0.5rem' }}>Instant SMS</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Receive a confirmation code and reminder straight to your phone.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
