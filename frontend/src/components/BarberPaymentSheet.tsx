import { useState, useEffect } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { formatCurrency } from '../utils/format';
import {
  validateTip,
  sanitizeTipInput,
  normalizeTipOnBlur,
  ticketSubtotal,
  type TicketItem,
} from '../utils/barber-mode';
import { useTranslation } from 'react-i18next';

type PaymentMethod = 'cash' | 'bank_transfer';
type PaymentPhase = 'select' | 'processing' | 'done';

interface BarberPaymentSheetProps {
  isOpen: boolean;
  items: TicketItem[];
  currencySymbol: string;
  taxRate: number;
  barberId: number | null;
  appointmentId: number | null;
  isWalkin?: boolean;
  onClose: () => void;
  onSuccess: (tipValue: number) => void;
  onOpenTab?: () => void;
  onCharge: (args: {
    barberId: number;
    items: TicketItem[];
    tipAmount: number;
    paymentMethod: PaymentMethod;
    appointmentId: number | null;
  }) => Promise<void>;
}

export default function BarberPaymentSheet({
  isOpen,
  items,
  currencySymbol,
  taxRate,
  barberId,
  appointmentId,
  isWalkin = false,
  onClose,
  onSuccess,
  onOpenTab,
  onCharge,
}: BarberPaymentSheetProps) {
  const { t } = useTranslation();

  const [phase, setPhase] = useState<PaymentPhase>('select');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [tipStr, setTipStr] = useState('0.00');
  const [paidAmount, setPaidAmount] = useState(0);
  const [paidTip, setPaidTip] = useState(0);
  const [chargeError, setChargeError] = useState('');

  // Reset state each time the sheet opens
  useEffect(() => {
    if (isOpen) {
      setPhase('select');
      setMethod('cash');
      setTipStr('0.00');
      setChargeError('');
    }
  }, [isOpen]);

  const subtotal = ticketSubtotal(items);
  const taxAmount = subtotal * (taxRate / 100);
  const tipValidation = validateTip(tipStr, subtotal, currencySymbol);
  const tipValue = tipValidation.valid ? tipValidation.value : 0;
  const total = subtotal + taxAmount + (tipValidation.valid ? tipValue : 0);

  const cap = Math.max(50, subtotal);

  const handleCharge = async () => {
    if (!tipValidation.valid) return;
    if (!barberId) return;

    setPhase('processing');
    setChargeError('');

    try {
      await onCharge({
        barberId,
        items,
        tipAmount: tipValue,
        paymentMethod: method,
        appointmentId,
      });
      setPaidAmount(total);
      setPaidTip(tipValue);
      setPhase('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment failed.';
      setChargeError(msg);
      setPhase('select');
    }
  };

  const handleNextCustomer = () => {
    onSuccess(paidTip);
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={phase === 'processing' ? () => {} : onClose}
      title={t('barber_mode.payment_title')}
      height="auto"
    >
      {phase === 'select' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Subtotal pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface-2)',
              borderRadius: 999,
              padding: '10px 18px',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
              {t('barber_mode.subtotal')}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--ink)',
              }}
            >
              {formatCurrency(subtotal, currencySymbol)}
            </span>
          </div>

          {/* Method selector */}
          <div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                marginBottom: 8,
              }}
            >
              {t('barber_mode.method')}
            </div>
            <div className="bm-method-grid">
              {(
                [
                  { id: 'cash', emoji: '💵', label: t('barber_mode.cash') },
                  { id: 'bank_transfer', emoji: '🏦', label: t('barber_mode.bank_transfer') },
                ] as const
              ).map(m => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`bm-method-tile${method === m.id ? ' selected' : ''}`}
                  aria-pressed={method === m.id}
                >
                  <span style={{ fontSize: 22 }}>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pay Later link */}
          {onOpenTab && (
            <button
              onClick={onOpenTab}
              style={{
                background: 'transparent',
                border: 0,
                color: 'var(--ink-3)',
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: 'var(--font)',
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                padding: 0,
                textAlign: 'left',
              }}
            >
              {isWalkin ? t('tabs.walkin_no_tabs') : t('tabs.open_tab_link')}
            </button>
          )}

          {/* Tip input */}
          <div className={`bm-tip-card${!tipValidation.valid ? ' error' : ''}`}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 3 }}>
                {t('barber_mode.tip_label')}
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', lineHeight: 1.3 }}>
                {t('barber_mode.tip_helper', {
                  max: formatCurrency(cap, currencySymbol),
                })}
              </div>
            </div>
            <div className="bm-tip-input-pill">
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--ink-3)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {currencySymbol}
              </span>
              <input
                className="bm-tip-input"
                type="text"
                inputMode="decimal"
                value={tipStr}
                onChange={e => setTipStr(sanitizeTipInput(e.target.value))}
                onFocus={() => { if (tipStr === '0.00') setTipStr(''); }}
                onBlur={() => setTipStr(normalizeTipOnBlur(tipStr))}
                aria-label="Tip amount"
              />
            </div>
          </div>

          {/* Inline tip error */}
          {!tipValidation.valid && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: 'var(--primary-deep)',
                fontWeight: 500,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'var(--primary-deep)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                !
              </div>
              {tipValidation.error}
            </div>
          )}

          {/* Charge total row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)' }}>
              {t('barber_mode.charge')}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 30,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--ink)',
                letterSpacing: '-0.025em',
              }}
            >
              {formatCurrency(total, currencySymbol)}
            </span>
          </div>

          {chargeError && (
            <div
              style={{
                background: 'var(--primary-soft)',
                color: 'var(--primary-deep)',
                padding: '10px 14px',
                borderRadius: 'var(--r)',
                fontSize: 13,
              }}
            >
              {chargeError}
            </div>
          )}

          {/* Charge button */}
          <button
            disabled={!tipValidation.valid}
            onClick={handleCharge}
            style={{
              height: 54,
              borderRadius: 16,
              border: 0,
              background: tipValidation.valid ? 'var(--primary)' : 'var(--surface-3)',
              color: tipValidation.valid ? '#fff' : 'var(--ink-4)',
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'var(--font)',
              cursor: tipValidation.valid ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: tipValidation.valid ? '0 6px 18px #e0785655' : 'none',
              transition: 'background 0.15s, box-shadow 0.15s',
              marginBottom: 8,
            }}
          >
            {method === 'cash'
              ? t('barber_mode.cash_received')
              : t('barber_mode.confirm_transfer')}
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {phase === 'processing' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
            padding: '32px 0 48px',
          }}
        >
          <div className="bm-spinner" aria-label="Processing payment" />
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: '-0.015em',
                textAlign: 'center',
                color: 'var(--ink)',
              }}
            >
              {method === 'cash'
                ? t('barber_mode.processing_cash')
                : t('barber_mode.processing_transfer')}
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--ink-3)',
                textAlign: 'center',
                marginTop: 6,
              }}
            >
              {method === 'cash'
                ? t('barber_mode.processing_sub_cash')
                : t('barber_mode.processing_sub_transfer')}
            </div>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            padding: '24px 0 32px',
          }}
        >
          {/* Sage check badge */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--sage-soft)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--success)',
            }}
          >
            <Check size={32} strokeWidth={2.5} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
              }}
            >
              {t('barber_mode.paid', { amount: formatCurrency(paidAmount, currencySymbol) })}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>
              {t('barber_mode.receipt_sent', {
                tip: formatCurrency(paidTip, currencySymbol),
              })}
            </div>
          </div>

          <button
            onClick={handleNextCustomer}
            style={{
              width: '100%',
              height: 54,
              borderRadius: 16,
              border: 0,
              background: 'var(--ink)',
              color: 'var(--bg)',
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'var(--font)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 8,
            }}
          >
            {t('barber_mode.next_customer')}
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
