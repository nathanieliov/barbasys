import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Scissors, Package, BarChart3, Users, ShoppingCart, Calendar as CalendarIcon, LogOut, Settings as SettingsIcon, Clock, Truck, BarChart } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Services from './pages/Services';
import Reports from './pages/Reports';
import Barbers from './pages/Barbers';
import Settings from './pages/Settings';
import Customers from './pages/Customers';
import Schedule from './pages/Schedule';
import Shifts from './pages/Shifts';
import Suppliers from './pages/Suppliers';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './hooks/useAuth';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const isAdmin = user.role === 'OWNER' || user.role === 'MANAGER';

  return (
    <nav className="sidebar">
      <div className="logo">
        <Scissors size={32} color="#fff" />
        <span>BarbaSys</span>
      </div>
      <ul>
        <li><Link to="/"><LayoutDashboard size={20} /> Dashboard</Link></li>
        <li><Link to="/pos"><ShoppingCart size={20} /> POS (Sales)</Link></li>
        <li><Link to="/schedule"><CalendarIcon size={20} /> Schedule</Link></li>
        <li><Link to="/shifts"><Clock size={20} /> Shifts</Link></li>
        <li><Link to="/inventory"><Package size={20} /> Inventory</Link></li>
        {isAdmin && <li><Link to="/suppliers"><Truck size={20} /> Suppliers</Link></li>}
        <li><Link to="/services"><Scissors size={20} /> Services</Link></li>
        {isAdmin && <li><Link to="/analytics"><BarChart size={20} /> Analytics</Link></li>}
        <li><Link to="/reports"><BarChart3 size={20} /> Reports</Link></li>
        <li><Link to="/barbers"><Users size={20} /> Barbers</Link></li>
        <li><Link to="/customers"><Users size={20} /> Customers</Link></li>
        {isAdmin && <li><Link to="/settings"><SettingsIcon size={20} /> Settings</Link></li>}
      </ul>
      
      <div className="sidebar-footer">
        <div className="user-info">
          <p className="user-name">{user.username}</p>
          <p className="user-role">{user.role}</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          <LogOut size={20} /> Logout
        </button>
      </div>
    </nav>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Sidebar />
          
          <main className="content">
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/pos" element={<POS />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/shifts" element={<Shifts />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/customers" element={<Customers />} />
              </Route>

              {/* Only Owner and Manager can access these */}
              <Route element={<ProtectedRoute roles={['OWNER', 'MANAGER']} />}>
                <Route path="/reports" element={<Reports />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/barbers" element={<Barbers />} />
                <Route path="/services" element={<Services />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
