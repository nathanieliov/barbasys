import { useEffect, useState } from 'react';
import apiClient from './api/apiClient';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Scissors, Package, BarChart3, Users, ShoppingCart, Calendar as CalendarIcon, LogOut, Settings as SettingsIcon, Clock, Truck, BarChart, Receipt, Menu } from 'lucide-react';
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
import Shifts from './pages/Shifts';
import Suppliers from './pages/Suppliers';
import Analytics from './pages/Analytics';
import Expenses from './pages/Expenses';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './hooks/useAuth';

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
    { to: "/pos", icon: <ShoppingCart size={20} />, label: "POS (Sales)" },
    { to: "/sales", icon: <Receipt size={20} />, label: "Sales Log" },
    { to: "/schedule", icon: <CalendarIcon size={20} />, label: "Schedule" },
    { to: "/shifts", icon: <Clock size={20} />, label: "Shifts" },
    { to: "/inventory", icon: <Package size={20} />, label: "Inventory" },
    { to: "/services", icon: <Scissors size={20} />, label: "Services", admin: true },
    { to: "/suppliers", icon: <Truck size={20} />, label: "Suppliers", admin: true },
    { to: "/analytics", icon: <BarChart size={20} />, label: "Analytics" },
    { to: "/expenses", icon: <Receipt size={20} />, label: "Expenses", admin: true },
    { to: "/reports", icon: <BarChart3 size={20} />, label: "Reports" },
    { to: "/barbers", icon: <Users size={20} />, label: "Barbers", admin: true },
    { to: "/customers", icon: <Users size={20} />, label: "Customers" },
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
            <p className="user-name">{user.username}</p>
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
  
  if (!user) return <>{children}</>;

  return (
    <div className="app-container">
      <header className="mobile-header">
        <div className="logo" style={{ fontSize: '1.1rem' }}>
          <Scissors size={20} />
          <span>BarbaSys</span>
        </div>
        <button className="secondary" style={{ padding: '0.5rem' }} onClick={() => setIsSidebarOpen(true)}>
          <Menu size={24} />
        </button>
      </header>
      
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(false)} />
      
      <main className="content">
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pos" element={<POS />} />
              <Route path="/sales" element={<SalesHistory />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/shifts" element={<Shifts />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/customers" element={<Customers />} />
            </Route>

            <Route element={<ProtectedRoute roles={['OWNER', 'MANAGER']} />}>
              <Route path="/reports" element={<Reports />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/barbers" element={<Barbers />} />
              <Route path="/services" element={<Services />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
