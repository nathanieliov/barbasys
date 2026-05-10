// ─── Barber Mode — shared types and pure utilities ────────────

export interface TicketItem {
  cartId: string;
  id: number;
  name: string;
  type: 'service' | 'product';
  price: number;
  qty: number;
  fromBooking?: boolean;
  durationMinutes?: number;
}

export interface ChairCustomer {
  id: number | null;
  name: string;
  initials: string;
  visitNumber: string;
  lastService: string;
  lastVisit: string;
  notes?: string | null;
  isWalkin?: boolean;
}

export interface ChairState {
  appointmentId: number | null;
  walkinQueueId: number | null;
  customer: ChairCustomer;
  startedAt: string;
  items: TicketItem[];
}

export type TipValidationResult =
  | { valid: true; value: number }
  | { valid: false; error: string };

// ─── Tip helpers ────────────────────────────────────────────

export function sanitizeTipInput(raw: string): string {
  let s = raw.replace(/[^\d.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }
  const dotIdx = s.indexOf('.');
  if (dotIdx !== -1 && s.length - dotIdx - 1 > 2) {
    s = s.slice(0, dotIdx + 3);
  }
  return s;
}

export function normalizeTipOnBlur(tipStr: string): string {
  const trimmed = tipStr.trim();
  if (trimmed === '' || trimmed === '.') return '0.00';
  const val = parseFloat(trimmed);
  if (isNaN(val) || val < 0) return '0.00';
  return val.toFixed(2);
}

export function validateTip(
  tipStr: string,
  subtotal: number,
  symbol = '$',
): TipValidationResult {
  const trimmed = tipStr.trim();
  if (trimmed === '' || trimmed === '.') return { valid: true, value: 0 };
  const val = parseFloat(trimmed);
  if (isNaN(val)) return { valid: true, value: 0 };
  if (val < 0) return { valid: false, error: "Tip can't be negative." };
  const cap = Math.max(50, subtotal);
  if (val > cap) {
    return { valid: false, error: `That's higher than this ticket. Max ${symbol}${cap.toFixed(2)}.` };
  }
  return { valid: true, value: val };
}

// ─── Ticket mutation ─────────────────────────────────────────

export function addTicketItem(
  ticket: TicketItem[],
  item: Omit<TicketItem, 'cartId' | 'qty'>,
): TicketItem[] {
  const cartId = `${item.type}-${item.id}`;
  const existing = ticket.find(t => t.cartId === cartId);
  if (existing) {
    return ticket.map(t => t.cartId === cartId ? { ...t, qty: t.qty + 1 } : t);
  }
  return [...ticket, { ...item, cartId, qty: 1 }];
}

export function removeTicketItem(ticket: TicketItem[], cartId: string): TicketItem[] {
  return ticket.filter(t => t.cartId !== cartId);
}

export function ticketSubtotal(ticket: TicketItem[]): number {
  return ticket.reduce((sum, t) => sum + t.price * t.qty, 0);
}

// ─── Display helpers ──────────────────────────────────────────

const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

export function ordinalVisit(n: number): string {
  return `${ORDINALS[n] ?? `${n}th`} visit`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(p => p[0] ?? '')
    .join('')
    .toUpperCase();
}

export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? 's' : ''} ago`;
}

export function elapsedSince(isoString: string): string {
  const mins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60_000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function minutesUntil(isoString: string): number {
  return Math.max(0, Math.ceil((new Date(isoString).getTime() - Date.now()) / 60_000));
}

export function formatStartedAt(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function liveTime(): string {
  return new Date().toLocaleTimeString('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// ─── Barber avatar tone palette ───────────────────────────────

const TONE_PALETTE = ['#e07856', '#8fa888', '#f4cf7a', '#a07391', '#5b9bd5'];

export function barberTone(id: number): string {
  return TONE_PALETTE[(id - 1) % TONE_PALETTE.length];
}

// ─── Chair persistence (localStorage) ────────────────────────

const CHAIR_KEY = 'barber_mode_chair';

export function persistChair(state: ChairState | null): void {
  if (state === null) {
    localStorage.removeItem(CHAIR_KEY);
  } else {
    localStorage.setItem(CHAIR_KEY, JSON.stringify(state));
  }
}

export function loadChair(): ChairState | null {
  try {
    const raw = localStorage.getItem(CHAIR_KEY);
    return raw ? (JSON.parse(raw) as ChairState) : null;
  } catch {
    return null;
  }
}
