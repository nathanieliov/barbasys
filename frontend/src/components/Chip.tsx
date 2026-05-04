import { HTMLAttributes, ReactNode } from 'react';

type ChipVariant = 'default' | 'success' | 'warn' | 'primary' | 'plum';

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  dot?: boolean;
  children: ReactNode;
}

const variantClass: Record<ChipVariant, string> = {
  default: '',
  success: 'chip-success',
  warn:    'chip-warn',
  primary: 'chip-primary',
  plum:    'chip-plum',
};

export default function Chip({ variant = 'default', dot, children, className = '', ...props }: ChipProps) {
  const cls = ['chip', variantClass[variant], dot ? 'dot' : '', className].filter(Boolean).join(' ');
  return (
    <span className={cls} {...props}>
      {children}
    </span>
  );
}
