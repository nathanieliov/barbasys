import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { PlusCircle, X, Trash2, Calendar, Tag, DollarSign, Receipt, Info } from 'lucide-react';

const CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Marketing', 'Maintenance', 'Insurance', 'Other'];

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [category, setCategory] = useState('Supplies');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchExpenses = () => {
    apiClient.get('/expenses').then(res => setExpenses(res.data)).catch(() => {});
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const resetForm = () => {
    setCategory('Supplies');
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowModal(false);
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/expenses', {
        category,
        amount: parseFloat(amount),
        description,
        date
      });
      resetForm();
      fetchExpenses();
    } catch (err) {
      alert('Failed to add expense');
    }
  };

  const deleteExpense = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this expense record?')) return;
    try {
      await apiClient.delete(`/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      alert('Failed to delete expense');
    }
  };

  const totalMonthlyExpenses = expenses
    .filter(e => new Date(e.date).getMonth() === new Date().getMonth())
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="expenses-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Expense Tracking</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your shop overheads and operational costs.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ gap: '0.5rem' }}>
          <PlusCircle size={20} /> <span className="hide-mobile">Log Expense</span>
        </button>
      </div>

      {/* KPI Section */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', borderLeft: '4px solid var(--danger)' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '1rem' }}>
          <Receipt size={32} />
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Current Month Expenses</div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-main)' }}>${totalMonthlyExpenses.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {expenses.map(e => (
          <div key={e.id} className="card" style={{ marginBottom: 0, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tag size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{e.category}</div>
                  <div style={{ fontSize: '1.2rem', color: 'var(--danger)', fontWeight: '900' }}>-${e.amount.toFixed(2)}</div>
                </div>
              </div>
              <button className="secondary" style={{ padding: '0.4rem', color: 'var(--danger)', border: 'none' }} onClick={() => deleteExpense(e.id)}>
                <Trash2 size={18} />
              </button>
            </div>

            <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.25rem', flex: 1 }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.9rem' }}>
                <Info size={16} style={{ marginTop: '0.2rem', flexShrink: 0 }} color="var(--text-muted)" />
                <span style={{ color: 'var(--text-main)', fontStyle: e.description ? 'normal' : 'italic' }}>
                  {e.description || 'No description provided'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              <Calendar size={16} /> {new Date(e.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
            </div>
          </div>
        ))}
        {expenses.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <Receipt size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
            <p>No expenses recorded yet.</p>
            <button className="secondary" style={{ marginTop: '1rem' }} onClick={() => setShowModal(true)}>Log your first expense</button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Receipt size={20} color="var(--primary)" />
                <h2 style={{ marginBottom: 0 }}>Log New Expense</h2>
              </div>
              <button className="secondary" style={{ padding: '0.5rem' }} onClick={resetForm}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={addExpense}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} required>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Amount ($)</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--text-muted)' }} />
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0.01"
                      value={amount} 
                      onChange={e => setAmount(e.target.value)} 
                      style={{ paddingLeft: '2.25rem', marginBottom: 0 }}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Date</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    style={{ marginBottom: 0 }}
                    required 
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>Description</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="e.g. Monthly electricity bill, New towels, etc."
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '0.9rem', resize: 'none' }}
                />
              </div>

              <button type="submit" style={{ width: '100%', padding: '1.1rem', fontSize: '1.1rem' }}>
                Confirm Expense
              </button>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 640px) {
          .hide-mobile { display: none; }
        }
      `}} />
    </div>
  );
}
