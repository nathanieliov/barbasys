import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { Clock, Plus, Trash2, Save, User, Coffee, Info } from 'lucide-react';
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
      alert('Weekly schedule updated successfully!');
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
    <div className="shifts-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Shift Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Configure availability and scheduled breaks for professionals.</p>
        </div>
        
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'white', padding: '0.5rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <User size={18} color="var(--primary)" />
            <select 
              value={selectedBarberId} 
              onChange={e => setSelectedBarberId(e.target.value)}
              style={{ width: 'auto', marginBottom: 0, border: 'none', fontWeight: '700', padding: '0.25rem' }}
            >
              {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="pos-grid">
        {/* Left Column: Weekly Schedule */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                <Clock size={20} />
              </div>
              <h2 style={{ margin: 0 }}>Weekly Schedule</h2>
            </div>
            {isAdmin && (
              <button className="secondary" onClick={addShift} style={{ gap: '0.4rem', fontSize: '0.8rem' }}>
                <Plus size={16} /> Add Day
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gap: '0.75rem', flex: 1 }}>
            {shifts.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: '#f9fafb', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <select 
                  value={s.day_of_week} 
                  onChange={e => updateShift(i, 'day_of_week', parseInt(e.target.value))}
                  disabled={!isAdmin}
                  style={{ width: '130px', marginBottom: 0, fontWeight: '600' }}
                >
                  {DAYS.map((day, idx) => <option key={idx} value={idx}>{day}</option>)}
                </select>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <input 
                    type="time" 
                    value={s.start_time} 
                    onChange={e => updateShift(i, 'start_time', e.target.value)}
                    disabled={!isAdmin}
                    style={{ marginBottom: 0, textAlign: 'center', fontWeight: '700' }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>to</span>
                  <input 
                    type="time" 
                    value={s.end_time} 
                    onChange={e => updateShift(i, 'end_time', e.target.value)}
                    disabled={!isAdmin}
                    style={{ marginBottom: 0, textAlign: 'center', fontWeight: '700' }}
                  />
                </div>

                {isAdmin && (
                  <button className="secondary" onClick={() => removeShift(i)} style={{ color: 'var(--danger)', padding: '0.5rem', border: 'none', background: 'transparent' }}>
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
            
            {shifts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <Clock size={40} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
                <p>No regular shifts scheduled.</p>
              </div>
            )}
          </div>

          {isAdmin && shifts.length > 0 && (
            <button onClick={saveShifts} style={{ marginTop: '2rem', width: '100%', gap: '0.5rem', padding: '1rem' }}>
              <Save size={20} /> Save Weekly Schedule
            </button>
          )}
        </div>

        {/* Right Column: Time Off */}
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                <Coffee size={20} />
              </div>
              <h2 style={{ margin: 0 }}>Log Time Off / Break</h2>
            </div>

            <form onSubmit={addTimeOff}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Starts</label>
                  <input 
                    type="datetime-local" 
                    value={newTimeOff.start_time} 
                    onChange={e => setNewTimeOff({...newTimeOff, start_time: e.target.value})}
                    required
                    style={{ marginBottom: 0, fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Ends</label>
                  <input 
                    type="datetime-local" 
                    value={newTimeOff.end_time} 
                    onChange={e => setNewTimeOff({...newTimeOff, end_time: e.target.value})}
                    required
                    style={{ marginBottom: 0, fontSize: '0.85rem' }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Reason</label>
                <input 
                  type="text" 
                  placeholder="e.g. Lunch Break, Doctor Appt" 
                  value={newTimeOff.reason} 
                  onChange={e => setNewTimeOff({...newTimeOff, reason: e.target.value})}
                  style={{ marginBottom: 0 }}
                  required
                />
              </div>
              
              <button type="submit" className="secondary" style={{ width: '100%', padding: '0.75rem', fontWeight: '700' }}>
                <Plus size={18} style={{ marginRight: '0.4rem' }} /> Add Time Off
              </button>
            </form>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--text-main)' }}>
              <Info size={16} />
              <h3 style={{ margin: 0, fontSize: '0.9rem' }}>Upcoming Time Off</h3>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {timeOff.map((t, i) => (
                <div key={i} style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid var(--border)', borderLeft: '4px solid var(--warning)' }}>
                  <div style={{ fontWeight: '800', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{t.reason || 'Personal Time'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                    {new Date(t.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - {new Date(t.end_time).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              {timeOff.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No upcoming time off recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
