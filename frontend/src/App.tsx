import { useEffect, useState } from 'react';
import apiClient from './api/apiClient';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Scissors, Package, BarChart3, Users as UsersIcon, ShoppingCart, Calendar as CalendarIcon, LogOut, Settings as SettingsIcon, Clock, Truck, BarChart, Receipt, Menu, User, Shield } from 'lucide-react';
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
import Landing from './pages/Landing';
import ShopDiscovery from './pages/ShopDiscovery';
import BookingFlow from './pages/BookingFlow';
import BarberDirect from './pages/BarberDirect';
import CustomerPortal from './pages/CustomerPortal';
import MyBookings from './pages/MyBookings';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SettingsProvider } from './hooks/useSettings';

const Sidebar = ({ isOpen, toggleSidebar }: { isOpen: boolean, toggleSidebar: () => void }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [shopName, setShopName] = useState('BarbaSys');
  const [shops, setShops] = useState<any[]>([]);

  useEffect(() => {
    if (user?.shop_id) {
      apiClient.get(`/shops/${user.shop_id}`).then(res => setShopName(res.data.name));
    }
    if (user?.role === 'OWNER' || user?.role === 'MANAGER') {
      apiClient.get('/shops').then(res => setShops(res.data));
    }
  }, [user]);

  const handleShopSwitch = async (shopId: string) => {
    try {
      const res = await apiClient.post('/shops/switch', { shopId });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      window.location.reload();
    } catch (err) {
      alert('Failed to switch shop');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const isAdmin = user.role === 'OWNER' || user.role === 'MANAGER';

  const navItems = [
    { to: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { to: "/my-schedule", icon: <CalendarIcon size={20} />, label: "My Schedule", roles: ['BARBER'] },
    { to: "/pos", icon: <ShoppingCart size={20} />, label: "POS (Sales)" },
    { to: "/sales", icon: <Receipt size={20} />, label: "Sales Log" },
    { to: "/schedule", icon: <CalendarIcon size={20} />, label: "Shop Calendar", admin: true },
    { to: "/shifts", icon: <Clock size={20} />, label: "Shifts", admin: true },
    { to: "/inventory", icon: <Package size={20} />, label: "Inventory" },
    { to: "/services", icon: <Scissors size={20} />, label: "Services", admin: true },
    { to: "/suppliers", icon: <Truck size={20} />, label: "Suppliers", admin: true },
    { to: "/analytics", icon: <BarChart size={20} />, label: "Analytics", admin: true },
    { to: "/expenses", icon: <Receipt size={20} />, label: "Expenses", admin: true },
    { to: "/reports", icon: <BarChart3 size={20} />, label: "Reports", admin: true },
    { to: "/barbers", icon: <UsersIcon size={20} />, label: "Barbers", admin: true },
    { to: "/users", icon: <Shield size={20} />, label: "User Accounts", admin: true },
    { to: "/customers", icon: <UsersIcon size={20} />, label: "Customers" },
    { to: "/profile", icon: <User size={20} />, label: "My Profile" },
    { to: "/settings", icon: <SettingsIcon size={20} />, label: "Settings", admin: true },
  ];

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={toggleSidebar}></div>
      <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="logo-container">
          <div className="logo">
            <Scissors size={28} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span>{shopName}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Professional Management</span>
            </div>
          </div>
          
          {isAdmin && shops.length > 1 && (
            <div style={{ marginTop: '1.25rem' }}>
              <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', marginLeft: '0.25rem' }}>Active Location</label>
              <select 
                value={user?.shop_id || ''} 
                onChange={e => handleShopSwitch(e.target.value)}
                style={{ marginBottom: 0, fontSize: '0.85rem', fontWeight: '600', padding: '0.5rem', background: '#f3f4f6' }}
              >
                {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>
        
        <ul className="nav-links">
          {navItems.map(item => {
            if (item.admin && !isAdmin) return null;
            if (item.roles && !item.roles.includes(user.role)) return null;
            const isActive = location.pathname === item.to;
            return (
              <li key={item.to}>
                <Link to={item.to} className={isActive ? 'active' : ''} onClick={() => { if(window.innerWidth <= 768) toggleSidebar() }}>
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <p className="user-name">{user.fullname || user.username}</p>
            <p className="user-role">{user.role}</p>
          </div>
          <button onClick={handleLogout} className="logout-button" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '100%', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <LogOut size={18} style={{ marginRight: '0.5rem' }} /> Logout
          </button>
        </div>
      </nav>
    </>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  
  // Paths that should ALWAYS use the customer layout
  const customerPaths = ['/discovery', '/book/', '/my-bookings', '/b/'];
  const isCustomerRoute = customerPaths.some(path => location.pathname.startsWith(path));
  
  const isCustomer = user?.role === 'CUSTOMER' || isCustomerRoute;
  const isStaff = user && user.role !== 'CUSTOMER' && !isCustomerRoute;

  return (
    <div className={`app-container ${isCustomer ? 'customer-layout' : ''}`}>
      {isStaff && (
        <header className="mobile-header">
          <div className="logo" style={{ fontSize: '1.1rem' }}>
            <Scissors size={20} />
            <span>BarbaSys</span>
          </div>
          <button className="secondary" style={{ padding: '0.5rem' }} onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>
        </header>
      )}
      
      {isStaff && <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(false)} />}
      
      <main className="content">
        {children}
      </main>
    </div>
  );
};

function HomeSelector() {
  const { user } = useAuth();
  if (!user) return <Landing />;
  if (user.role === 'CUSTOMER') return <CustomerPortal />;
  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <Layout>
          <Routes>
            <Route path="/" element={<HomeSelector />} />
            <Route path="/login" element={<Login />} />
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
