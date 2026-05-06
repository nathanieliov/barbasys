import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { Search, MapPin, Phone, Scissors, ChevronRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, Button } from '../components';

export default function ShopDiscovery() {
  const { t } = useTranslation();
  const [shops, setShops] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get('/public/shops')
      .then(res => setShops(res.data))
      .finally(() => setLoading(false));
  }, []);

  const filteredShops = shops.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: '1.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: '900', marginBottom: '0.5rem' }}>{t('discovery.title')}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>{t('discovery.subtitle')}</p>
      </div>

      <div className="input-with-icon" style={{ marginBottom: '2rem' }}>
        <Search size={20} className="input-icon" />
        <input
          type="text"
          placeholder={t('discovery.search_placeholder')}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ paddingLeft: '3rem', fontSize: '1.1rem', borderRadius: '1.25rem', height: '3.5rem', border: '2px solid var(--border)', background: 'white', width: '100%' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {filteredShops.map(shop => (
            <Card
              key={shop.id}
              padding="1.25rem"
              shadow="sm"
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
              onClick={() => navigate(`/book/${shop.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <div style={{ width: '64px', height: '64px', background: 'var(--surface-2, #f3f4f6)', color: 'var(--primary)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Scissors size={32} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{shop.name}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <MapPin size={14} /> {shop.address}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <Phone size={14} /> {shop.phone || t('discovery.no_phone')}
                    </div>
                  </div>
                </div>
                <ChevronRight size={24} color="var(--text-muted)" />
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.25rem', color: '#f59e0b' }}>
                  <Star size={16} fill="#f59e0b" />
                  <Star size={16} fill="#f59e0b" />
                  <Star size={16} fill="#f59e0b" />
                  <Star size={16} fill="#f59e0b" />
                  <Star size={16} fill="#f59e0b" />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: '0.25rem', fontWeight: '600' }}>5.0</span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={e => { e.stopPropagation(); navigate(`/book/${shop.id}`); }}
                >
                  {t('discovery.book_now')}
                </Button>
              </div>
            </Card>
          ))}
          {filteredShops.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <p>{t('discovery.no_results')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
