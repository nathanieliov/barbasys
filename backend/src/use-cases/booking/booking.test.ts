import { describe, it, expect, vi } from 'vitest';
import { CreateAppointment } from './create-appointment.js';
import { IAppointmentRepository } from '../../repositories/appointment-repository.interface.js';
import { IBarberShiftRepository } from '../../repositories/barber-shift-repository.interface.js';
import { IServiceRepository } from '../../repositories/service-repository.interface.js';

describe('CreateAppointment Use Case', () => {
  const mockAptRepo = { create: vi.fn(), checkConflict: vi.fn() } as unknown as IAppointmentRepository;
  const mockShiftRepo = { isBarberWorking: vi.fn() } as unknown as IBarberShiftRepository;
  const mockServiceRepo = { findById: vi.fn() } as unknown as IServiceRepository;

  const useCase = new CreateAppointment(mockAptRepo, mockShiftRepo, mockServiceRepo);

  it('should create a single appointment successfully', async () => {
    vi.mocked(mockServiceRepo.findById).mockResolvedValue({ id: 1, duration_minutes: 30 } as any);
    vi.mocked(mockShiftRepo.isBarberWorking).mockResolvedValue(true);
    vi.mocked(mockAptRepo.checkConflict).mockResolvedValue(false);
    vi.mocked(mockAptRepo.create).mockResolvedValue(101);

    const result = await useCase.execute({
      barber_id: 1,
      customer_id: 1,
      service_id: 1,
      start_time: '2026-04-01T10:00:00',
      shop_id: 1
    });

    expect(result.ids).toEqual([101]);
    expect(mockAptRepo.create).toHaveBeenCalled();
  });

  it('should throw if barber not working', async () => {
    vi.mocked(mockServiceRepo.findById).mockResolvedValue({ id: 1, duration_minutes: 30 } as any);
    vi.mocked(mockShiftRepo.isBarberWorking).mockResolvedValue(false);

    await expect(useCase.execute({
      barber_id: 1,
      customer_id: 1,
      service_id: 1,
      start_time: '2026-04-01T10:00:00',
      shop_id: 1
    })).rejects.toThrow(/Barber not working/);
  });

  it('should throw if conflict exists', async () => {
    vi.mocked(mockServiceRepo.findById).mockResolvedValue({ id: 1, duration_minutes: 30 } as any);
    vi.mocked(mockShiftRepo.isBarberWorking).mockResolvedValue(true);
    vi.mocked(mockAptRepo.checkConflict).mockResolvedValue(true);

    await expect(useCase.execute({
      barber_id: 1,
      customer_id: 1,
      service_id: 1,
      start_time: '2026-04-01T10:00:00',
      shop_id: 1
    })).rejects.toThrow(/Conflict/);
  });
});
