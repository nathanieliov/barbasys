import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, Clock, Plus } from 'lucide-react';
import apiClient from '../api/apiClient';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils/format';
import Modal from '../components/Modal';
import BarberChairCard from '../components/BarberChairCard';
import BarberAddItemSheet from '../components/BarberAddItemSheet';
import BarberPaymentSheet from '../components/BarberPaymentSheet';
import NewTabSheet from '../components/NewTabSheet';
import WalkinBlockedSheet from '../components/WalkinBlockedSheet';
import OpenTabsCard from '../components/OpenTabsCard';
import DailyNudgeSheet, { shouldShowDailyNudge, dismissDailyNudge } from '../components/DailyNudgeSheet';
import { tabsApi } from '../api/tabsApi';
import type { OutstandingTab } from '@barbasys/shared';
import '../styles/barber-mode.css';
import {
  addTicketItem,
  removeTicketItem,
  persistChair,
  loadChair,
  barberTone,
  getInitials,
  ordinalVisit,
  timeAgo,
  liveTime,
  minutesUntil,
  type ChairState,
  type TicketItem,
} from '../utils/barber-mode';

// ─── Types ───────────────────────────────────────────────────

interface Appointment {
  id: number;
  barber_id: number;
  customer_id: number | null;
  customer_name: string | null;
  start_time: string;
  services_summary: string | null;
  status: string;
}

interface WalkinEntry {
  id: number;
  shop_id: number;
  description: string;
  wanted_service: string | null;
  wait_since: string;
}

interface CatalogItem {
  id: number;
  name: string;
  price: number;
  duration_minutes?: number;
  category?: string;
  stock?: number;
}

// ─── Helpers ─────────────────────────────────────────────────


// ─── Local toast ──────────────────────────────────────────────

function LocalToast({ message }: { message: string }) {
  return <div className="bm-toast">{message}</div>;
}

// ─── Up-next card ─────────────────────────────────────────────

