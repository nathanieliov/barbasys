import { useState } from 'react';
import { Search } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { formatCurrency } from '../utils/format';
import { useTranslation } from 'react-i18next';

interface CatalogItem {
  id: number;
  name: string;
  price: number;
  duration_minutes?: number;
  category?: string;
  stock?: number;
}

interface AddItemSheetProps {
  isOpen: boolean;
  mode: 'service' | 'product';
  items: CatalogItem[];
  recentIds: number[];
  currencySymbol: string;
  onClose: () => void;
  onAdd: (item: CatalogItem) => void;
}

function CatalogTile({
  item,
  mode,
  currencySymbol,
  onAdd,
}: {
  item: CatalogItem;
  mode: 'service' | 'product';
  currencySymbol: string;
  onAdd: (item: CatalogItem) => void;
}) {
  const { t } = useTranslation();
  const isProduct = mode === 'product';
  const outOfStock = isProduct && (item.stock ?? 1) === 0;

  return (
    <button
      onClick={() => !outOfStock && onAdd(item)}
      disabled={outOfStock}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r)',
        padding: '12px 10px',
        textAlign: 'left',
        cursor: outOfStock ? 'not-allowed' : 'pointer',
        opacity: outOfStock ? 0.45 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontFamily: 'var(--font)',
        width: '100%',
      }}
    >
      {/* icon tile */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: isProduct ? 'var(--sage-soft)' : 'var(--surface-2)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 18,
        }}
      >
        {isProduct ? '🧴' : '✂️'}
      </div>

      {/* name */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--ink)',
          lineHeight: 1.2,
        }}
      >
        {item.name}
      </div>

      {/* meta */}
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500 }}>
        {outOfStock
          ? t('barber_mode.out_of_stock')
          : isProduct
          ? `${item.stock} in stock`
          : item.duration_minutes
          ? `${item.duration_minutes} min`
          : null}
      </div>

      {/* price */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--ink)',
        }}
      >
        {formatCurrency(item.price, currencySymbol)}
      </div>
    </button>
  );
}

export default function BarberAddItemSheet({
  isOpen,
  mode,
  items,
  recentIds,
  currencySymbol,
  onClose,
  onAdd,
}: AddItemSheetProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const title =
    mode === 'service'
      ? t('barber_mode.add_service_title')
      : t('barber_mode.add_product_title');

  const filtered = query.trim()
    ? items.filter(i => i.name.toLowerCase().includes(query.trim().toLowerCase()))
    : items;

  const recent = query.trim()
    ? []
    : items.filter(i => recentIds.includes(i.id));

  const handleAdd = (item: CatalogItem) => {
    onAdd(item);
    setQuery('');
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={() => { setQuery(''); onClose(); }} title={title}>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 18 }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: 13,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--ink-3)',
            pointerEvents: 'none',
          }}
        />
        <input
          className="bm-search"
          type="search"
          placeholder={t('barber_mode.search_placeholder')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label={title}
        />
      </div>

      {/* Recently used pills */}
      {recent.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: 10,
            }}
          >
            {t('barber_mode.recently_used')}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {recent.map(item => (
              <button
                key={item.id}
                onClick={() => handleAdd(item)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  fontFamily: 'var(--font)',
                }}
              >
                <span>{mode === 'product' ? '🧴' : '✂️'}</span>
                {item.name}
                <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>
                  {formatCurrency(item.price, currencySymbol)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All items grid */}
      <div>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            marginBottom: 10,
          }}
        >
          {mode === 'service'
            ? t('barber_mode.all_services')
            : t('barber_mode.all_products')}
        </div>
        <div className="bm-catalog-grid">
          {filtered.map(item => (
            <CatalogTile
              key={item.id}
              item={item}
              mode={mode}
              currencySymbol={currencySymbol}
              onAdd={handleAdd}
            />
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
