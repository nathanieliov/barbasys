import { useState, useEffect, useCallback } from 'react';
import { Receipt, MessageCircle, Check, X } from 'lucide-react';
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

function reliabilityBadge(tabs: OutstandingTab[]): { label: string; bg: string; color: string } {
  const open = tabs.filter(t => t.status !== 'paid');
  const paid = tabs.filter(t => t.status === 'paid');
  if (paid.length > 0 && open.length === 0) {
    return { label: 'Reliable', bg: 'var(--sage-soft)', color: '#4d6648' };
  }
  if (open.some(t => daysOpen(t.opened_at) > 5)) {
    return { label: 'Slow payer', bg: 'var(--primary-soft)', color: 'var(--primary-deep)' };
  }
  return { label: 'On track', bg: 'var(--butter-soft, #fef3c7)', color: '#8a6210' };
}

// ─── Mark-paid drawer ─────────────────────────────────────────────────────────

interface MarkPaidDrawerProps {
  tab: OutstandingTab;
  currencySymbol: string;
  onClose: () => void;
  onComplete: (tab: OutstandingTab, method: 'cash' | 'bank_transfer', tip: number) => void;
}

function MarkPaidDrawer({ tab, currencySymbol, onClose, onComplete }: MarkPaidDrawerProps) {
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
            Mark paid
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
                Tab opened {new Date(tab.opened_at).toLocaleDateString()} · {daysOpen(tab.opened_at)}d ago
              </div>
            </div>
          </div>

          {/* Original ticket */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
              Original ticket
            </div>
            {tab.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13.5, color: 'var(--ink-2)' }}>
                <span>{it.name}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(it.price, currencySymbol)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 6, borderTop: '1px dashed var(--line)', fontSize: 14, fontWeight: 700 }}>
              <span>Owed</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(tab.amount, currencySymbol)}
              </span>
            </div>
          </div>

          {/* Method */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Method</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([['cash', '💵', 'Cash'], ['bank_transfer', '🏦', 'Bank transfer']] as const).map(([id, emoji, label]) => (
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
              Tip <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span>
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
                  {pct === 0 ? 'None' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Total */}
          <div style={{ background: 'var(--ink)', color: 'var(--bg)', borderRadius: 14, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Charge</div>
              {tipPct > 0 && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{formatCurrency(tab.amount, currencySymbol)} + {formatCurrency(tipAmt, currencySymbol)} tip</div>}
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
            {phase === 'select' ? `Confirm ${method === 'cash' ? 'cash' : 'transfer'} received` : 'Processing…'}
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
  const open = tabs.filter(t => t.status !== 'paid');
  const paid = tabs.filter(t => t.status === 'paid');
  const totalOpen = open.reduce((s, t) => s + t.amount, 0);
  const totalLifetime = tabs.reduce((s, t) => s + t.amount, 0);
  const badge = reliabilityBadge(tabs);

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
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Customer</div>
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
              { label: 'Open now', value: formatCurrency(totalOpen, currencySymbol) },
              { label: 'Tabs all-time', value: String(tabs.length) },
              { label: 'Total billed', value: formatCurrency(totalLifetime, currencySymbol) },
            ].map(k => (
              <div key={k.label} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>{k.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Open tabs */}
          {open.length > 0 && (
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--primary-deep)', marginBottom: 10 }}>
                Currently open
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {open.map(t => (
                  <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.items.map(x => x.name).join(', ')}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>
                        Opened {new Date(t.opened_at).toLocaleDateString()} · {daysOpen(t.opened_at)}d ago
                        {t.last_reminder_at ? ` · last nudged ${new Date(t.last_reminder_at).toLocaleDateString()}` : ''}
                      </div>
                      {t.note && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#75510e', background: 'var(--butter-soft, #fef3c7)', padding: '6px 10px', borderRadius: 8, display: 'inline-block' }}>
                          📝 {t.note}
                        </div>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(t.amount, currencySymbol)}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => onNudge(t)} className="btn btn-soft btn-sm" title="Send WhatsApp"><MessageCircle size={13} /></button>
                      <button onClick={() => onMarkPaid(t)} className="btn btn-primary btn-sm">Mark paid</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paid history */}
          {paid.length > 0 && (
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>
                Paid history
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {paid.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: 'var(--surface-2)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--sage-soft)', color: '#4d6648', display: 'grid', placeItems: 'center' }}>
                      <Check size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{t.items.map(x => x.name).join(', ')}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                        Opened {new Date(t.opened_at).toLocaleDateString()} · paid {t.paid_at ? new Date(t.paid_at).toLocaleDateString() : '—'} · {t.paid_method ?? '—'}
                        {t.tip_on_payback ? ` · +${formatCurrency(t.tip_on_payback, currencySymbol)} tip` : ''}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--ink-2)' }}>
                      {formatCurrency(t.amount, currencySymbol)}
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

  const open = tabs.filter(t => t.status !== 'paid');
  const reminded = tabs.filter(t => t.status === 'reminded');
  const totalOpen = open.reduce((s, t) => s + t.amount, 0);
  const oldest = open.reduce((max, t) => Math.max(max, daysOpen(t.opened_at)), 0);

  const visible = tabs.filter(t => {
    if (filter === 'open') return t.status !== 'paid';
    if (filter === 'reminded') return t.status === 'reminded';
    return true;
  });

  const nudgeOne = async (tab: OutstandingTab) => {
    try {
      await tabsApi.remind(tab.id);
      toast.success('Reminder sent via WhatsApp');
      fetchTabs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not send reminder';
      toast.error(msg);
    }
  };

  const nudgeAllOpen = async () => {
    const ids = open.map(t => t.id);
    if (!ids.length) return;
    try {
      await tabsApi.remindBulk(ids);
      toast.success(`Reminders sent to ${ids.length} customers`);
      fetchTabs();
    } catch {
      toast.error('Could not send bulk reminders');
    }
  };

  const completePayment = async (tab: OutstandingTab, method: 'cash' | 'bank_transfer', tipAmount: number) => {
    try {
      await tabsApi.markPaid(tab.id, method, tipAmount);
      toast.success('Tab marked as paid');
      setPaying(null);
      fetchTabs();
    } catch {
      toast.error('Could not complete payment');
      setPaying(null);
    }
  };

  if (!tabs.length && filter === 'open') return null;

  const statusBadge = (status: TabStatus) => {
    if (status === 'paid') return <span className="chip chip-success">Paid</span>;
    if (status === 'reminded') return <span className="chip chip-warn">Reminded</span>;
    return <span className="chip" style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)' }}>Open</span>;
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
            <div style={{ fontWeight: 600, fontSize: 17, letterSpacing: '-0.01em' }}>Outstanding tabs</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
              {open.length} open · {formatCurrency(totalOpen, currencySymbol)} owed · oldest {oldest}d
            </div>
          </div>
          <div style={{ flex: 1 }} />

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 10 }}>
            {([
              { id: 'open' as FilterType, label: `Open · ${open.length}` },
              { id: 'reminded' as FilterType, label: `Reminded · ${reminded.length}` },
              { id: 'all' as FilterType, label: `All · ${tabs.length}` },
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
                {f.label}
              </button>
            ))}
          </div>

          <button
            className="btn btn-accent btn-sm"
            onClick={nudgeAllOpen}
            disabled={!open.length}
          >
            <span style={{ fontSize: 13 }}>💬</span> WhatsApp all open
          </button>
        </div>

        {/* Table */}
        {visible.length === 0 ? (
          <div style={{ padding: '48px 22px', textAlign: 'center', color: 'var(--ink-3)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🧾</div>
            <div style={{ fontWeight: 600, color: 'var(--ink-2)', fontSize: 14 }}>No tabs in this view</div>
            <div style={{ fontSize: 12.5, marginTop: 4 }}>Filter by <b>All</b> to see closed tabs.</div>
          </div>
        ) : (
          <table className="tbl" style={{ borderRadius: 0 }}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Items</th>
                <th>Opened</th>
                <th>Status</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(t => (
                <tr key={t.id}>
                  <td data-label="Customer">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button
                        onClick={() => setDrawer(t.customer_name ?? '')}
                        style={{
                          width: 36, height: 36, borderRadius: 11,
                          background: t.status === 'paid' ? 'var(--sage-soft)' : 'var(--surface-2)',
                          color: t.status === 'paid' ? '#4d6648' : 'var(--ink-2)',
                          fontWeight: 700, fontSize: 12, display: 'grid', placeItems: 'center',
                          border: 0, cursor: 'pointer',
                        }}
                      >
                        {initials(t.customer_name)}
                      </button>
                      <div>
                        <button
                          onClick={() => setDrawer(t.customer_name ?? '')}
                          style={{ border: 0, background: 'transparent', padding: 0, font: 'inherit', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                        >
                          {t.customer_name ?? '—'}
                        </button>
                        {t.customer_phone && (
                          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono, monospace)' }}>
                            {t.customer_phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td data-label="Items" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                    {t.items.map(x => x.name).join(', ')}
                  </td>
                  <td data-label="Opened" style={{ fontSize: 12.5, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(t.opened_at).toLocaleDateString()}
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{daysOpen(t.opened_at)}d ago</div>
                  </td>
                  <td data-label="Status">
                    {statusBadge(t.status)}
                    {t.last_reminder_at && t.status !== 'paid' && (
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                        last {new Date(t.last_reminder_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td data-label="Amount" style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-display)' }}>
                    {formatCurrency(t.amount, currencySymbol)}
                  </td>
                  <td data-label="Actions" style={{ textAlign: 'right' }}>
                    {t.status !== 'paid' ? (
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button className="btn btn-soft btn-sm" onClick={() => nudgeOne(t)} title="Send WhatsApp reminder">
                          <MessageCircle size={13} /> Nudge
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => setPaying(t)} title="Reopen ticket and take payment">
                          <Check size={13} /> Mark paid
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        {t.paid_method === 'bank_transfer' ? 'Transfer' : 'Cash'}
                        {t.tip_on_payback ? ` · +${formatCurrency(t.tip_on_payback, currencySymbol)} tip` : ''}
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
        const customerTabs = tabs.filter(t => t.customer_name === drawer);
        return (
          <CustomerDrawer
            customerName={drawer}
            tabs={customerTabs}
            currencySymbol={currencySymbol}
            onClose={() => setDrawer(null)}
            onMarkPaid={(t) => { setDrawer(null); setPaying(t); }}
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
