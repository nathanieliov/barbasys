import { useEffect, useState } from 'react';
import axios from 'axios';
import { Receipt, Plus, Trash2, Calendar, Tag, DollarSign } from 'lucide-react';

const CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Marketing', 'Maintenance', 'Other'];

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [category, setCategory] = useState('Supplies');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchExpenses = () => {
    axios.get('/api/expenses').then(res => setExpenses(res.data));
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/expenses', {
        category,
        amount: parseFloat(amount),
        description,
        date
      });
      setAmount('');
      setDescription('');
      fetchExpenses();
    } catch (err) {
      alert('Failed to add expense');
    }
  };

  const deleteExpense = async (id: number) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await axios.delete(`/api/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      alert('Failed to delete expense');
    }
  };

  return (
    <div>
      <h1>Expense Tracking</h1>
      
      <div className="grid">
        <div className="card">
          <h2>Log New Expense</h2>
          <form onSubmit={addExpense}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Amount ($)</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  required 
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Description</label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="e.g., Monthly electricity bill, New towels..."
                rows={3}
                style={{ width: '100%', resize: 'none' }}
              />
            </div>
            <button type="submit" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Plus size={20} /> Add Expense
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Expense History</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {expenses.map(e => (
              <div key={e.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '0.75rem', position: 'relative' }}>
                <Trash2 
                  size={18} 
                  style={{ position: 'absolute', top: '1rem', right: '1rem', cursor: 'pointer', color: '#ef4444' }} 
                  onClick={() => deleteExpense(e.id)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Tag size={16} color="var(--primary)" />
                    <span style={{ fontWeight: 'bold' }}>{e.category}</span>
                  </div>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>-${e.amount.toFixed(2)}</span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                  {e.description || 'No description'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
                  <Calendar size={14} /> {new Date(e.date).toLocaleDateString()}
                </div>
              </div>
            ))}
            {expenses.length === 0 && <p style={{ color: '#94a3b8' }}>No expenses recorded.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
