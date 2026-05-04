interface Delta {
  direction?: 'up' | 'down' | 'neutral';
  text: string;
}

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: Delta;
}

export default function KpiCard({ label, value, delta }: KpiCardProps) {
  return (
    <div className="kpi">
      <span className="label">{label}</span>
      <span className="value">{value}</span>
      {delta && (
        <span className={['delta', delta.direction === 'up' ? 'up' : delta.direction === 'down' ? 'down' : ''].filter(Boolean).join(' ')}>
          {delta.text}
        </span>
      )}
    </div>
  );
}