function UpNextCard({
  appt,
  onTake,
}: {
  appt: Appointment;
  onTake: (appt: Appointment) => void;
}) {
  const minsAway = minutesUntil(appt.start_time);
  const timeLabel = new Date(appt.start_time).toLocaleTimeString('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div
      onClick={() => onTake(appt)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onTake(appt)}
      style={{
        minWidth: 220,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 18,
        padding: 14,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {timeLabel}
        </span>
        {minsAway <= 60 && (
          <span
            style={{
              background: 'var(--primary-soft)',
              color: 'var(--primary-deep)',
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            in {minsAway}m
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 14.5,
          fontWeight: 700,
          color: 'var(--ink)',
          marginBottom: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {appt.customer_name ?? 'Guest'}
      </div>
      {appt.services_summary && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--ink-3)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {appt.services_summary}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

export default function BarberMode() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { error: toastError } = useToast();
  const navigate = useNavigate();

  const currencySymbol = settings.currency_symbol || '$';
  const taxRate = parseFloat(settings.default_tax_rate || '0');

  // ── Data state
  const [agenda, setAgenda] = useState<Appointment[]>([]);
  const [services, setServices] = useState<CatalogItem[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [walkinQueue, setWalkinQueue] = useState<WalkinEntry[]>([]);
  const [myDayCuts, setMyDayCuts] = useState(0);
  const [myDayEarned, setMyDayEarned] = useState(0);
  const [recentServiceIds, setRecentServiceIds] = useState<number[]>([]);
  const [recentProductIds, setRecentProductIds] = useState<number[]>([]);

  // ── Chair (persistent)
  const [chairState, setChairState] = useState<ChairState | null>(loadChair);

  // ── UI state
  const [sheet, setSheet] = useState<null | 'service' | 'product' | 'pay'>(null);
  const [localToast, setLocalToast] = useState<string | null>(null);
  // ── Tabs state
  const [myTabs, setMyTabs] = useState<OutstandingTab[]>([]);
  const [showNewTab, setShowNewTab] = useState(false);
  const [showWalkinBlock, setShowWalkinBlock] = useState(false);
  const [showDailyNudge, setShowDailyNudge] = useState(false);
  const [time, setTime] = useState(liveTime);
  const [showLogWalkin, setShowLogWalkin] = useState(false);
  const [walkinDesc, setWalkinDesc] = useState('');
  const [walkinService, setWalkinService] = useState('');
  const [loggingWalkin, setLoggingWalkin] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Live clock
  useEffect(() => {
    const id = setInterval(() => setTime(liveTime()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Initial data load
  const fetchAgenda = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const res = await apiClient.get(`/appointments?date=${today}`);
      setAgenda((res.data as Appointment[]).filter(a => a.status !== 'CANCELLED'));
    } catch {
      // agenda unavailable, keep empty
    }
  }, []);

  const fetchMyDayStats = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const res = await apiClient.get(`/sales?startDate=${today}&endDate=${today}`);
      const sales: { total_amount: number }[] = res.data;
      setMyDayCuts(sales.length);
      setMyDayEarned(sales.reduce((s, x) => s + (x.total_amount ?? 0), 0));
    } catch {
      // keep 0s
    }
  }, []);

  const fetchWalkinQueue = useCallback(async () => {
    try {
      const res = await apiClient.get('/walkin-queue');
      setWalkinQueue(res.data as WalkinEntry[]);
    } catch {
      // stub: walk-in queue not yet deployed — stays empty
    }
  }, []);

  const fetchMyTabs = useCallback(async () => {
    if (!user?.barber_id) return;
    try {
      const res = await tabsApi.list({ barberId: user.barber_id });
      setMyTabs(res.data);
      // Show daily nudge if eligible
      if (shouldShowDailyNudge(res.data)) {
        setShowDailyNudge(true);
      }
    } catch {
      // tabs unavailable
    }
  }, [user?.barber_id]);

  useEffect(() => {
    Promise.all([
      fetchAgenda(),
      fetchMyDayStats(),
      fetchWalkinQueue(),
      fetchMyTabs(),
      apiClient.get('/services').then(r => setServices(r.data)).catch(() => {}),
      apiClient.get('/inventory').then(r => setProducts(r.data)).catch(() => {}),
    ]);
  }, [fetchAgenda, fetchMyDayStats, fetchWalkinQueue, fetchMyTabs]);

  // Poll walk-in queue every 30s
  useEffect(() => {
    const id = setInterval(fetchWalkinQueue, 30_000);
    return () => clearInterval(id);
  }, [fetchWalkinQueue]);

  // ── Toast helper
  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setLocalToast(msg);
    toastTimer.current = setTimeout(() => setLocalToast(null), 2000);
  };

  // ── Barber avatar tone
  const barberToneColor = user?.barber_id ? barberTone(user.barber_id) : 'var(--primary)';
  const barberName = (user?.fullname || user?.username || 'Me').split(' ')[0];
  const barberInitials = getInitials(user?.fullname || user?.username || 'M');

  // ── Take appointment from agenda → loads into chair
  const takeFromAgenda = async (appt: Appointment) => {
    if (chairState) {
      showToast(`${appt.customer_name ?? 'Guest'} loaded — finish current first`);
      return;
    }
    try {
      // Fetch appointment items (booked services)
      const [itemsRes, customerHistory] = await Promise.all([
        apiClient.get(`/appointments/${appt.id}/items`).catch(() => ({ data: [] })),
        appt.customer_id
          ? apiClient.get(`/customers/${appt.customer_id}/history`).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);

      const bookedItems: TicketItem[] = (itemsRes.data as {
        service_id: number;
        name: string;
        price: number;
        duration_minutes?: number;
        quantity?: number;
      }[]).map(item => ({
        cartId: `service-${item.service_id}`,
        id: item.service_id,
        name: item.name,
        type: 'service' as const,
        price: item.price,
        qty: item.quantity ?? 1,
        fromBooking: true,
        durationMinutes: item.duration_minutes,
      }));

      const history: { timestamp: string; services: string | null }[] = customerHistory.data;
      const visitCount = history.length;
      const lastSale = history[0];

      const newChair: ChairState = {
        appointmentId: appt.id,
        walkinQueueId: null,
        customer: {
          id: appt.customer_id,
          name: appt.customer_name ?? 'Guest',
          initials: getInitials(appt.customer_name ?? 'Guest'),
          visitNumber: ordinalVisit(visitCount + 1),
          lastService: lastSale?.services?.split(',')[0]?.trim() || '—',
          lastVisit: lastSale ? timeAgo(lastSale.timestamp) : '—',
          notes: null,
          isWalkin: false,
        },
        startedAt: new Date().toISOString(),
        items: bookedItems,
      };

      setChairState(newChair);
      persistChair(newChair);
      // Remove from agenda view (still exists in backend)
      setAgenda(prev => prev.filter(a => a.id !== appt.id));
    } catch {
      toastError('Could not load appointment.');
    }
  };

  // ── Take walk-in → loads into chair
  const takeWalkin = async (entry: WalkinEntry) => {
    const newChair: ChairState = {
      appointmentId: null,
      walkinQueueId: entry.id,
      customer: {
        id: null,
        name: entry.description,
        initials: getInitials(entry.description),
        visitNumber: 'Walk-in',
        lastService: entry.wanted_service ?? '—',
        lastVisit: '—',
        notes: null,
        isWalkin: true,
      },
      startedAt: new Date().toISOString(),
      items: [],
    };

    setChairState(newChair);
    persistChair(newChair);
    setWalkinQueue(prev => prev.filter(w => w.id !== entry.id));

    try {
      await apiClient.delete(`/walkin-queue/${entry.id}`);
    } catch {
      // best-effort; local state already updated
    }
  };

  // ── Add item to ticket
  const handleAddItem = (item: CatalogItem, type: 'service' | 'product') => {
    if (!chairState) return;
    const updated = {
      ...chairState,
      items: addTicketItem(chairState.items, {
        id: item.id,
        name: item.name,
        type,
        price: item.price,
        durationMinutes: item.duration_minutes,
      }),
    };
    setChairState(updated);
    persistChair(updated);

    if (type === 'service') {
      setRecentServiceIds(prev => [item.id, ...prev.filter(id => id !== item.id)].slice(0, 5));
    } else {
      setRecentProductIds(prev => [item.id, ...prev.filter(id => id !== item.id)].slice(0, 5));
    }

    showToast(`${t('barber_mode.added')} ${item.name}`);
  };

  // ── Remove item from ticket
  const handleRemoveItem = (cartId: string) => {
    if (!chairState) return;
    const updated = { ...chairState, items: removeTicketItem(chairState.items, cartId) };
    setChairState(updated);
    persistChair(updated);
  };

  // ── Submit payment via existing /sales endpoint
  const handleCharge = async (args: {
    barberId: number;
    items: TicketItem[];
    tipAmount: number;
    paymentMethod: string;
    appointmentId: number | null;
  }) => {
    await apiClient.post('/sales', {
      barber_id: args.barberId,
      items: args.items.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        price: i.price,
        quantity: i.qty,
      })),
      tip_amount: args.tipAmount,
      discount_amount: 0,
      payment_method: args.paymentMethod,
      appointment_id: args.appointmentId ?? undefined,
    });
  };

  // ── After successful payment
  const handlePaymentSuccess = (_tipValue: number) => {
    setChairState(null);
    persistChair(null);

    // Auto-advance: take next appointment
    const next = agenda[0];
    if (next) {
      showToast(t('barber_mode.walkin_closed_next'));
      // Brief delay so toast is readable before chair card swaps
      setTimeout(() => takeFromAgenda(next), 300);
    } else {
      showToast(t('barber_mode.walkin_closed_empty'));
    }

    fetchMyDayStats();
  };

  // ── Open tab handlers
  const handleOpenTab = () => {
    if (!chairState) return;
    if (chairState.customer.isWalkin || !chairState.customer.id) {
      setShowWalkinBlock(true);
    } else {
      setShowNewTab(true);
    }
  };

  const handleConfirmTab = async (data: {
    customerId: number;
    name: string;
    phone: string;
    note: string;
    items: import('@barbasys/shared').TabItem[];
    amount: number;
  }) => {
    if (!user?.barber_id || !user?.shop_id) return;
    try {
      await tabsApi.create({
        customerId: data.customerId,
        barberId: user.barber_id,
        items: data.items,
        amount: data.amount,
        note: data.note || null,
        shopId: user.shop_id,
      });
      setShowNewTab(false);
      setSheet(null);
      // Clear chair
      setChairState(null);
      persistChair(null);
      showToast(t('tabs.tab_opened_toast'));
      fetchMyTabs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('tabs.tab_open_failed');
      toastError(msg);
    }
  };

  const handleNudgeOne = async (tab: OutstandingTab) => {
    try {
      await tabsApi.remind(tab.id);
      showToast(t('tabs.nudge_sent'));
      fetchMyTabs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('tabs.nudge_failed');
      toastError(msg);
    }
  };

  const handleNudgeAll = async () => {
    const openIds = myTabs.filter(t => t.status !== 'paid').map(t => t.id);
    if (!openIds.length) return;
    try {
      await tabsApi.remindBulk(openIds);
      showToast(t('tabs.bulk_sent', { n: openIds.length }));
      fetchMyTabs();
    } catch {
      toastError(t('tabs.bulk_failed'));
    }
  };

  const handleMarkTabPaid = async (tab: OutstandingTab) => {
    if (!user?.shop_id) return;
    try {
      await tabsApi.markPaid(tab.id, 'cash', 0);
      showToast(t('tabs.paid_success'));
      fetchMyTabs();
    } catch {
      toastError(t('tabs.paid_failed'));
    }
  };

  // ── Log walk-in
  const handleLogWalkin = async () => {
    if (!walkinDesc.trim()) return;
    setLoggingWalkin(true);
    try {
      await apiClient.post('/walkin-queue', {
        description: walkinDesc.trim(),
        wanted_service: walkinService.trim() || null,
      });
      await fetchWalkinQueue();
      setShowLogWalkin(false);
      setWalkinDesc('');
      setWalkinService('');
    } catch {
      toastError('Could not log walk-in.');
    } finally {
      setLoggingWalkin(false);
    }
  };

  const upcomingAgenda = agenda.filter(a => !chairState || a.id !== chairState.appointmentId);

  return (
    <div className="barber-mode-root">
      {/* ── Header ── */}
      <div
        style={{
          padding: '60px 18px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: barberToneColor,
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--font)',
              boxShadow: `0 0 0 2px var(--surface), 0 0 0 3.5px ${barberToneColor}`,
              flexShrink: 0,
            }}
          >
            {barberInitials}
          </div>
          <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
            <div
              style={{
                fontSize: 14.5,
                fontWeight: 700,
                color: 'var(--ink)',
                letterSpacing: '-0.01em',
              }}
            >
              {barberName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>
              On chair · Barber Mode
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--ink)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.01em',
          }}
        >
          {time}
        </div>

        <button
          onClick={() => { logout(); navigate('/login'); }}
          title={t('barber_mode.exit_barber_mode')}
          style={{
            border: 0,
            background: 'var(--surface-2)',
            borderRadius: '50%',
            width: 36,
            height: 36,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            color: 'var(--ink-3)',
          }}
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* ── In-your-chair card ── */}
      <BarberChairCard
        chairState={chairState}
        currencySymbol={currencySymbol}
        onAddService={() => setSheet('service')}
        onAddProduct={() => setSheet('product')}
        onCharge={() => setSheet('pay')}
        onRemove={handleRemoveItem}
      />

      {/* ── Up next ── */}
      {upcomingAgenda.length > 0 && (
        <div style={{ margin: '18px 18px 0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 17,
                fontWeight: 600,
                color: 'var(--ink)',
                letterSpacing: '-0.01em',
              }}
            >
              {t('barber_mode.up_next')}
            </span>
            {upcomingAgenda.length > 1 && (
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-3)' }}>
                {upcomingAgenda.length - 1} {t('barber_mode.more_today')}
              </span>
            )}
          </div>
          <div className="bm-up-next-scroll">
            {upcomingAgenda.map(appt => (
              <UpNextCard
                key={appt.id}
                appt={appt}
                onTake={takeFromAgenda}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Open tabs card ── */}
      <div style={{ margin: '0 18px' }}>
        <OpenTabsCard
          tabs={myTabs}
          currencySymbol={currencySymbol}
          onNudgeAll={handleNudgeAll}
          onNudgeOne={handleNudgeOne}
          onMarkPaid={handleMarkTabPaid}
        />
      </div>

      {/* ── Walk-ins waiting ── */}
      <div
        style={{
          margin: '16px 18px 0',
          background: 'var(--surface)',
          borderRadius: 18,
          border: '1px solid var(--line)',
          padding: '14px 16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: walkinQueue.length > 0 ? 14 : 0,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--ink)',
            }}
          >
            {t('barber_mode.walkins_waiting')}
          </span>
          {walkinQueue.length > 0 && (
            <span
              style={{
                background: 'var(--primary)',
                color: '#fff',
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {walkinQueue.length}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setShowLogWalkin(true)}
            style={{
              border: '1px solid var(--line)',
              background: 'transparent',
              borderRadius: 'var(--r)',
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ink-2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontFamily: 'var(--font)',
            }}
          >
            <Plus size={12} /> {t('barber_mode.log_walkin')}
          </button>
        </div>

        {walkinQueue.map((entry, idx) => {
          const waitMins = Math.floor(
            (Date.now() - new Date(entry.wait_since).getTime()) / 60_000,
          );
          return (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                paddingTop: idx > 0 ? 12 : 0,
                borderTop: idx > 0 ? '1px solid var(--line)' : undefined,
                paddingBottom: 0,
              }}
            >
              {/* Placeholder tile */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'var(--surface-3)',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--ink-3)',
                  flexShrink: 0,
                }}
              >
                W{idx + 1}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {entry.description}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 }}>
                  <Clock size={10} style={{ verticalAlign: 'middle' }} /> {waitMins}m ·{' '}
                  {entry.wanted_service || '—'}
                </div>
              </div>

              <button
                onClick={() => takeWalkin(entry)}
                style={{
                  background: 'var(--primary)',
                  color: '#fff',
                  border: 0,
                  borderRadius: 999,
                  padding: '5px 14px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  flexShrink: 0,
                }}
              >
                {t('barber_mode.take')}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── My-day stats ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
          margin: '16px 18px 32px',
        }}
      >
        {[
          { label: t('barber_mode.cuts_done'), value: String(myDayCuts) },
          { label: t('barber_mode.earned'), value: formatCurrency(myDayEarned, currencySymbol) },
          { label: t('barber_mode.until_close'), value: '—' },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: '12px 10px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, marginBottom: 4 }}>
              {label}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--ink)',
                letterSpacing: '-0.015em',
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Add service/product sheet ── */}
      <BarberAddItemSheet
        isOpen={sheet === 'service'}
        mode="service"
        items={services}
        recentIds={recentServiceIds}
        currencySymbol={currencySymbol}
        onClose={() => setSheet(null)}
        onAdd={item => handleAddItem(item, 'service')}
      />
      <BarberAddItemSheet
        isOpen={sheet === 'product'}
        mode="product"
        items={products}
        recentIds={recentProductIds}
        currencySymbol={currencySymbol}
        onClose={() => setSheet(null)}
        onAdd={item => handleAddItem(item, 'product')}
      />

      {/* ── Payment sheet ── */}
      <BarberPaymentSheet
        isOpen={sheet === 'pay'}
        items={chairState?.items ?? []}
        currencySymbol={currencySymbol}
        taxRate={taxRate}
        barberId={user?.barber_id ?? null}
        appointmentId={chairState?.appointmentId ?? null}
        isWalkin={chairState?.customer.isWalkin ?? false}
        onClose={() => setSheet(null)}
        onSuccess={handlePaymentSuccess}
        onOpenTab={handleOpenTab}
        onCharge={handleCharge}
      />

      {/* ── New tab sheet ── */}
      <NewTabSheet
        isOpen={showNewTab}
        onClose={() => setShowNewTab(false)}
        onConfirm={handleConfirmTab}
        total={chairState ? chairState.items.reduce((s, i) => s + i.price * i.qty, 0) : 0}
        currencySymbol={currencySymbol}
        items={chairState?.items ?? []}
        customer={chairState?.customer.id != null ? {
          id: chairState.customer.id,
          name: chairState.customer.name,
          phone: null,
        } : null}
      />

      {/* ── Walk-in blocked sheet ── */}
      <WalkinBlockedSheet
        isOpen={showWalkinBlock}
        onClose={() => setShowWalkinBlock(false)}
      />

      {/* ── Daily nudge sheet ── */}
      <DailyNudgeSheet
        isOpen={showDailyNudge}
        onClose={() => { dismissDailyNudge(); setShowDailyNudge(false); }}
        onSendAll={async (tabIds) => {
          try {
            await tabsApi.remindBulk(tabIds);
            fetchMyTabs();
          } catch { /* best-effort */ }
        }}
        tabs={myTabs}
        currencySymbol={currencySymbol}
        barberName={barberName}
      />

      {/* ── Log walk-in modal ── */}
      <Modal
        isOpen={showLogWalkin}
        onClose={() => { setShowLogWalkin(false); setWalkinDesc(''); setWalkinService(''); }}
        title={t('barber_mode.log_walkin_title')}
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              className="btn btn-soft btn-sm"
              onClick={() => setShowLogWalkin(false)}
            >
              {t('common.cancel')}
            </button>
            <button
              className="btn btn-primary btn-sm"
              disabled={!walkinDesc.trim() || loggingWalkin}
              onClick={handleLogWalkin}
            >
              {t('barber_mode.log')}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label className="field-label">{t('barber_mode.walkin_description')}</label>
            <input
              className="input"
              type="text"
              placeholder={t('barber_mode.walkin_description_placeholder')}
              value={walkinDesc}
              onChange={e => setWalkinDesc(e.target.value)}
              autoFocus
            />
          </div>
          <div className="field">
            <label className="field-label">{t('barber_mode.walkin_wanted_service')}</label>
            <input
              className="input"
              type="text"
              placeholder={t('barber_mode.search_placeholder')}
              value={walkinService}
              onChange={e => setWalkinService(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* ── Inline toast ── */}
      {localToast && <LocalToast message={localToast} />}
    </div>
  );
}
