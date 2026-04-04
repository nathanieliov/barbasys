import { useNavigate } from 'react-router-dom';
import { Scissors, Calendar, Zap, ArrowRight, Star } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page" style={{ background: '#fff', minHeight: '100vh', color: 'var(--text-main)' }}>
      {/* Navigation */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '900', fontSize: '1.5rem', color: 'var(--primary)' }}>
          <Scissors size={28} /> BarbaSys
        </div>
        <button className="secondary" onClick={() => navigate('/login')} style={{ fontWeight: '700' }}>
          Professional Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <header style={{ padding: '4rem 1.5rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', padding: '0.5rem 1rem', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '2rem', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '800', marginBottom: '1.5rem', gap: '0.5rem', alignItems: 'center' }}>
          <Zap size={14} /> #1 Barbershop App in the DR
        </div>
        <h1 style={{ fontSize: '3.5rem', fontWeight: '900', lineHeight: '1.1', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
          Effortless Style, <br/> 
          <span style={{ color: 'var(--primary)' }}>Instantly Booked.</span>
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '2.5rem', lineHeight: '1.6' }}>
          Experience the modern way to book your haircut. No calls, no waiting. Just pick your barber and walk in.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            className="primary" 
            onClick={() => navigate('/discovery')}
            style={{ padding: '1.25rem 2.5rem', fontSize: '1.1rem', borderRadius: '1rem', fontWeight: '800', gap: '0.75rem', boxShadow: '0 20px 25px -5px rgba(79, 70, 229, 0.2)' }}
          >
            Find a Barbershop <ArrowRight size={20} />
          </button>
        </div>
      </header>

      {/* Featured Shops / Value Prop */}
      <section style={{ background: '#f9fafb', padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: '900' }}>Why book with BarbaSys?</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div className="card" style={{ padding: '2rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', width: '48px', height: '48px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Zap size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Instant Confirmation</h3>
              <p style={{ color: 'var(--text-muted)' }}>Get a secure SMS or Email confirmation immediately. Your spot is guaranteed.</p>
            </div>

            <div className="card" style={{ padding: '2rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', width: '48px', height: '48px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Calendar size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Manage Bookings</h3>
              <p style={{ color: 'var(--text-muted)' }}>Need to reschedule? Do it from your portal without making a single phone call.</p>
            </div>

            <div className="card" style={{ padding: '2rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', width: '48px', height: '48px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Star size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Trusted Professionals</h3>
              <p style={{ color: 'var(--text-muted)' }}>Browse real reviews and see portfolios before you even step into the shop.</p>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ padding: '4rem 1.5rem', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          &copy; 2026 BarbaSys. All rights reserved. <br/>
          Made for the modern grooming experience.
        </p>
      </footer>
    </div>
  );
}
