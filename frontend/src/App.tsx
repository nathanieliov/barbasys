import { useEffect, useState } from 'react';
import apiClient from './api/apiClient';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Scissors, Package, BarChart3, Users as UsersIcon,
  ShoppingCart, Calendar as CalendarIcon, LogOut, Settings as SettingsIcon,
  Clock, Truck, BarChart, Receipt, Menu, User, Shield,
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Services from './pages/Services';
import Reports from './pages/Reports';
import SalesHistory from './pages/SalesHistory';
import Barbers from './pages/Barbers';
import Settings from './pages/Settings';
import Customers from './pages/Customers';
import Schedule from './pages/Schedule';
import MySchedule from './pages/MySchedule';
import Shifts from './pages/Shifts';
import Suppliers from './pages/Suppliers';
import Analytics from './pages/Analytics';
import Expenses from './pages/Expenses';
import UserProfile from './pages/UserProfile';
import Users from './pages/Users';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Landing from './pages/Landing';
import ShopDiscovery from './pages/ShopDiscovery';
import BookingFlow from './pages/BookingFlow';
import BarberDirect from './pages/BarberDirect';
import CustomerPortal from './pages/CustomerPortal';
import MyBookings from './pages/MyBookings';
import ProtectedRoute from './components/ProtectedRoute';
import AppTopBar from './components/AppTopBar';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SettingsProvider } from './hooks/useSettings';

/* ─── Admin Sidebar ─────────────────────────────────────── */

interface NavItemDef {
  to: string;
  icon: React.ReactNode;
  label: string;
  admin?: boolean;
  roles?: string[];
  badge?: number;
}

function AdminSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [shops, setShops] = useState<any[]>([]);

  useEffect(() => {
    if ((user?.role === 'OWNER' || user?.role === 'MANAGER') && user.shop_id) {
      apiClient.get('/shops').then(res => setShops(res.data)).catch(() => {});
    }
  }, [user]);

  const handleShopSwitch = async (shopId: string) => {
    try {
      const res = await apiClient.post('/shops/switch', { shopId });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      window.location.reload();
    } catch {
      alert(t('common.failed_switch_shop'));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;
  const isAdmin = user.role === 'OWNER' || user.role === 'MANAGER';

  const workspaceItems: NavItemDef[] = [
    { to: '/',           icon: <LayoutDashboard size={17} />, label: t('nav.dashboard') },
    { to: '/schedule',   icon: <CalendarIcon size={17} />,    label: t('nav.shop_calendar'), admin: true },
    { to: '/pos',        icon: <ShoppingCart size={17} />,    label: t('nav.pos') },
    { to: '/barbers',    icon: <UsersIcon size={17} />,       label: t('nav.barbers'), admin: true },
    { to: '/services',   icon: <Scissors size={17} />,        label: t('nav.services'), admin: true },
    { to: '/my-schedule',icon: <CalendarIcon size={17} />,    label: t('nav.my_schedule'), roles: ['BARBER'] },
    { to: '/inventory',  icon: <Package size={17} />,         label: t('nav.inventory') },
    { to: '/sales',      icon: <Receipt size={17} />,         label: t('nav.sales_log') },
    { to: '/customers',  icon: <UsersIcon size={17} />,       label: t('nav.customers') },
  ];

  const shopItems: NavItemDef[] = [
    { to: '/analytics',  icon: <BarChart size={17} />,        label: t('nav.analytics'), admin: true },
    { to: '/reports',    icon: <BarChart3 size={17} />,       label: t('nav.reports'), admin: true },
    { to: '/shifts',     icon: <Clock size={17} />,           label: t('nav.shifts'), admin: true },
    { to: '/expenses',   icon: <Receipt size={17} />,         label: t('nav.expenses'), admin: true },
    { to: '/suppliers',  icon: <Truck size={17} />,           label: t('nav.suppliers'), admin: true },
    { to: '/users',      icon: <Shield size={17} />,          label: t('nav.user_accounts'), admin: true },
    { to: '/profile',    icon: <User size={17} />,            label: t('nav.my_profile') },
    { to: '/settings',   icon: <SettingsIcon size={17} />,    label: t('nav.settings'), admin: true },
  ];

  const renderItems = (items: NavItemDef[]) =>
    items.map(item => {
      if (item.admin && !isAdmin) return null;
      if (item.roles && !item.roles.includes(user.role)) return null;
      return (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => { if (window.innerWidth <= 768) onClose(); }}
          aria-label={item.label}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.badge != null && <span className="nav-badge">{item.badge}</span>}
        </NavLink>
      );
    });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', zIndex: 90 }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className="admin-sidebar"
        style={window.innerWidth <= 768 ? {
          position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, width: 260,
          transform: isOpen ? 'none' : 'translateX(-100%)',
          transition: 'transform .25s ease',
          boxShadow: isOpen ? 'var(--shadow-lg)' : 'none',
          background: 'var(--surface)',
        } : undefined}
        aria-label="Main navigation"
      >
        {/* Multi-shop switcher */}
        {isAdmin && shops.length > 1 && (
          <div style={{ marginBottom: 8 }}>
            <select
              value={user.shop_id ?? ''}
              onChange={e => handleShopSwitch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--r)', border: '1px solid var(--line)', background: 'var(--surface-2)', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 0 }}
            >
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        <div className="sidebar-eyebrow">{t('nav.workspace', 'Workspace')}</div>
        {renderItems(workspaceItems)}

        <div className="sidebar-eyebrow" style={{ marginTop: 8 }}>{t('nav.shop', 'Shop')}</div>
        {renderItems(shopItems)}

        {/* Drawer status card */}
        <div style={{ flex: 1 }} aria-hidden="true" />
        <div style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 14, fontSize: 12.5, color: 'var(--ink-2)', marginTop: 8 }}>
          <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
            {user.fullname || user.username}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 10 }}>{user.role}</div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', color: 'var(--danger)' }}
            onClick={handleLogout}
          >
            <LogOut size={14} aria-hidden="true" /> {t('common.logout')}
          </button>
        </div>
      </aside>
    </>
  );
}

