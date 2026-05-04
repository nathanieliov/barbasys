import { useState, InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  autoComplete?: string;
}

export default function PasswordInput({ autoComplete = 'current-password', style, ...props }: PasswordInputProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'relative', ...( style ? {} : {}) }}>
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        style={{ paddingRight: '2.75rem', ...(style as any) }}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
        style={{
          position: 'absolute',
          right: '0.75rem',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
        }}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
