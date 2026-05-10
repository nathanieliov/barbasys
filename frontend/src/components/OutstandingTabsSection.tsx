import { useState, useEffect, useCallback } from 'react';
import { Receipt, MessageCircle, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { tabsApi } from '../api/tabsApi';
import { formatCurrency } from '../utils/format';
import type { OutstandingTab, TabStatus } from '@barbasys/shared';
import { useToast } from './Toast';

type FilterType = 'open' | 'reminded' | 'all';

function daysOpen(openedAt: string): number {
  const diff = Date.now() - new Date(openedAt).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function initials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Mark-paid drawer ─────────────────────────────────────────────────────────

interface MarkPaidDrawerProps {
  tab: OutstandingTab;
  currencySymbol: string;
  onClose: () => void;
  onComplete: (tab: OutstandingTab, method: 'cash' | 'bank_transfer', tip: number) => void;
}

function MarkPaidDrawer({ tab, currencySymbol, onClose, onComplete }: MarkPaidDrawerProps) {
  const { t } = useTranslation();
  const [method, setMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [tipPct, setTipPct] = useState(0);
  const [phase, setPhase] = useState<'select' | 'processing'>('select');

  const tipAmt = tab.amount * (tipPct / 100);
  const grand = tab.amount + tipAmt;

  const charge = () => {
    setPhase('processing');
    setTimeout(() => onComplete(tab, method, tipAmt), 600);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,15,10,0.5)' }} />
      <div style={{
        position: 'relative',
        width: 'min(520px, 92vw)',
        background: 'var(--bg)',
        height: '100%',
        boxShadow: '-12px 0 40px rgba(40,30,20,0.18)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('tabs.mark_paid_title')}
          </div>
          <button onClick={onClose} style={{ border: 0, background: 'var(--surface-2)', width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-2)' }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Customer strip */}
          <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface)', color: 'var(--ink-2)', fontWeight: 700, fontSize: 13, display: 'grid', placeItems: 'center' }}>
              {initials(tab.customer_name)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{tab.customer_name ?? '—'}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                {t('tabs.tab_opened_sub', { date: new Date(tab.opened_at).toLocaleDateString(), n: daysOpen(tab.opened_at) })}
              </div>
            </div>
          </div>

          {/* Original ticket */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
              {t('tabs.original_ticket')}
            </div>
            {tab.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13.5, color: 'var(--ink-2)' }}>
                <span>{it.name}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(it.price, currencySymbol)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 6, borderTop: '1px dashed var(--line)', fontSize: 14, fontWeight: 700 }}>
              <span>{t('tabs.owed')}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(tab.amount, currencySymbol)}
              </span>
            </div>
          </div>

          {/* Method */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
              {t('tabs.method_label')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([['cash', '💵', t('tabs.cash')], ['bank_transfer', '🏦', t('barber_mode.bank_transfer')]] as const).map(([id, emoji, label]) => (
                <button key={id} onClick={() => setMethod(id)} style={{
                  height: 64,
                  borderRadius: 14,
                  border: method === id ? '2px solid var(--ink)' : '1px solid var(--line)',
                  background: 'var(--surface)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  fontSize: 13, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font)',
                }}>
                  <span style={{ fontSize: 20 }}>{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
              {t('tabs.tip_optional')}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[0, 15, 20, 25].map(pct => (
                <button key={pct} onClick={() => setTipPct(pct)} style={{
                  flex: 1, height: 44, borderRadius: 12,
                  border: tipPct === pct ? '2px solid var(--ink)' : '1px solid var(--line)',
                  background: tipPct === pct ? 'var(--ink)' : 'var(--surface)',
                  color: tipPct === pct ? 'var(--bg)' : 'var(--ink)',
                  fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'var(--font)',
                }}>
                  {pct === 0 ? t('common.done', 'None') : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Total */}
          <div style={{ background: 'var(--ink)', color: 'var(--bg)', borderRadius: 14, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{t('tabs.charge_label')}</div>
              {tipPct > 0 && (
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                  {formatCurrency(tab.amount, currencySymbol)} + {formatCurrency(tipAmt, currencySymbol)} {t('barber_mode.tip_label').toLowerCase()}
                </div>
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              {formatCurrency(grand, currencySymbol)}
            </div>
          </div>

          <button onClick={charge} disabled={phase !== 'select'} style={{
            width: '100%', height: 54, borderRadius: 14, border: 0,
            background: 'var(--primary)', color: '#fff', fontSize: 16, fontWeight: 700,
            fontFamily: 'var(--font)', cursor: phase === 'select' ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {phase === 'select'
              ? (method === 'cash' ? t('tabs.confirm_cash') : t('tabs.confirm_transfer'))
              : t('tabs.processing')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Customer drawer ──────────────────────────────────────────────────────────

interface CustomerDrawerProps {
  customerName: string;
  tabs: OutstandingTab[];
  currencySymbol: string;
  onClose: () => void;
  onMarkPaid: (tab: OutstandingTab) => void;
  onNudge: (tab: OutstandingTab) => void;
}

function CustomerDrawer({ customerName, tabs, currencySymbol, onClose, onMarkPaid, onNudge }: CustomerDrawerProps) {
  const { t } = useTranslation();
  const openTabs = tabs.filter(tab => tab.status !== 'paid');
  const paidTabs = tabs.filter(tab => tab.status === 'paid');
  const totalOpen = openTabs.reduce((s, tab) => s + tab.amount, 0);
  const totalLifetime = tabs.reduce((s, tab) => s + tab.amount, 0);

  const badge = (() => {
    if (paidTabs.length > 0 && openTabs.length === 0) return { label: t('tabs.reliable'), bg: 'var(--sage-soft)', color: '#4d6648' };
    if (openTabs.some(tab => daysOpen(tab.opened_at) > 5)) return { label: t('tabs.slow_payer'), bg: 'var(--primary-soft)', color: 'var(--primary-deep)' };
    return { label: t('tabs.on_track'), bg: 'var(--butter-soft, #fef3c7)', color: '#8a6210' };
  })();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,15,10,0.5)' }} />
      <div style={{
        position: 'relative',
        width: 'min(520px, 92vw)',
        background: 'var(--bg)',
        height: '100%',
        boxShadow: '-12px 0 40px rgba(40,30,20,0.18)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('tabs.customer_drawer_title')}
          </div>
          <button onClick={onClose} style={{ border: 0, background: 'var(--surface-2)', width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-2)' }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--surface-2)', color: 'var(--ink-2)', fontWeight: 700, fontSize: 18, display: 'grid', placeItems: 'center' }}>
              {initials(customerName)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{customerName}</div>
              {tabs[0]?.customer_phone && (
                <div style={{ fontSize: 13, marginTop: 4, color: 'var(--ink-3)', fontFamily: 'var(--font-mono, monospace)' }}>{tabs[0].customer_phone}</div>
              )}
            </div>
            <span style={{ padding: '4px 10px', borderRadius: 999, background: badge.bg, color: badge.color, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>
              {badge.label}
            </span>
          </div>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: t('tabs.open_now'), value: formatCurrency(totalOpen, currencySymbol) },
              { label: t('tabs.tabs_alltime'), value: String(tabs.length) },
              { label: t('tabs.total_billed'), value: formatCurrency(totalLifetime, currencySymbol) },
            ].map(k => (
              <div key={k.label} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>{k.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Open tabs */}
          {openTabs.length > 0 && (
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--primary-deep)', marginBottom: 10 }}>
                {t('tabs.currently_open_label')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {openTabs.map(tab => (
                  <div key={tab.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{tab.items.map(x => x.name).join(', ')}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>
                        {t('tabs.tab_opened_sub', { date: new Date(tab.opened_at).toLocaleDateString(), n: daysOpen(tab.opened_at) })}
                        {tab.last_reminder_at ? ` · ${t('tabs.last_nudged_sub', { date: new Date(tab.last_reminder_at).toLocaleDateString() })}` : ''}
                      </div>
                      {tab.note && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#75510e', background: 'var(--butter-soft, #fef3c7)', padding: '6px 10px', borderRadius: 8, display: 'inline-block' }}>
                          📝 {tab.note}
                        </div>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(tab.amount, currencySymbol)}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-soft btn-sm" onClick={() => onNudge(tab)} title={t('tabs.nudge_btn')}><MessageCircle size={13} /></button>
                      <button className="btn btn-primary btn-sm" onClick={() => onMarkPaid(tab)}>{t('tabs.mark_paid_btn')}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paid history */}
          {paidTabs.length > 0 && (
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>
                {t('tabs.paid_history_label')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {paidTabs.map(tab => (
                  <div key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: 'var(--surface-2)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--sage-soft)', color: '#4d6648', display: 'grid', placeItems: 'center' }}>
                      <Check size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{tab.items.map(x => x.name).join(', ')}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                        {t('tabs.paid_sub', {
                          opened: new Date(tab.opened_at).toLocaleDateString(),
                          paid: tab.paid_at ? new Date(tab.paid_at).toLocaleDateString() : '—',
                          method: tab.paid_method === 'bank_transfer' ? t('tabs.transfer') : t('tabs.cash'),
                        })}
                        {tab.tip_on_payback ? t('tabs.tip_suffix', { amount: formatCurrency(tab.tip_on_payback, currencySymbol) }) : ''}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--ink-2)' }}>
                      {formatCurrency(tab.amount, currencySymbol)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface OutstandingTabsSectionProps {
  currencySymbol: string;
}

export default function OutstandingTabsSection({ currencySymbol }: OutstandingTabsSectionProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [tabs, setTabs] = useState<OutstandingTab[]>([]);
  const [filter, setFilter] = useState<FilterType>('open');
  const [drawer, setDrawer] = useState<string | null>(null);
  const [paying, setPaying] = useState<OutstandingTab | null>(null);

  const fetchTabs = useCallback(async () => {
    try {
      const res = await tabsApi.list();
      setTabs(res.data);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => { fetchTabs(); }, [fetchTabs]);

  const open = tabs.filter(tab => tab.status !== 'paid');
  const reminded = tabs.filter(tab => tab.status === 'reminded');
  const totalOpen = open.reduce((s, tab) => s + tab.amount, 0);
  const oldest = open.reduce((max, tab) => Math.max(max, daysOpen(tab.opened_at)), 0);

  const visible = tabs.filter(tab => {
    if (filter === 'open') return tab.status !== 'paid';
    if (filter === 'reminded') return tab.status === 'reminded';
    return true;
  });

  const nudgeOne = async (tab: OutstandingTab) => {
    try {
      await tabsApi.remind(tab.id);
      toast.success(t('tabs.nudge_sent'));
      fetchTabs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('tabs.nudge_failed'));
    }
  };

  const nudgeAllOpen = async () => {
    const ids = open.map(tab => tab.id);
    if (!ids.length) return;
    try {
      await tabsApi.remindBulk(ids);
      toast.success(t('tabs.bulk_sent', { n: ids.length }));
      fetchTabs();
    } catch {
      toast.error(t('tabs.bulk_failed'));
    }
  };

  const completePayment = async (tab: OutstandingTab, method: 'cash' | 'bank_transfer', tipAmount: number) => {
    try {
      await tabsApi.markPaid(tab.id, method, tipAmount);
      toast.success(t('tabs.paid_success'));
      setPaying(null);
      fetchTabs();
    } catch {
      toast.error(t('tabs.paid_failed'));
      setPaying(null);
    }
  };

  if (!tabs.length && filter === 'open') return null;

  const statusBadge = (status: TabStatus) => {
    if (status === 'paid') return <span className="chip chip-success">{t('tabs.status_paid')}</span>;
    if (status === 'reminded') return <span className="chip chip-warn">{t('tabs.status_reminded')}</span>;
    return <span className="chip" style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)' }}>{t('tabs.status_open')}</span>;
  };

  return (
    <>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--line)',
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--butter-soft, #fef3c7)', color: '#8a6210', display: 'grid', placeItems: 'center' }}>
            <Receipt size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 17, letterSpacing: '-0.01em' }}>{t('tabs.section_title')}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
              {t('tabs.section_sub', { open: open.length, amount: formatCurrency(totalOpen, currencySymbol), oldest })}
            </div>
          </div>
          <div style={{ flex: 1 }} />

          {/* Filter segmented control */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 10 }}>
            {([
              { id: 'open' as FilterType, key: 'tabs.filter_open', n: open.length },
              { id: 'reminded' as FilterType, key: 'tabs.filter_reminded', n: reminded.length },
              { id: 'all' as FilterType, key: 'tabs.filter_all', n: tabs.length },
            ]).map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                border: 0,
                background: filter === f.id ? 'var(--surface)' : 'transparent',
                color: filter === f.id ? 'var(--ink)' : 'var(--ink-2)',
                padding: '6px 12px',
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 12.5,
                boxShadow: filter === f.id ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font)',
              }}>
                {t(f.key, { n: f.n })}
              </button>
            ))}
          </div>

          <button className="btn btn-accent btn-sm" onClick={nudgeAllOpen} disabled={!open.length}>
            <span style={{ fontSize: 13 }}>💬</span> {t('tabs.wa_all_open')}
          </button>
        </div>

        {/* Table */}
        {visible.length === 0 ? (
          <div style={{ padding: '48px 22px', textAlign: 'center', color: 'var(--ink-3)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🧾</div>
            <div style={{ fontWeight: 600, color: 'var(--ink-2)', fontSize: 14 }}>{t('tabs.no_tabs')}</div>
            <div style={{ fontSize: 12.5, marginTop: 4 }} dangerouslySetInnerHTML={{ __html: t('tabs.no_tabs_hint') }} />
          </div>
        ) : (
          <table className="tbl" style={{ borderRadius: 0 }}>
            <thead>
              <tr>
                <th>{t('tabs.col_customer')}</th>
                <th>{t('tabs.col_items')}</th>
                <th>{t('tabs.col_opened')}</th>
                <th>{t('tabs.col_status')}</th>
                <th>{t('tabs.col_amount')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(tab => (
                <tr key={tab.id}>
                  <td data-label={t('tabs.col_customer')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button
                        onClick={() => setDrawer(tab.customer_name ?? '')}
                        style={{
                          width: 36, height: 36, borderRadius: 11,
                          background: tab.status === 'paid' ? 'var(--sage-soft)' : 'var(--surface-2)',
                          color: tab.status === 'paid' ? '#4d6648' : 'var(--ink-2)',
                          fontWeight: 700, fontSize: 12, display: 'grid', placeItems: 'center',
                          border: 0, cursor: 'pointer',
                        }}
                      >
                        {initials(tab.customer_name)}
                      </button>
                      <div>
                        <button
                          onClick={() => setDrawer(tab.customer_name ?? '')}
                          style={{ border: 0, background: 'transparent', padding: 0, font: 'inherit', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                        >
                          {tab.customer_name ?? '—'}
                        </button>
                        {tab.customer_phone && (
                          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono, monospace)' }}>
                            {tab.customer_phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td data-label={t('tabs.col_items')} style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                    {tab.items.map(x => x.name).join(', ')}
                  </td>
                  <td data-label={t('tabs.col_opened')} style={{ fontSize: 12.5, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(tab.opened_at).toLocaleDateString()}
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{t('tabs.days_ago_short', { n: daysOpen(tab.opened_at) })}</div>
                  </td>
                  <td data-label={t('tabs.col_status')}>
                    {statusBadge(tab.status)}
                    {tab.last_reminder_at && tab.status !== 'paid' && (
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                        {t('tabs.last_nudged', { date: new Date(tab.last_reminder_at).toLocaleDateString() })}
                      </div>
                    )}
                  </td>
                  <td data-label={t('tabs.col_amount')} style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-display)' }}>
                    {formatCurrency(tab.amount, currencySymbol)}
                  </td>
                  <td data-label="Actions" style={{ textAlign: 'right' }}>
                    {tab.status !== 'paid' ? (
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button className="btn btn-soft btn-sm" onClick={() => nudgeOne(tab)} title={t('tabs.nudge_btn')}>
                          <MessageCircle size={13} /> {t('tabs.nudge_btn')}
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => setPaying(tab)}>
                          <Check size={13} /> {t('tabs.mark_paid_btn')}
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        {tab.paid_method === 'bank_transfer' ? t('tabs.transfer') : t('tabs.cash')}
                        {tab.tip_on_payback ? t('tabs.tip_suffix', { amount: formatCurrency(tab.tip_on_payback, currencySymbol) }) : ''}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Customer drawer */}
      {drawer && (() => {
        const customerTabs = tabs.filter(tab => tab.customer_name === drawer);
        return (
          <CustomerDrawer
            customerName={drawer}
            tabs={customerTabs}
            currencySymbol={currencySymbol}
            onClose={() => setDrawer(null)}
            onMarkPaid={(tab) => { setDrawer(null); setPaying(tab); }}
            onNudge={nudgeOne}
          />
        );
      })()}

      {/* Mark paid drawer */}
      {paying && (
        <MarkPaidDrawer
          tab={paying}
          currencySymbol={currencySymbol}
          onClose={() => setPaying(null)}
          onComplete={completePayment}
        />
      )}
    </>
  );
}