/* ─── Layout ────────────────────────────────────────────── */

function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [shopName, setShopName] = useState('BarbaSys');
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const customerPaths = ['/discovery', '/book/', '/my-bookings', '/b/'];
  const isCustomerRoute = customerPaths.some(p => location.pathname.startsWith(p));
  const isAuthRoute = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(location.pathname);

  const isStaff = user != null && user.role !== 'CUSTOMER' && !isCustomerRoute;
  const staffView: 'admin' | 'booking' = isCustomerRoute ? 'booking' : 'admin';

  useEffect(() => {
    if (user?.shop_id) {
      apiClient.get(`/shops/${user.shop_id}`).then(res => setShopName(res.data.name)).catch(() => {});
    }
  }, [user]);

  // Auth-only pages: no top bar or sidebar
  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppTopBar
        shopName={shopName}
        isStaff={isStaff}
        staffView={staffView}
        onStaffViewChange={v => {
          if (v === 'booking') navigate(`/book/${user?.shop_id ?? ''}`);
          else navigate('/');
        }}
      />

      {isStaff ? (
        <>
          {/* Mobile hamburger */}
          <div style={{ display: 'none' }} className="mobile-hamburger" />
          <button
            className="btn btn-soft btn-sm mobile-menu-btn"
            style={{ borderRadius: '50%', width: 44, height: 44, padding: 0 }}
            onClick={() => setIsSidebarOpen(o => !o)}
            aria-label={t('common.open_menu', 'Menu')}
          >
            <Menu size={20} />
          </button>

          <div className="admin-shell">
            <AdminSidebar
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
            <main className="main-pane" id="main-content">
              {children}
            </main>
          </div>
        </>
      ) : (
        <main style={{ flex: 1 }}>
          {children}
        </main>
      )}
    </div>
  );
}

/* ─── Home selector ──────────────────────────────────────── */

function HomeSelector() {
  const { user } = useAuth();
  if (!user) return <Landing />;
  if (user.role === 'CUSTOMER') return <CustomerPortal />;
  return <Dashboard />;
}

/* ─── App root ───────────────────────────────────────────── */

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<HomeSelector />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/discovery" element={<ShopDiscovery />} />
              <Route path="/book/:shopId" element={<BookingFlow />} />
              <Route path="/b/:slug" element={<BarberDirect />} />
              <Route path="/my-bookings" element={<MyBookings />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/my-schedule" element={<MySchedule />} />
                <Route path="/pos" element={<POS />} />
                <Route path="/sales" element={<SalesHistory />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/profile" element={<UserProfile />} />
              </Route>

              <Route element={<ProtectedRoute roles={['OWNER', 'MANAGER']} />}>
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/shifts" element={<Shifts />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/barbers" element={<Barbers />} />
                <Route path="/users" element={<Users />} />
                <Route path="/services" element={<Services />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </Layout>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
