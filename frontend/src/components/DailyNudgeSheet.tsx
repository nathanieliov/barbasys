import { ArrowRight } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { formatCurrency } from '../utils/format';
import type { OutstandingTab } from '@barbasys/shared';

function daysOpen(openedAt: string): number {
  const diff = Date.now() - new Date(openedAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function initials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
}

function nudgeDismissKey(): string {
  return `nudge_dismissed_${new Date().toISOString().slice(0, 10)}`;
}

export function shouldShowDailyNudge(tabs: OutstandingTab[]): boolean {
  if (localStorage.getItem(nudgeDismissKey())) return false;
  return tabs.some(t => t.status !== 'paid' && daysOpen(t.opened_at) >= 1);
}

export function dismissDailyNudge(): void {
  localStorage.setItem(nudgeDismissKey(), '1');
}

interface DailyNudgeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSendAll: (tabIds: string[]) => void;
  tabs: OutstandingTab[];
  currencySymbol: string;
  barberName?: string;
}

export default function DailyNudgeSheet({
  isOpen,
  onClose,
  onSendAll,
  tabs,
  currencySymbol,
  barberName = 'Your barber',
}: DailyNudgeSheetProps) {
  const eligible = tabs.filter(t => t.status !== 'paid' && daysOpen(t.opened_at) >= 1);
  const total = eligible.reduce((s, t) => s + t.amount, 0);

  if (!eligible.length) return null;

  const handleSend = () => {
    onSendAll(eligible.map(t => t.id));
    dismissDailyNudge();
    onClose();
  };

  const handleNotNow = () => {
    dismissDailyNudge();
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleNotNow} title="Send today's reminders?" height="auto">
      <div style={{ padding: '0 0 8px' }}>
        <div style={{
          width: 60,
          height: 60,
          borderRadius: 18,
          background: 'var(--primary-soft)',
          color: 'var(--primary-deep)',
          margin: '0 auto 14px',
          display: 'grid',
          placeItems: 'center',
          fontSize: 28,
        }}>
          💬
        </div>

        <div style={{
          fontSize: 13.5,
          color: 'var(--ink-2)',
          marginBottom: 16,
          lineHeight: 1.5,
          textAlign: 'center',
          padding: '0 4px',
        }}>
          <b>{eligible.length} customer{eligible.length === 1 ? ' has' : 's have'}</b> an open tab — total{' '}
          <b>{formatCurrency(total, currencySymbol)}</b>. We'll WhatsApp them a friendly nudge.
        </div>

        {/* Tab list */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: '6px 14px',
          marginBottom: 16,
        }}>
          {eligible.map((t, i) => (
            <div key={t.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: i < eligible.length - 1 ? '1px dashed var(--line)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  background: 'var(--surface-2)',
                  color: 'var(--ink-2)',
                  fontWeight: 700,
                  fontSize: 11,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}>
                  {initials(t.customer_name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
                    {t.customer_name ?? '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>
                    {daysOpen(t.opened_at)}d open ·{' '}
                    {t.last_reminder_at ? `last ${new Date(t.last_reminder_at).toLocaleDateString()}` : 'never nudged'}
                  </div>
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--ink)',
              }}>
                {formatCurrency(t.amount, currencySymbol)}
              </div>
            </div>
          ))}
        </div>

        {/* WhatsApp preview */}
        <div style={{
          background: '#dcf8c6',
          borderRadius: 14,
          padding: '10px 14px',
          fontSize: 13,
          color: '#0b3a1a',
          lineHeight: 1.45,
          marginBottom: 16,
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#3c6c47',
            marginBottom: 4,
          }}>WhatsApp preview</div>
          Hey [name]! Just a friendly reminder about your last visit ✂️ —
          you have an open tab of $[amount] from [date]. Pop in any time! — {barberName}
        </div>

        <button
          onClick={handleSend}
          style={{
            width: '100%',
            height: 52,
            borderRadius: 14,
            border: 0,
            background: 'var(--primary)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'var(--font)',
            cursor: 'pointer',
            boxShadow: '0 6px 18px var(--primary-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          Send {eligible.length} reminder{eligible.length === 1 ? '' : 's'}
          <ArrowRight size={15} />
        </button>

        <button onClick={handleNotNow} style={{
          width: '100%',
          height: 44,
          marginTop: 8,
          border: 0,
          background: 'transparent',
          color: 'var(--ink-3)',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'var(--font)',
          cursor: 'pointer',
        }}>
          Not now
        </button>
      </div>
    </BottomSheet>
  );
}
