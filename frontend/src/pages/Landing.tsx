import { useNavigate } from 'react-router-dom';
import { Calendar, Zap, ArrowRight, Key, Search, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Card } from '../components';

export default function Landing(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user?.role === 'CUSTOMER') {
    navigate('/');
    return null as any;
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text-main)' }}>
      {/* Hero */}
      <header style={{ padding: '4rem 1.5rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: '900', lineHeight: '1.1', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
          {t('landing.hero_title')}
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '3rem', lineHeight: '1.6' }}>
          {t('landing.hero_subtitle')}
        </p>

        <div className="cta-grid">
          <Card
            shadow="md"
            style={{ cursor: 'pointer', background: 'var(--primary)', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.5rem', borderRadius: '1.25rem' }}
            role="button"
            tabIndex={0}
            onClick={() => navigate('/discovery')}
            onKeyDown={e => e.key === 'Enter' && navigate('/discovery')}
          >
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '1rem' }}>
              <Calendar size={32} />
            </div>
            <span style={{ fontWeight: '800', fontSize: '1.1rem' }}>{t('landing.book_appointment')}</span>
            <ArrowRight size={20} />
          </Card>

          <Card
            shadow="sm"
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.5rem', borderRadius: '1.25rem' }}
            role="button"
            tabIndex={0}
            onClick={() => navigate('/my-bookings')}
            onKeyDown={e => e.key === 'Enter' && navigate('/my-bookings')}
          >
            <div style={{ background: 'var(--surface-2, #f3f4f6)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '1rem' }}>
              <Key size={32} />
            </div>
            <span style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--text-main)' }}>{t('landing.manage_bookings')}</span>
            <p style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', margin: 0 }}>{t('landing.manage_bookings_hint')}</p>
          </Card>
        </div>
      </header>

      {/* Features */}
      <section style={{ background: 'var(--surface, #f9fafb)', padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          <Card padding="2rem" shadow="sm" style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><Search size={32} /></div>
            <h3 style={{ marginBottom: '0.5rem' }}>{t('landing.feature_discovery_title')}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{t('landing.feature_discovery_desc')}</p>
          </Card>
          <Card padding="2rem" shadow="sm" style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><Clock size={32} /></div>
            <h3 style={{ marginBottom: '0.5rem' }}>{t('landing.feature_slots_title')}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{t('landing.feature_slots_desc')}</p>
          </Card>
          <Card padding="2rem" shadow="sm" style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><Zap size={32} /></div>
            <h3 style={{ marginBottom: '0.5rem' }}>{t('landing.feature_sms_title')}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{t('landing.feature_sms_desc')}</p>
          </Card>
        </div>
      </section>

    </div>
  );
}
