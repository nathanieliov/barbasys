import { useEffect, useState } from 'react';
import axios from 'axios';
import { Calendar as CalendarIcon, Clock, Scissors, User, X, PlusCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Schedule() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showBook, setShowBook] = useState(false);
  
  // Booking Form State
  const [selectedBarber, setSelectedBarber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedTime, setSelectedTime] = useState('10:00');

  const fetchData = () => {
    axios.get(`/api/appointments?date=${date}`).then(res => setAppointments(res.data));
    axios.get('/api/barbers').then(res => setBarbers(res.data));
    axios.get('/api/customers').then(res => setCustomers(res.data));
    axios.get('/api/services').then(res => setServices(res.data));
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const start_time = `${date}T${selectedTime}:00`;
    try {
      await axios.post('/api/appointments', {
        barber_id: parseInt(selectedBarber),
        customer_id: selectedCustomer ? parseInt(selectedCustomer) : null,
        service_id: parseInt(selectedService),
        start_time
      });
      setShowBook(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to book appointment');
    }
  };

  const handleCheckIn = (appointment: any) => {
    // Navigate to POS with pre-filled state
    navigate('/pos', { 
      state: { 
        appointmentId: appointment.id,
        barberId: appointment.barber_id,
        customerId: appointment.customer_id,
        service: {
          id: appointment.service_id,
          name: appointment.service_name,
          price: services.find(s => s.id === appointment.service_id)?.price || 0,
          type: 'service'
        }
      } 
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Daily Schedule</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setShowBook(true)}>
            <PlusCircle size={18} style={{ marginRight: '0.5rem' }} /> Book Appointment
          </button>
          <CalendarIcon size={20} />
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            style={{ marginBottom: 0, width: 'auto' }}
          />
        </div>
      </div>

      <div className="card">
        {appointments.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No appointments scheduled for this day.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {appointments.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '2rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem', borderLeft: `4px solid ${a.status === 'completed' ? '#10b981' : 'var(--primary)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '100px', fontWeight: 'bold' }}>
                  <Clock size={18} color="#6366f1" />
                  {new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                  <User size={18} color="#10b981" />
                  <div>
                    <div style={{ fontWeight: '600' }}>{a.customer_name || 'Anonymous Client'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Customer</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                  <Scissors size={18} color="#f59e0b" />
                  <div>
                    <div style={{ fontWeight: '600' }}>{a.service_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>with {a.barber_name}</div>
                  </div>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '999px', 
                    fontSize: '0.75rem', 
                    background: a.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                    color: a.status === 'completed' ? '#10b981' : '#6366f1',
                    textTransform: 'capitalize'
                  }}>
                    {a.status}
                  </span>
                  {a.status === 'scheduled' && (
                    <button className="secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => handleCheckIn(a)}>
                      <CheckCircle size={16} style={{ marginRight: '0.4rem' }} /> Check-in
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBook && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', position: 'relative' }}>
            <X size={24} style={{ position: 'absolute', top: '1rem', right: '1rem', cursor: 'pointer' }} onClick={() => setShowBook(false)} />
            <h2>Book Appointment</h2>
            <form onSubmit={handleBook} style={{ marginTop: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ marginBottom: '0.5rem', color: '#94a3b8' }}>Barber</p>
                <select value={selectedBarber} onChange={e => setSelectedBarber(e.target.value)} required>
                  <option value="">Select Barber</option>
                  {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ marginBottom: '0.5rem', color: '#94a3b8' }}>Customer (Optional)</p>
                <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                  <option value="">Guest</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name || c.email || c.phone}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ marginBottom: '0.5rem', color: '#94a3b8' }}>Service</p>
                <select value={selectedService} onChange={e => setSelectedService(e.target.value)} required>
                  <option value="">Select Service</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}m)</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ marginBottom: '0.5rem', color: '#94a3b8' }}>Time</p>
                <input type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} required />
              </div>
              <button type="submit" style={{ width: '100%' }}>Create Appointment</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
