import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { Calendar, Clock, Plus, Trash2, Save, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Shifts() {
  const { user } = useAuth();
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<number | string>('');
  const [shifts, setShifts] = useState<any[]>([]);
  const [timeOff, setTimeOff] = useState<any[]>([]);
  
  const [newTimeOff, setNewTimeOff] = useState({
    start_time: '',
    end_time: '',
    reason: ''
  });

  const isAdmin = user?.role === 'OWNER' || user?.role === 'MANAGER';

  useEffect(() => {
    apiClient.get('/barbers').then(res => {
      setBarbers(res.data);
      if (user?.role === 'BARBER') {
        setSelectedBarberId(user.barber_id || '');
      } else if (res.data.length > 0) {
        setSelectedBarberId(res.data[0].id);
      }
    });
  }, [user]);

  useEffect(() => {
    if (selectedBarberId) {
      apiClient.get(`/barbers/${selectedBarberId}/shifts`).then(res => setShifts(res.data));
      apiClient.get(`/barbers/${selectedBarberId}/time-off`).then(res => setTimeOff(res.data));
    }
  }, [selectedBarberId]);

  const addShift = () => {
    setShifts([...shifts, { day_of_week: 1, start_time: '09:00', end_time: '17:00' }]);
  };

  const removeShift = (index: number) => {
    setShifts(shifts.filter((_, i) => i !== index));
  };

  const updateShift = (index: number, field: string, value: any) => {
    const newShifts = [...shifts];
    newShifts[index][field] = value;
    setShifts(newShifts);
  };

  const saveShifts = async () => {
    try {
      await apiClient.post(`/barbers/${selectedBarberId}/shifts`, { shifts });
      alert('Shifts saved successfully');
    } catch (err) {
      alert('Failed to save shifts');
    }
  };

  const addTimeOff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(`/barbers/${selectedBarberId}/time-off`, newTimeOff);
      setNewTimeOff({ start_time: '', end_time: '', reason: '' });
      apiClient.get(`/barbers/${selectedBarberId}/time-off`).then(res => setTimeOff(res.data));
    } catch (err) {
      alert('Failed to add time off');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Shift Management</h1>
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <User size={20} color="#94a3b8" />
            <select 
              value={selectedBarberId} 
              onChange={e => setSelectedBarberId(e.target.value)}
              style={{ width: 'auto', marginBottom: 0 }}
            >
              {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="grid">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Clock size={20} color="var(--primary)" />
              <h2 style={{ margin: 0 }}>Weekly Schedule</h2>
            </div>
            {isAdmin && (
              <button className="secondary" onClick={addShift} style={{ padding: '0.5rem 1rem' }}>
                <Plus size={16} style={{ marginRight: '0.4rem' }} /> Add Day
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {shifts.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.5rem' }}>
                <select 
                  value={s.day_of_week} 
                  onChange={e => updateShift(i, 'day_of_week', parseInt(e.target.value))}
                  disabled={!isAdmin}
                >
                  {DAYS.map((day, idx) => <option key={idx} value={idx}>{day}</option>)}
                </select>
                <input 
                  type="time" 
                  value={s.start_time} 
                  onChange={e => updateShift(i, 'start_time', e.target.value)}
                  disabled={!isAdmin}
                />
                <span style={{ color: '#94a3b8' }}>to</span>
                <input 
                  type="time" 
                  value={s.end_time} 
                  onChange={e => updateShift(i, 'end_time', e.target.value)}
                  disabled={!isAdmin}
                />
                {isAdmin && (
                  <button className="secondary" onClick={() => removeShift(i)} style={{ color: '#ef4444', padding: '0.5rem' }}>
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
            {shifts.length === 0 && <p style={{ color: '#94a3b8' }}>No shifts scheduled.</p>}
          </div>

          {isAdmin && shifts.length > 0 && (
            <button onClick={saveShifts} style={{ marginTop: '1.5rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Save size={20} /> Save Weekly Schedule
            </button>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Calendar size={20} color="var(--primary)" />
            <h2 style={{ margin: 0 }}>Time Off / Breaks</h2>
          </div>

          <form onSubmit={addTimeOff} style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Starts</label>
                <input 
                  type="datetime-local" 
                  value={newTimeOff.start_time} 
                  onChange={e => setNewTimeOff({...newTimeOff, start_time: e.target.value})}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Ends</label>
                <input 
                  type="datetime-local" 
                  value={newTimeOff.end_time} 
                  onChange={e => setNewTimeOff({...newTimeOff, end_time: e.target.value})}
                  required
                />
              </div>
            </div>
            <input 
              type="text" 
              placeholder="Reason (e.g., Doctor, Lunch)" 
              value={newTimeOff.reason} 
              onChange={e => setNewTimeOff({...newTimeOff, reason: e.target.value})}
              style={{ marginBottom: '1rem' }}
            />
            <button type="submit" className="secondary" style={{ width: '100%' }}>Add Time Off</button>
          </form>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {timeOff.map((t, i) => (
              <div key={i} style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontWeight: 'bold' }}>{t.reason || 'No reason provided'}</div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                  {new Date(t.start_time).toLocaleString()} - {new Date(t.end_time).toLocaleString()}
                </div>
              </div>
            ))}
            {timeOff.length === 0 && <p style={{ color: '#94a3b8' }}>No upcoming time off.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
