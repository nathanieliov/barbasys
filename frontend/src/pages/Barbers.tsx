import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { UserPlus, User, Phone, Mail, Trash2, Edit2 } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/format';
import { useTranslation } from 'react-i18next';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Avatar from '../components/Avatar';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

const BARBER_TONES = ['var(--primary)', 'var(--sage)', 'var(--plum)', 'var(--butter)', '#7d8ca3'];

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
    <>
      <div className="page-head">
        <div>
          <h1>{t('barbers.title')}</h1>
          <div className="sub">{barbers.length} {t('barbers.active', 'active')}</div>
        </div>
        <div className="spacer" />
        <button className="btn btn-accent" onClick={() => { setEditingBarber(null); setShowModal(true); }}>
          <UserPlus size={16} /> {t('barbers.add_professional', 'Add barber')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {barbers.map((b, i) => (
          <div key={b.id} className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <Avatar
                  initials={(b.fullname || b.name || '').slice(0, 2).toUpperCase()}
                  tone={BARBER_TONES[i % BARBER_TONES.length]}
                  size={56}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{b.fullname || b.name}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {b.payment_model === 'COMMISSION' ? t('barbers.commission_based', 'Commission') : b.payment_model === 'FIXED' ? t('barbers.salary', 'Salary') : t('barbers.rental_fee', 'Booth rental')}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-soft btn-sm" style={{ padding: '0 10px' }} onClick={() => startEdit(b)} aria-label={t('common.edit')}>
                  <Edit2 size={14} />
                </button>
                <button className="btn btn-soft btn-sm" style={{ padding: '0 10px', color: 'var(--danger)' }} onClick={() => deleteBarber(b.id, b.fullname || b.name)} aria-label={t('common.delete')}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <hr className="divider" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {b.payment_model === 'FIXED' || b.payment_model === 'FIXED_FEE' ? (
                <div style={{ gridColumn: '1 / -1', background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 'var(--r)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>
                      {b.payment_model === 'FIXED' ? t('barbers.salary') : t('barbers.rental_fee')}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--ink)' }}>
                      {formatCurrency(b.fixed_amount, settings.currency_symbol)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>{t('barbers.period')}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{t(`common.${b.fixed_period?.toLowerCase() || 'monthly'}`)}</div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 'var(--r)' }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>
                      {t('barbers.service_rate')}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{(b.service_commission_rate * 100).toFixed(0)}%</div>
                  </div>
                  <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 'var(--r)' }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>
                      {t('barbers.product_rate')}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{(b.product_commission_rate * 100).toFixed(0)}%</div>
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

          <button className="btn btn-accent" type="submit" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            {editingBarber ? t('barbers.update_professional') : t('barbers.confirm_registration')}
          </button>
        </form>
      </Modal>
    </>
  );
}
