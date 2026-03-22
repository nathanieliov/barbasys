import { useEffect, useState } from 'react';
import axios from 'axios';
import { Save, Building, Clock, Percent } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState<any>({
    shop_name: '',
    open_time: '09:00',
    close_time: '19:00',
    default_tax_rate: '0',
    currency_symbol: '$'
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    axios.get('/api/settings').then(res => {
      setSettings((prev: any) => ({ ...prev, ...res.data }));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/api/settings', settings);
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

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1>Shop Settings</h1>
      <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Configure global shop preferences and operating parameters.</p>

      {message.text && (
        <div style={{ 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          marginBottom: '1.5rem',
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: message.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`
        }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Building size={20} color="var(--primary)" />
            <h2 style={{ margin: 0 }}>General Information</h2>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Shop Name</label>
            <input 
              type="text" 
              value={settings.shop_name} 
              onChange={e => handleChange('shop_name', e.target.value)} 
              placeholder="e.g., BarbaSys Elite"
            />
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Clock size={20} color="var(--primary)" />
            <h2 style={{ margin: 0 }}>Operating Hours</h2>
          </div>
          
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Opening Time</label>
              <input 
                type="time" 
                value={settings.open_time} 
                onChange={e => handleChange('open_time', e.target.value)} 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Closing Time</label>
              <input 
                type="time" 
                value={settings.close_time} 
                onChange={e => handleChange('close_time', e.target.value)} 
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Percent size={20} color="var(--primary)" />
            <h2 style={{ margin: 0 }}>Financial Defaults</h2>
          </div>
          
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Default Tax Rate (%)</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                value={settings.default_tax_rate} 
                onChange={e => handleChange('default_tax_rate', e.target.value)} 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Currency Symbol</label>
              <input 
                type="text" 
                value={settings.currency_symbol} 
                onChange={e => handleChange('currency_symbol', e.target.value)} 
                maxLength={3}
              />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 2rem' }}>
          <Save size={20} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
