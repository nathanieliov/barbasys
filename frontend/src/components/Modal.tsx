import { useEffect, useRef, useId, ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
  closeOnOverlay?: boolean;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer, closeOnOverlay = true }: ModalProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocus.current = document.activeElement;
    document.body.style.overflow = 'hidden';

    const el = dialogRef.current;
    const focusable = el ? Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    focusable[0]?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !el) return;
      const all = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(f => !f.closest('[hidden]'));
      if (all.length === 0) return;
      const first = all[0], last = all[all.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
      (previousFocus.current as HTMLElement | null)?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxW = size === 'sm' ? '380px' : size === 'lg' ? '720px' : '520px';

  return (
    <div
      className="modal-overlay"
      onClick={closeOnOverlay ? onClose : undefined}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal-content"
        style={{ maxWidth: maxW, width: '100%' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 id={titleId} style={{ margin: 0, fontSize: '1.2rem' }}>{title}</h2>
          <button
            className="secondary"
            onClick={onClose}
            style={{ padding: '0.5rem', color: 'var(--text-muted)', borderColor: 'transparent' }}
            aria-label={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>

        <div>{children}</div>

        {footer && <div style={{ marginTop: '1.5rem' }}>{footer}</div>}
      </div>
    </div>
  );
}
