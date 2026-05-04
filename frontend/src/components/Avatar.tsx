interface AvatarProps {
  initials: string;
  tone?: string;
  size?: number;
  className?: string;
}

export default function Avatar({ initials, tone, size = 36, className = '' }: AvatarProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: tone ?? 'var(--surface-2)',
        color: tone ? '#fff' : 'var(--ink-2)',
        display: 'grid',
        placeItems: 'center',
        fontWeight: 700,
        fontSize: size * 0.32,
        letterSpacing: '-0.02em',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}
