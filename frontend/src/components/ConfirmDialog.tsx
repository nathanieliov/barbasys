import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import Modal from './Modal';
import { useTranslation } from 'react-i18next';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm: ConfirmFn = useCallback((options) => {
    setState({ ...options, open: true });
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const respond = (value: boolean) => {
    resolveRef.current?.(value);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <Modal
          isOpen={state.open}
          onClose={() => respond(false)}
          title={state.title}
          size="sm"
          closeOnOverlay={false}
          footer={
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="secondary" onClick={() => respond(false)}>
                {state.cancelLabel ?? t('common.cancel')}
              </button>
              <button
                onClick={() => respond(true)}
                style={state.destructive ? { background: 'var(--danger, #dc2626)', borderColor: 'var(--danger, #dc2626)' } : undefined}
              >
                {state.confirmLabel ?? t('common.confirm')}
              </button>
            </div>
          }
        >
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>{state.message}</p>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}
