import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Scissors, Package, Edit2 } from 'lucide-react';
import apiClient from '../api/apiClient';
import { formatCurrency } from '../utils/format';

interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
  is_active?: boolean;
}

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  min_stock_threshold: number;
}

function skuFromId(id: number): string {
  return `BBS-${String(id).padStart(4, '0').slice(-4).toUpperCase()}`;
}

export default function Catalog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'services' | 'products'>('services');
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.get('/services'),
      apiClient.get('/inventory'),
    ]).then(([sRes, pRes]) => {
      setServices(sRes.data);
      setProducts(pRes.data);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{t('catalog.title', 'Products & Services')}</h1>
          <div className="sub">
            {services.length} {t('catalog.tabServices', 'Services').toLowerCase()} · {products.length} {t('catalog.tabProducts', 'Products').toLowerCase()}
          </div>
        </div>
        <div className="spacer" />
        <button className="btn btn-soft">
          {t('catalog.categories', 'Categories')}
        </button>
        <button
          className="btn btn-accent"
          onClick={() => navigate(tab === 'services' ? '/services' : '/inventory')}
        >
          {tab === 'services'
            ? t('catalog.newService', 'New service')
            : t('catalog.newProduct', 'New product')}
        </button>
      </div>

      <div className="pos-tabs" role="tablist" style={{ marginBottom: 18 }}>
        <button
          role="tab"
          aria-selected={tab === 'services'}
          className={tab === 'services' ? 'active' : ''}
          onClick={() => setTab('services')}
        >
          {t('catalog.tabServices', 'Services')}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'products'}
          className={tab === 'products' ? 'active' : ''}
          onClick={() => setTab('products')}
        >
          {t('catalog.tabProducts', 'Products')}
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)' }}>
          {t('common.loading', 'Loading...')}
        </div>
      ) : tab === 'services' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t('catalog.colService', 'Service')}</th>
                  <th>{t('catalog.colDuration', 'Duration')}</th>
                  <th>{t('catalog.colPrice', 'Price')}</th>
                  <th>{t('catalog.colBookedWk', 'Booked / wk')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {services.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <Scissors size={16} color="var(--ink-2)" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          {s.is_active === false && (
                            <span className="chip chip-warn" style={{ marginTop: 2 }}>
                              {t('catalog.inactive', 'Inactive')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{s.duration_minutes} min</td>
                    <td>{formatCurrency(s.price)}</td>
                    <td style={{ color: 'var(--ink-3)' }}>—</td>
                    <td>
                      <button
                        className="icon-btn"
                        aria-label={t('catalog.editService', 'Edit service')}
                        onClick={() => navigate('/services')}
                      >
                        <Edit2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t('catalog.colProduct', 'Product')}</th>
                  <th>{t('catalog.colSku', 'SKU')}</th>
                  <th>{t('catalog.colStock', 'Stock')}</th>
                  <th>{t('catalog.colPrice', 'Price')}</th>
                  <th>{t('catalog.colSoldWk', 'Sold / wk')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <Package size={16} color="var(--ink-2)" />
                        </div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                      </div>
                    </td>
                    <td>
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {skuFromId(p.id)}
                      </code>
                    </td>
                    <td>
                      {p.stock === 0 ? (
                        <span className="chip chip-danger">{t('catalog.outOfStock', 'Out of stock')}</span>
                      ) : p.stock < p.min_stock_threshold ? (
                        <span className="chip chip-warn">{t('catalog.lowStock', 'Low')} ({p.stock})</span>
                      ) : (
                        p.stock
                      )}
                    </td>
                    <td>{formatCurrency(p.price)}</td>
                    <td style={{ color: 'var(--ink-3)' }}>—</td>
                    <td>
                      <button
                        className="icon-btn"
                        aria-label={t('catalog.editProduct', 'Edit product')}
                        onClick={() => navigate('/inventory')}
                      >
                        <Edit2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
