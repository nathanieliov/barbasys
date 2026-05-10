import BottomSheet from './BottomSheet';

interface WalkinBlockedSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalkinBlockedSheet({ isOpen, onClose }: WalkinBlockedSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Tabs aren't for walk-ins" height="auto">
      <div style={{ textAlign: 'center', padding: '8px 6px 18px' }}>
        <div style={{
          width: 60,
          height: 60,
          borderRadius: 18,
          background: 'var(--butter-soft, #fef3c7)',
          color: '#8a6210',
          margin: '0 auto 14px',
          display: 'grid',
          placeItems: 'center',
          fontSize: 26,
        }}>
          ⚠️
        </div>
        <div style={{
          fontSize: 13.5,
          color: 'var(--ink-2)',
          marginBottom: 18,
          lineHeight: 1.5,
          padding: '0 8px',
        }}>
          We need a known customer profile to open a tab so we can follow up.
          Take cash or transfer now — or convert this walk-in into a regular customer first.
        </div>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            height: 50,
            borderRadius: 14,
            border: 0,
            background: 'var(--ink)',
            color: 'var(--bg)',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'var(--font)',
            cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </div>
    </BottomSheet>
  );
}
