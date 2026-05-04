import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: string | number;
  shadow?: 'sm' | 'md' | 'lg' | 'none';
}

export default function Card({ children, padding, shadow = 'sm', className = '', style, ...props }: CardProps) {
  const shadowVar = shadow === 'none' ? 'none' : shadow === 'md' ? 'var(--shadow)' : shadow === 'lg' ? 'var(--shadow-lg)' : 'var(--shadow-sm)';
  return (
    <div
      className={['card', className].filter(Boolean).join(' ')}
      style={{ padding: padding ?? undefined, boxShadow: shadowVar, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
