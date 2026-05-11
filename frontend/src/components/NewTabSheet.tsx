import { useState, useEffect } from 'react';
import { ArrowRight, Receipt } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BottomSheet from './BottomSheet';
import { formatCurrency } from '../utils/format';
import type { TicketItem } from '../utils/barber-mode';
import type { TabItem } from '@barbasys/shared';

const PHONE_RE = /^[\d +()\-]{7,}$/;

interface NewTabCustomer {
  id: number;
  name: string | null;
  phone: string | null;
}

interface NewTabSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { customerId: number; name: string; phone: string; note: string; items: TabItem[]; amount: number }) => void;
  total: number;
  currencySymbol: string;
  items: TicketItem[];
  customer: NewTabCustomer | null;
}

export default function NewTabSheet({
  isOpen,
  onClose,
  onConfirm,
  total,
  currencySymbol,
  items,
  customer,
}: NewTabSheetProps) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setPhone(customer?.phone ?? '');
    setNote('');
  }, [isOpen, customer]);

  const phoneOk = PHONE_RE.test(phone.trim());
  const ready = phoneOk && !!customer;

  const tabItems: TabItem[] = items.map(i => ({
    name: i.name,
    price: i.price,
    qty: i.qty,
  }));

  const handleConfirm = () => {
    if (!ready || !customer) return;
    onConfirm({
      customerId: customer.id,
      name: customer.name ?? '',
      phone: phone.trim(),
      note: note.trim(),
      items: tabItems,
      amount: total,
    });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('tabs.sheet_title')} height="auto">
      {/* Info banner */}
      <div style={{
        background: 'var(--sage-soft)',
        color: 'var(--success)',
        borderRadius: 14,
        padding: '10px 14px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        marginBottom: 14,
        fontSize: 12.5,
        lineHeight: 1.45,
      }}>
        <Receipt size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span dangerouslySetInnerHTML={{ __html: t('tabs.info_banner') }} />
      </div>

      {/* Ticket recap */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        padding: '10px 14px',
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          marginBottom: 6,
        }}>{t('tabs.ticket_heading')}</div>
        {items.map((l, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 13,
            padding: '3px 0',
            color: 'var(--ink-2)',
          }}>
            <span>{l.name}{l.qty > 1 ? ` ×${l.qty}` : ''}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(l.price * l.qty, currencySymbol)}
            </span>
          </div>
        ))}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingTop: 8,
          marginTop: 6,
          borderTop: '1px dashed var(--line)',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--ink)',
        }}>
          <span>{t('tabs.owed')}</span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontVariantNumeric: 'tabular-nums',
          }}>{formatCurrency(total, currencySymbol)}</span>
        </div>
      </div>

      {/* Customer name (read-only) */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 5 }}>
          {t('tabs.customer_label')}
        </div>
        <div style={{
          height: 44,
          borderRadius: 12,
          border: '1px solid var(--line)',
          background: 'var(--surface-2)',
          padding: '0 14px',
          fontSize: 14,
          color: 'var(--ink)',
          display: 'flex',
          alignItems: 'center',
        }}>
          {customer?.name ?? '—'}
        </div>
      </div>

      <form onSubmit={e => { e.preventDefault(); handleConfirm(); }}>
      {/* Phone */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 5 }}>
          {t('tabs.phone_label')} <span style={{ color: 'var(--primary-deep)' }}>{t('tabs.phone_required')}</span>
        </div>
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder={t('tabs.phone_placeholder')}
          inputMode="tel"
          enterKeyHint="done"
          onKeyDown={e => { if (e.key === 'Enter' && ready) { e.preventDefault(); handleConfirm(); } }}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 12,
            border: `1px solid ${phoneOk || !phone ? 'var(--line)' : 'var(--primary-deep)'}`,
            background: 'var(--surface)',
            padding: '0 14px',
            fontSize: 14,
            color: 'var(--ink)',
            fontFamily: 'var(--font)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500, marginTop: 2 }}>
          {t('tabs.phone_hint')}
        </div>
      </div>

      {/* Note */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 5 }}>
          {t('tabs.note_label')}
        </div>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t('tabs.note_placeholder')}
          enterKeyHint="done"
          onKeyDown={e => { if (e.key === 'Enter' && ready) { e.preventDefault(); handleConfirm(); } }}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 12,
            border: '1px solid var(--line)',
            background: 'var(--surface)',
            padding: '0 14px',
            fontSize: 14,
            color: 'var(--ink)',
            fontFamily: 'var(--font)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!ready}
        style={{
          width: '100%',
          height: 54,
          borderRadius: 16,
          border: 0,
          background: ready ? 'var(--ink)' : 'rgba(42,37,32,0.25)',
          color: ready ? 'var(--bg)' : 'var(--ink-3)',
          fontSize: 16,
          fontWeight: 700,
          fontFamily: 'var(--font)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          cursor: ready ? 'pointer' : 'not-allowed',
          boxShadow: ready ? '0 4px 14px rgba(42,37,32,0.25)' : 'none',
        }}
      >
        {t('tabs.confirm_btn', { amount: formatCurrency(total, currencySymbol) })} <ArrowRight size={16} />
      </button>
      </form>

      <button onClick={onClose} style={{
        width: '100%',
        height: 44,
        marginTop: 8,
        border: 0,
        background: 'transparent',
        color: 'var(--ink-3)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--font)',
      }}>
        {t('tabs.back_to_payment')}
      </button>
    </BottomSheet>
  );
}
