import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { UserPlus, User, Percent, Phone, Mail, Trash2, Edit2 } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/format';
import { useTranslation } from 'react-i18next';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

export default function Barbers() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();

  const [barbers, setBarbers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBarber, setEditingBarber] = useState<any>(null);

  const [fullname, setFullname] = useState('');
  const [serviceRate, setServiceRate] = useState('0.6');
  const [productRate, setProductRate] = useState('0.1');
  const [paymentModel, setPaymentModel] = useState<'COMMISSION' | 'FIXED' | 'FIXED_FEE'>('COMMISSION');
  const [fixedAmount, setFixedAmount] = useState('1000');
  const [fixedPeriod, setFixedPeriod] = useState<'MONTHLY' | 'WEEKLY' | 'BIWEEKLY'>('MONTHLY');

  const fetchBarbers = () => {
    apiClient.get('/barbers').then(res => setBarbers(res.data)).catch(() => {});
  };

  useEffect(() => { fetchBarbers(); }, []);

  const resetForm = () => {
    setFullname('');
    setServiceRate('0.6');
    setProductRate('0.1');
    setPaymentModel('COMMISSION');
    setFixedAmount('1000');
    setFixedPeriod('MONTHLY');
    setEditingBarber(null);
    setShowModal(false);
  };

  const startEdit = (barber: any) => {
    setEditingBarber(barber);
    setFullname(barber.fullname || barber.name || '');
    setServiceRate(barber.service_commission_rate.toString());
    setProductRate(barber.product_commission_rate.toString());
    setPaymentModel(barber.payment_model || 'COMMISSION');
    setFixedAmount(barber.fixed_amount?.toString() || '1000');
    setFixedPeriod(barber.fixed_period || 'MONTHLY');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullname) return;

    const data = {
      name: fullname,
      fullname,
      payment_model: paymentModel,
      service_commission_rate: parseFloat(serviceRate),
      product_commission_rate: parseFloat(productRate),
      fixed_amount: paymentModel !== 'COMMISSION' ? parseFloat(fixedAmount) : null,
      fixed_period: paymentModel !== 'COMMISSION' ? fixedPeriod : null
    };

    try {
      if (editingBarber) {
        await apiClient.put(`/barbers/${editingBarber.id}`, data);
        toast.success(t('barbers.updated_success', 'Professional updated.'));
      } else {
        await apiClient.post('/barbers', data);
        toast.success(t('barbers.added_success', 'Professional added.'));
      }
      resetForm();
      fetchBarbers();
    } catch {
      toast.error(t('barbers.failed_save'));
    }
  };

  const deleteBarber = async (id: number, name: string) => {
    const yes = await confirm({
      title: t('barbers.delete_confirm_title', 'Remove professional?'),
      message: t('barbers.delete_confirm_message', 'This will deactivate {{name}}. They will no longer appear in bookings.', { name }),
      confirmLabel: t('common.delete'),
      destructive: true
    });
    if (!yes) return;
    try {
      await apiClient.delete(`/barbers/${id}`);
      toast.success(t('barbers.deleted_success', 'Professional removed.'));
      fetchBarbers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('barbers.failed_delete'));
    }
  };

  return (
    <div className="barbers-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>{t('barbers.title')}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{t('barbers.manage_team')}</p>
        </div>
        <button onClick={() => { setEditingBarber(null); setShowModal(true); }} style={{ gap: '0.5rem' }}>
          <UserPlus size={20} /> <span className="hide-mobile">{t('barbers.add_professional')}</span>
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {barbers.map(b => (
          <div key={b.id} className="card" style={{ marginBottom: 0, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '56px', height: '56px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: '800', border: '2px solid white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  {(b.fullname || b.name).charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--text-main)' }}>{b.fullname || b.name}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button className="secondary" style={{ padding: '0.4rem', border: 'none' }} onClick={() => startEdit(b)} aria-label={t('common.edit')}>
                  <Edit2 size={16} />
                </button>
                <button className="secondary" style={{ padding: '0.4rem', color: 'var(--danger)', border: 'none' }} onClick={() => deleteBarber(b.id, b.fullname || b.name)} aria-label={t('common.delete')}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {b.payment_model === 'FIXED' || b.payment_model === 'FIXED_FEE' ? (
                <div style={{ gridColumn: '1 / -1', background: 'rgba(79, 70, 229, 0.05)', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(79, 70, 229, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', marginBottom: '0.25rem' }}>
                      {b.payment_model === 'FIXED' ? t('barbers.salary') : t('barbers.rental_fee')}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--primary)' }}>
                      {formatCurrency(b.fixed_amount, settings.currency_symbol)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', marginBottom: '0.25rem' }}>{t('barbers.period')}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>{t(`common.${b.fixed_period?.toLowerCase() || 'monthly'}`)}</div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Percent size={12} /> {t('barbers.service_rate')}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--primary)' }}>{(b.service_commission_rate * 100).toFixed(0)}%</div>
                  </div>
                  <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Percent size={12} /> {t('barbers.product_rate')}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--success)' }}>{(b.product_commission_rate * 100).toFixed(0)}%</div>
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
              <button className="secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', gap: '0.4rem' }}>
                <Phone size={14} /> {t('barbers.contact')}
              </button>
              <button className="secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', gap: '0.4rem' }}>
                <Mail size={14} /> {t('barbers.performance')}
              </button>
            </div>
          </div>
        ))}

        {barbers.length === 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState
              icon={User}
              title={t('barbers.no_professionals')}
              action={{ label: t('barbers.register_first'), onClick: () => setShowModal(true) }}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title={editingBarber ? t('barbers.edit_professional') : t('barbers.register_professional')}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>{t('barbers.full_name')}</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder={t('barbers.fullname_placeholder')}
                value={fullname}
                onChange={e => setFullname(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                required
                autoFocus
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>{t('barbers.payment_model')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              {(['COMMISSION', 'FIXED', 'FIXED_FEE'] as const).map(model => (
                <button
                  key={model}
                  type="button"
                  className={paymentModel === model ? '' : 'secondary'}
                  onClick={() => setPaymentModel(model)}
                  style={{ padding: '0.75rem 0.25rem', fontSize: '0.75rem' }}
                >
                  {model === 'COMMISSION' ? t('barbers.commission') : model === 'FIXED' ? t('barbers.fixed_salary') : t('barbers.fixed_fee_rent')}
                </button>
              ))}
            </div>
          </div>

          {paymentModel === 'COMMISSION' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>{t('barbers.service_rate_label')}</label>
                  <input type="number" step="0.01" min="0" max="1" value={serviceRate} onChange={e => setServiceRate(e.target.value)} style={{ fontWeight: '700', marginBottom: '0.25rem' }} />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('barbers.typical')}: 0.5 to 0.7</div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>{t('barbers.product_rate_label')}</label>
                  <input type="number" step="0.01" min="0" max="1" value={productRate} onChange={e => setProductRate(e.target.value)} style={{ fontWeight: '700', marginBottom: '0.25rem' }} />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('barbers.typical')}: 0.1 to 0.2</div>
                </div>
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('barbers.service_rate')}</span>
                  <span style={{ fontWeight: '800', color: 'var(--primary)' }}>{(parseFloat(serviceRate) * 100 || 0).toFixed(0)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('barbers.product_rate')}</span>
                  <span style={{ fontWeight: '800', color: 'var(--success)' }}>{(parseFloat(productRate) * 100 || 0).toFixed(0)}%</span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  {paymentModel === 'FIXED' ? t('barbers.salary_amount') : t('barbers.fee_amount')}
                </label>
                <input type="number" value={fixedAmount} onChange={e => setFixedAmount(e.target.value)} style={{ fontWeight: '700' }} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>{t('barbers.payment_period')}</label>
                <select value={fixedPeriod} onChange={e => setFixedPeriod(e.target.value as any)} style={{ fontWeight: '700' }}>
                  <option value="WEEKLY">{t('common.weekly')}</option>
                  <option value="BIWEEKLY">{t('common.biweekly')}</option>
                  <option value="MONTHLY">{t('common.monthly')}</option>
                </select>
              </div>
            </div>
          )}

          <button type="submit" style={{ width: '100%', padding: '1.1rem', fontSize: '1.1rem' }}>
            {editingBarber ? t('barbers.update_professional') : t('barbers.confirm_registration')}
          </button>
        </form>
      </Modal>
    </div>
  );
}
