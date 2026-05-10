import { useTranslation } from 'react-i18next';
import BottomSheet from './BottomSheet';

interface WalkinBlockedSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalkinBlockedSheet({ isOpen, onClose }: WalkinBlockedSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('tabs.walkin_title')} height="auto">
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
          {t('tabs.walkin_body')}
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
          {t('tabs.walkin_got_it')}
        </button>
      </div>
    </BottomSheet>
  );
}
