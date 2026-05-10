import { useNavigate } from 'react-router-dom';
import { Search, Bell, Settings, Sparkles, Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';

interface AppTopBarProps {
  shopName?: string;
  isStaff?: boolean;
  staffView?: 'admin' | 'booking';
  isSidebarOpen?: boolean;
  onMenuToggle?: () => void;
  onStaffViewChange?: (v: 'admin' | 'booking') => void;
}

export default function AppTopBar({
  shopName = 'BarbaSys',
  isStaff,
  staffView = 'admin',
  isSidebarOpen = false,
  onMenuToggle,
  onStaffViewChange,
}: AppTopBarProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const initials = user?.fullname
    ? user.fullname.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.username?.slice(0, 2).toUpperCase() ?? '?';

  return (
    <div className="app-top">
      <div className="app-top-inner">
        {/* Hamburger — mobile only, left of brand */}
        {onMenuToggle && (
          <button
            className="icon-btn topbar-menu-btn"
            onClick={onMenuToggle}
            aria-label={isSidebarOpen ? t('common.close_menu', 'Close menu') : t('common.open_menu', 'Menu')}
            aria-expanded={isSidebarOpen}
            aria-controls="admin-sidebar"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        )}

        {/* Brand */}
        <div className="brand">
          <div className="brand-mark" aria-hidden="true" />
          <span className="brand-name">{shopName}</span>
        </div>

        {/* Mode switch — staff only */}
        {isStaff && onStaffViewChange && (
          <div className="mode-switch" role="group" aria-label={t('topbar.mode_switch', 'View')}>
            <button
              className={staffView === 'admin' ? 'active' : ''}
              onClick={() => onStaffViewChange('admin')}
              aria-pressed={staffView === 'admin'}
            >
              <Settings size={14} aria-hidden="true" />
              <span className="mode-label">{t('topbar.admin', 'Admin')}</span>
            </button>
            <button
              className={staffView === 'booking' ? 'active' : ''}
              onClick={() => onStaffViewChange('booking')}
              aria-pressed={staffView === 'booking'}
            >
              <Sparkles size={14} aria-hidden="true" />
              <span className="mode-label">{t('topbar.book', 'Book a cut')}</span>
            </button>
          </div>
        )}

        <div className="spacer" aria-hidden="true" />

        {/* Right slot: admin actions */}
        {isStaff && staffView === 'admin' && (
          <>
            <button className="icon-btn topbar-search-btn" aria-label={t('topbar.search', 'Search')}>
              <Search size={16} />
            </button>
            <button className="icon-btn topbar-bell-btn" aria-label={t('topbar.notifications', 'Notifications')} style={{ position: 'relative' }}>
              <Bell size={16} />
              <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--bg)' }} aria-hidden="true" />
            </button>
            <div
              className="avatar"
              aria-label={user?.fullname ?? user?.username}
              title={user?.fullname ?? user?.username}
            >
              {initials}
            </div>
          </>
        )}

        {/* Right slot: booking / unauthenticated */}
        {(!isStaff || staffView === 'booking') && (
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>
            {t('topbar.sign_in', 'Sign in')}
          </button>
        )}
      </div>
    </div>
  );
}
