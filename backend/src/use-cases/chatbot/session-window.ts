export function isInSessionWindow(lastInboundAtIso: string | null): boolean {
  if (!lastInboundAtIso) return false;

  const lastInbound = new Date(lastInboundAtIso);
  const now = new Date();
  const diffMs = now.getTime() - lastInbound.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours <= 24;
}
