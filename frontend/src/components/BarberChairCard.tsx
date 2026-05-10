import { Scissors, Star, X, FileText } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import {
  type TicketItem,
  type ChairState,
  elapsedSince,
  formatStartedAt,
  ticketSubtotal,
} from '../utils/barber-mode';
import { useTranslation } from 'react-i18next';

interface ChairCardProps {
  chairState: ChairState | null;
  currencySymbol: string;
  onAddService: () => void;
  onAddProduct: () => void;
  onCharge: () => void;
  onRemove: (cartId: string) => void;
}

function EmptyChair() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 22,
        border: '1px solid var(--line)',
        boxShadow: '0 1px 2px rgba(60,40,25,0.04), 0 6px 18px rgba(60,40,25,0.04)',
        margin: '0 18px',
        padding: 22,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          background: 'var(--surface-2)',
          margin: '6px auto 14px',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ink-3)',
        }}
      >
        <Scissors size={26} />
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          marginBottom: 4,
          color: 'var(--ink)',
        }}
      >
        {t('barber_mode.chair_open')}
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.45 }}>
        {t('barber_mode.chair_open_hint')}
      </div>
    </div>
  );
}

function TicketLine({
  item,
  currencySymbol,
  onRemove,
}: {
  item: TicketItem;
  currencySymbol: string;
  onRemove: (cartId: string) => void;
}) {
  const { t } = useTranslation();
  const isProduct = item.type === 'product';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '11px 18px',
      }}
    >
      {/* icon tile */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: isProduct ? 'var(--sage-soft)' : 'var(--surface-2)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {isProduct ? '🧴' : '✂️'}
      </div>

      {/* name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--ink)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.qty > 1 ? `${item.name} ×${item.qty}` : item.name}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, marginTop: 1 }}>
          {item.fromBooking && (
            <span
              style={{
                background: 'var(--butter-soft)',
                color: 'var(--ink-2)',
                padding: '1px 6px',
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 600,
                marginRight: 5,
              }}
            >
              {t('barber_mode.from_booking')}
            </span>
          )}
          {item.type === 'service' && item.durationMinutes ? `${item.durationMinutes} min` : null}
        </div>
      </div>

      {/* price */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--ink)',
          flexShrink: 0,
        }}
      >
        {formatCurrency(item.price * item.qty, currencySymbol)}
      </div>

      {/* remove */}
      <button
        onClick={() => onRemove(item.cartId)}
        aria-label={`Remove ${item.name}`}
        style={{
          border: 0,
          background: 'transparent',
          padding: 4,
          cursor: 'pointer',
          color: 'var(--ink-3)',
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function BarberChairCard({
  chairState,
  currencySymbol,
  onAddService,
  onAddProduct,
  onCharge,
  onRemove,
}: ChairCardProps) {
  const { t } = useTranslation();

  if (!chairState) {
    return <EmptyChair />;
  }

  const { customer, items, startedAt } = chairState;
  const subtotal = ticketSubtotal(items);
  const itemCount = items.reduce((s, i) => s + i.qty, 0);

  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 22,
        border: '1px solid var(--line)',
        boxShadow: '0 1px 2px rgba(60,40,25,0.04), 0 6px 18px rgba(60,40,25,0.04)',
        margin: '0 18px',
        overflow: 'hidden',
      }}
    >
      {/* Status strip */}
      <div
        style={{
          background: 'var(--primary)',
          color: '#fff',
          padding: '9px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 0 0 3px rgba(255,255,255,0.25)',
              animation: 'barber-pulse 1.6s ease-in-out infinite',
              display: 'block',
            }}
          />
          {t('barber_mode.in_your_chair')}
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.85 }}>
          {t('barber_mode.started')} {formatStartedAt(startedAt)} · {elapsedSince(startedAt)}
        </span>
      </div>

      {/* Customer block */}
      <div style={{ padding: '16px 18px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Avatar tile */}
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: 'var(--primary-soft)',
              color: 'var(--primary-deep)',
              fontWeight: 700,
              fontSize: 16,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            {customer.initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: '-0.015em',
                color: 'var(--ink)',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {customer.name}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--ink-3)',
                fontWeight: 500,
                marginTop: 2,
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              {!customer.isWalkin && (
                <>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      color: 'var(--primary-deep)',
                      fontWeight: 600,
                    }}
                  >
                    <Star size={11} fill="currentColor" /> {customer.visitNumber}
                  </span>
                  <span style={{ color: 'var(--ink-4)' }}>·</span>
                  <span>
                    last: {customer.lastService}, {customer.lastVisit}
                  </span>
                </>
              )}
              {customer.isWalkin && (
                <span style={{ color: 'var(--ink-3)' }}>Walk-in</span>
              )}
            </div>
          </div>
        </div>

        {/* Note callout */}
        {customer.notes && (
          <div
            style={{
              background: 'var(--butter-soft)',
              borderRadius: 12,
              padding: '10px 14px',
              marginTop: 12,
              fontSize: 12.5,
              color: 'var(--ink-2)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 7,
            }}
          >
            <FileText size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Note: {customer.notes}</span>
          </div>
        )}
      </div>

      {/* Ticket lines */}
      {items.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {items.map((item, idx) => (
            <div key={item.cartId}>
              {idx > 0 && <div className="bm-ticket-sep" />}
              <TicketLine item={item} currencySymbol={currencySymbol} onRemove={onRemove} />
            </div>
          ))}
        </div>
      )}

      {/* Add buttons */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 18px 0' }}>
        {[
          { label: t('barber_mode.add_service'), handler: onAddService },
          { label: t('barber_mode.add_product'), handler: onAddProduct },
        ].map(({ label, handler }) => (
          <button
            key={label}
            onClick={handler}
            style={{
              flex: 1,
              height: 40,
              border: '1.5px dashed var(--line-2)',
              borderRadius: 'var(--r)',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink-3)',
              fontFamily: 'var(--font)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Total + CTA */}
      <div
        style={{
          background: 'var(--surface-2)',
          margin: '12px 0 0',
          padding: '14px 18px 18px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
            {itemCount === 1
              ? t('barber_mode.total_item', { count: itemCount })
              : t('barber_mode.total_items', { count: itemCount })}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
            }}
          >
            {formatCurrency(subtotal, currencySymbol)}
          </span>
        </div>

        <button
          disabled={items.length === 0}
          onClick={onCharge}
          style={{
            width: '100%',
            height: 52,
            borderRadius: 16,
            border: 0,
            background: items.length === 0 ? 'var(--ink-4)' : 'var(--ink)',
            color: items.length === 0 ? 'var(--surface-2)' : 'var(--bg)',
            fontSize: 16,
            fontWeight: 700,
            fontFamily: 'var(--font)',
            cursor: items.length === 0 ? 'not-allowed' : 'pointer',
            letterSpacing: '-0.01em',
            boxShadow: items.length === 0 ? 'none' : '0 4px 14px rgba(42,37,32,0.25)',
            transition: 'background 0.15s, box-shadow 0.15s',
          }}
        >
          {t('barber_mode.take_payment')}
        </button>
      </div>
    </div>
  );
}
