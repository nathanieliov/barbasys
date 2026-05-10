import { useEffect, useRef, useId, ReactNode } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  height?: string;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  height = '80%',
}: BottomSheetProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocus.current = document.activeElement;
    document.body.style.overflow = 'hidden';

    const el = sheetRef.current;
    const focusable = el ? Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    setTimeout(() => focusable[0]?.focus(), 300);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !el) return;
      const all = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        f => !f.closest('[hidden]'),
      );
      if (all.length === 0) return;
      const first = all[0];
      const last = all[all.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
      (previousFocus.current as HTMLElement | null)?.focus();
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(20,15,10,0.45)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s',
          zIndex: 200,
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--bg)',
          borderRadius: '26px 26px 0 0',
          height,
          maxHeight: '92dvh',
          transform: isOpen ? 'translateY(0)' : 'translateY(105%)',
          transition: 'transform 0.28s cubic-bezier(.3,.7,.4,1)',
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(60,40,25,0.18)',
        }}
      >
        {/* Drag handle */}
        <div
          aria-hidden="true"
          style={{
            width: 38,
            height: 4.5,
            borderRadius: 999,
            background: 'rgba(0,0,0,0.18)',
            margin: '10px auto 4px',
            flexShrink: 0,
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: '8px 22px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div
            id={titleId}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
            }}
          >
            {title}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: 0,
              background: 'var(--surface-2)',
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--ink-2)',
              cursor: 'pointer',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 32px' }}>
          {children}
        </div>
      </div>
    </>
  );
}
