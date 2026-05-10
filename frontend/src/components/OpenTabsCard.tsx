import { Check, MessageCircle, Receipt } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

interface OpenTabsCardProps {
  tabs: OutstandingTab[];
  currencySymbol: string;
  onNudgeAll: () => void;
  onNudgeOne: (tab: OutstandingTab) => void;
  onMarkPaid: (tab: OutstandingTab) => void;
}

export default function OpenTabsCard({
  tabs,
  currencySymbol,
  onNudgeAll,
  onNudgeOne,
  onMarkPaid,
}: OpenTabsCardProps) {
  const { t } = useTranslation();
  const open = tabs.filter(t => t.status !== 'paid');
  if (!open.length) return null;

  const total = open.reduce((s, t) => s + t.amount, 0);
  const subKey = open.length === 1 ? 'tabs.card_sub' : 'tabs.card_sub_plural';

  return (
    <div style={{ margin: '16px 0 0' }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 22,
        border: '1px solid var(--line)',
        boxShadow: '0 1px 2px rgba(60,40,25,0.04)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '13px 18px 11px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid var(--line)',
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            background: 'var(--butter-soft, #fef3c7)',
            color: '#8a6210',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}>
            <Receipt size={17} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: '-0.015em',
              color: 'var(--ink)',
              lineHeight: 1.1,
            }}>{t('tabs.card_title')}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, fontWeight: 500 }}>
              {t(subKey, { count: open.length, amount: formatCurrency(total, currencySymbol) })}
            </div>
          </div>
          <button
            onClick={onNudgeAll}
            style={{
              border: 0,
              background: 'var(--ink)',
              color: 'var(--bg)',
              padding: '8px 12px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--font)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 13 }}>💬</span> {t('tabs.nudge_all')}
          </button>
        </div>

        {/* Rows */}
        <div>
          {open.map((tab, i) => (
            <div key={tab.id} style={{
              padding: '12px 18px',
              borderBottom: i < open.length - 1 ? '1px dashed var(--line)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 11,
            }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: tab.status === 'reminded' ? 'var(--butter-soft, #fef3c7)' : 'var(--surface-2)',
                color: tab.status === 'reminded' ? '#8a6210' : 'var(--ink-2)',
                fontWeight: 700,
                fontSize: 13,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}>
                {initials(tab.customer_name)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  letterSpacing: '-0.005em',
                  lineHeight: 1.15,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {tab.customer_name ?? '—'}
                </div>
                <div style={{
                  fontSize: 11.5,
                  color: 'var(--ink-3)',
                  fontWeight: 500,
                  marginTop: 2,
                  display: 'flex',
                  gap: 5,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}>
                  <span>{t('tabs.days_ago', { n: daysOpen(tab.opened_at) })}</span>
                  <span style={{ color: 'var(--line)' }}>·</span>
                  <span>{tab.items.map(x => x.name).join(', ')}</span>
                  {tab.status === 'reminded' && (
                    <>
                      <span style={{ color: 'var(--line)' }}>·</span>
                      <span style={{ color: '#8a6210', fontWeight: 600 }}>{t('tabs.nudged_pill')}</span>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 17,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}>
                  {formatCurrency(tab.amount, currencySymbol)}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => onNudgeOne(tab)}
                    title={t('tabs.nudge_btn')}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: 0,
                      background: 'var(--surface-2)',
                      color: 'var(--ink-2)',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <MessageCircle size={13} />
                  </button>
                  <button
                    onClick={() => onMarkPaid(tab)}
                    title={t('tabs.mark_paid_btn')}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: 0,
                      background: 'var(--sage-soft)',
                      color: 'var(--success)',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Check size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
