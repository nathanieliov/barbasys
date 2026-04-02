import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { Search, MapPin, Phone, Scissors, ChevronRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ShopDiscovery() {
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
    <div className="discovery-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: '1.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: '900', marginBottom: '0.5rem' }}>Find your Style</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Discover the best barbershops in your area.</p>
      </div>

      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <Search size={20} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          placeholder="Search by name or location..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ paddingLeft: '3rem', fontSize: '1.1rem', borderRadius: '1.25rem', height: '3.5rem', border: '2px solid var(--border)', background: 'white' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {filteredShops.map(shop => (
            <div key={shop.id} className="card" style={{ padding: '1.25rem', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid var(--border)' }} onClick={() => navigate(`/book/${shop.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <div style={{ width: '64px', height: '64px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Scissors size={32} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{shop.name}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <MapPin size={14} /> {shop.address}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <Phone size={14} /> {shop.phone || 'No phone provided'}
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
                <button style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', borderRadius: '0.75rem' }}>
                  Book Now
                </button>
              </div>
            </div>
          ))}
          {filteredShops.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <p>No barbershops found matching your search.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
