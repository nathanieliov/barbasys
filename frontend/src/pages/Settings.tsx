import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { Save, Building, Clock, Percent, AlertCircle, CheckCircle, Info, Calendar, Plus, Trash2 } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState<any>({
    shop_name: '',
    shop_address: '',
    shop_phone: '',
    open_time: '09:00',
    close_time: '19:00',
    default_tax_rate: '0',
    currency_symbol: '$',
    enable_reminders: 'true',
    low_stock_threshold: '5',
    holidays: '[]' // JSON string of dates
  });
  
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    apiClient.get('/settings').then(res => {
      const data = res.data;
      setSettings((prev: any) => ({ ...prev, ...data }));
      if (data.holidays) {
        try {
          setHolidays(JSON.parse(data.holidays));
        } catch (e) {
          setHolidays([]);
        }
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { 
        ...settings, 
        holidays: JSON.stringify(holidays) 
      };
      await apiClient.post('/settings', payload);
      setMessage({ text: 'Settings saved successfully!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setMessage({ text: 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
  };

  const addHoliday = () => {
    if (!newHoliday || holidays.includes(newHoliday)) return;
    setHolidays([...holidays, newHoliday].sort());
    setNewHoliday('');
  };

  const removeHoliday = (date: string) => {
    setHolidays(holidays.filter(h => h !== date));
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Shop Settings</h1>
        <p style={{ color: 'var(--text-muted)' }}>Configure your business operations, financial defaults, and automated features.</p>
      </div>

      {message.text && (
        <div style={{ 
          padding: '1rem', 
          borderRadius: '0.75rem', 
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
          fontWeight: '600'
        }}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          
          {/* General Information */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Building size={20} color="var(--primary)" />
              <h2 style={{ margin: 0 }}>General Information</h2>
            </div>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Business Name</label>
              <input 
                type="text" 
                value={settings.shop_name} 
                onChange={e => handleChange('shop_name', e.target.value)} 
                placeholder="e.g., BarbaSys Elite"
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Address</label>
              <input 
                type="text" 
                value={settings.shop_address} 
                onChange={e => handleChange('shop_address', e.target.value)} 
                placeholder="123 Main St, Anytown..."
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Phone Number</label>
              <input 
                type="tel" 
                value={settings.shop_phone} 
                onChange={e => handleChange('shop_phone', e.target.value)} 
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          {/* Operating Hours */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Clock size={20} color="var(--primary)" />
              <h2 style={{ margin: 0 }}>Operating Hours</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Opening Time</label>
                <input 
                  type="time" 
                  value={settings.open_time} 
                  onChange={e => handleChange('open_time', e.target.value)} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Closing Time</label>
                <input 
                  type="time" 
                  value={settings.close_time} 
                  onChange={e => handleChange('close_time', e.target.value)} 
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Manage Holidays & Closures</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input 
                  type="date" 
                  value={newHoliday} 
                  onChange={e => setNewHoliday(e.target.value)} 
                  style={{ marginBottom: 0 }}
                />
                <button type="button" onClick={addHoliday} className="secondary" style={{ padding: '0.5rem 1rem' }}>
                  <Plus size={18} />
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {holidays.map(h => (
                  <div key={h} style={{ background: '#f3f4f6', padding: '0.4rem 0.75rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: '700' }}>
                    <Calendar size={14} /> {new Date(h).toLocaleDateString()}
                    <button type="button" onClick={() => removeHoliday(h)} style={{ background: 'none', color: 'var(--danger)', padding: 0, height: 'auto', minHeight: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {holidays.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No holidays scheduled.</p>}
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Percent size={20} color="var(--primary)" />
              <h2 style={{ margin: 0 }}>Financial Defaults</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Default Tax Rate (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={settings.default_tax_rate} 
                  onChange={e => handleChange('default_tax_rate', e.target.value)} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Currency Symbol</label>
                <input 
                  type="text" 
                  value={settings.currency_symbol} 
                  onChange={e => handleChange('currency_symbol', e.target.value)} 
                  maxLength={3}
                />
              </div>
            </div>
          </div>

          {/* Automation */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Info size={20} color="var(--primary)" />
              <h2 style={{ margin: 0 }}>System Automation</h2>
            </div>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={settings.enable_reminders === 'true'} 
                  onChange={e => handleChange('enable_reminders', e.target.checked ? 'true' : 'false')}
                  style={{ width: 'auto', marginBottom: 0 }}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Enable Appointment Reminders (24h)</span>
              </label>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Low Stock Alert Threshold</label>
              <input 
                type="number" 
                min="1"
                value={settings.low_stock_threshold} 
                onChange={e => handleChange('low_stock_threshold', e.target.value)} 
              />
            </div>
          </div>

        </div>

        <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 2.5rem', marginTop: '2.5rem', borderRadius: '1rem', fontSize: '1.1rem', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}>
          <Save size={20} />
          {saving ? 'Saving Changes...' : 'Save All Settings'}
        </button>
      </form>
    </div>
  );
}
