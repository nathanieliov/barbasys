import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
      <Icon size={48} style={{ opacity: 0.15, marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
      <p style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: description ? '0.5rem' : action ? '1.5rem' : 0 }}>{title}</p>
      {description && <p style={{ fontSize: '0.9rem', marginBottom: action ? '1.5rem' : 0 }}>{description}</p>}
      {action && <button onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}
