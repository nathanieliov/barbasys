import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CancelAppointment } from './CancelAppointment.js';
import { IAppointmentRepository } from '../../repositories/appointment-repository.interface.js';
import { ICustomerRepository } from '../../repositories/customer-repository.interface.js';
import { IBarberRepository } from '../../repositories/barber-repository.interface.js';
import { IServiceRepository } from '../../repositories/service-repository.interface.js';
import * as communication from '../../communication.js';

vi.mock('../../communication.js', () => ({
  sendAppointmentNotification: vi.fn()
}));

describe('CancelAppointment Use Case', () => {
  const mockAptRepo = { findById: vi.fn(), updateStatus: vi.fn() } as unknown as IAppointmentRepository;
  const mockCustRepo = { findById: vi.fn() } as unknown as ICustomerRepository;
  const mockBarberRepo = { findById: vi.fn() } as unknown as IBarberRepository;
  const mockServiceRepo = { findById: vi.fn() } as unknown as IServiceRepository;

  const useCase = new CancelAppointment(mockAptRepo, mockCustRepo, mockBarberRepo, mockServiceRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow customer to cancel their own future appointment', async () => {
    const futureDate = new Date(Date.now() + 100000).toISOString().replace('T', ' ').substring(0, 19);
    vi.mocked(mockAptRepo.findById).mockResolvedValue({
      id: 1,
      customer_id: 10,
      start_time: futureDate,
      status: 'scheduled'
    } as any);

    await useCase.execute({
      appointment_id: 1,
      user_id: 1,
      user_role: 'CUSTOMER',
      customer_id: 10
    });

    expect(mockAptRepo.updateStatus).toHaveBeenCalledWith(1, 'cancelled');
    expect(communication.sendAppointmentNotification).not.toHaveBeenCalled();
  });

  it('should throw if customer tries to cancel others appointment', async () => {
    vi.mocked(mockAptRepo.findById).mockResolvedValue({
      id: 1,
      customer_id: 10,
      status: 'scheduled'
    } as any);

    await expect(useCase.execute({
      appointment_id: 1,
      user_id: 1,
      user_role: 'CUSTOMER',
      customer_id: 11
    })).rejects.toThrow('You can only cancel your own appointments');
  });

  it('should throw if customer tries to cancel past appointment', async () => {
    const pastDate = new Date(Date.now() - 1000000000).toISOString().replace('T', ' ').substring(0, 19);
    vi.mocked(mockAptRepo.findById).mockResolvedValue({
      id: 1,
      customer_id: 10,
      start_time: pastDate,
      status: 'scheduled'
    } as any);

    await expect(useCase.execute({
      appointment_id: 1,
      user_id: 1,
      user_role: 'CUSTOMER',
      customer_id: 10
    })).rejects.toThrow('Cannot cancel past appointments');
  });

  it('should allow staff to cancel any appointment and trigger notification', async () => {
    vi.mocked(mockAptRepo.findById).mockResolvedValue({
      id: 1,
      customer_id: 10,
      barber_id: 2,
      service_id: 3,
      start_time: '2026-01-01 10:00:00',
      status: 'scheduled'
    } as any);
    vi.mocked(mockCustRepo.findById).mockResolvedValue({ id: 10, name: 'Test Client', email: 'test@example.com' } as any);
    vi.mocked(mockBarberRepo.findById).mockResolvedValue({ id: 2, name: 'Test Barber' } as any);
    vi.mocked(mockServiceRepo.findById).mockResolvedValue({ id: 3, name: 'Test Service' } as any);

    await useCase.execute({
      appointment_id: 1,
      user_id: 100,
      user_role: 'BARBER'
    });

    expect(mockAptRepo.updateStatus).toHaveBeenCalledWith(1, 'cancelled');
    expect(communication.sendAppointmentNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'cancellation',
      customer_email: 'test@example.com'
    }));
  });
});
