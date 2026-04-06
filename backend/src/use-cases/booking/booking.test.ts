import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateAppointment } from './create-appointment.js';
import { IAppointmentRepository } from '../../repositories/appointment-repository.interface.js';
import { IBarberShiftRepository } from '../../repositories/barber-shift-repository.interface.js';
import { IServiceRepository } from '../../repositories/service-repository.interface.js';

describe('CreateAppointment Use Case', () => {
  const mockAptRepo = { create: vi.fn(), checkConflict: vi.fn(), addItem: vi.fn() } as unknown as IAppointmentRepository;
  const mockShiftRepo = { isBarberWorking: vi.fn() } as unknown as IBarberShiftRepository;
  const mockDb = { findById: vi.fn() } as any; // Not used but maybe needed by constructor? 
  const mockServiceRepo = { findById: vi.fn() } as unknown as IServiceRepository;

  const useCase = new CreateAppointment(mockAptRepo, mockShiftRepo, mockServiceRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a single appointment successfully', async () => {
    vi.mocked(mockServiceRepo.findById).mockResolvedValue({ id: 1, duration_minutes: 30, price: 500 } as any);
    vi.mocked(mockShiftRepo.isBarberWorking).mockResolvedValue(true);
    vi.mocked(mockAptRepo.checkConflict).mockResolvedValue(false);
    vi.mocked(mockAptRepo.create).mockResolvedValue(101);

    const result = await useCase.execute({
      barber_id: 1,
      customer_id: 1,
      services: [{ id: 1, quantity: 1 }],
      start_time: '2026-04-01T10:00:00',
      shop_id: 1
    });

    expect(result.ids).toEqual([101]);
    expect(mockAptRepo.create).toHaveBeenCalled();
    expect(mockAptRepo.addItem).toHaveBeenCalled();
  });

  it('should throw if barber not working', async () => {
    vi.mocked(mockServiceRepo.findById).mockResolvedValue({ id: 1, duration_minutes: 30 } as any);
    vi.mocked(mockShiftRepo.isBarberWorking).mockResolvedValue(false);

    await expect(useCase.execute({
      barber_id: 1,
      customer_id: 1,
      services: [{ id: 1, quantity: 1 }],
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
      services: [{ id: 1, quantity: 1 }],
      start_time: '2026-04-01T10:00:00',
      shop_id: 1
    })).rejects.toThrow(/Conflict/);
  });

  it('should calculate total duration correctly for multiple services', async () => {
    const s1 = { id: 1, duration_minutes: 30, price: 100 };
    const s2 = { id: 2, duration_minutes: 15, price: 50 };
    vi.mocked(mockServiceRepo.findById)
      .mockResolvedValueOnce(s1 as any)
      .mockResolvedValueOnce(s2 as any);
    vi.mocked(mockShiftRepo.isBarberWorking).mockResolvedValue(true);
    vi.mocked(mockAptRepo.checkConflict).mockResolvedValue(false);
    vi.mocked(mockAptRepo.create).mockResolvedValue(201);

    await useCase.execute({
      barber_id: 1,
      customer_id: 1,
      services: [{ id: 1, quantity: 1 }, { id: 2, quantity: 2 }], // 30 + 15*2 = 60 mins
      start_time: '2026-04-01T10:00:00',
      shop_id: 1
    });

    // Verify total_duration_minutes is 60
    expect(mockAptRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      total_duration_minutes: 60
    }));
    expect(mockAptRepo.addItem).toHaveBeenCalledTimes(2);
  });

  it('should throw if conflict on the second occurrence of a recurring appointment', async () => {
    vi.mocked(mockServiceRepo.findById).mockResolvedValue({ id: 1, duration_minutes: 30, price: 100 } as any);
    vi.mocked(mockShiftRepo.isBarberWorking).mockResolvedValue(true);
    
    // First call (1st occurrence) -> no conflict
    // Second call (2nd occurrence) -> conflict
    vi.mocked(mockAptRepo.checkConflict)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expect(useCase.execute({
      barber_id: 1,
      customer_id: 1,
      services: [{ id: 1, quantity: 1 }],
      start_time: '2026-04-01T10:00:00',
      recurring_rule: 'weekly',
      occurrences: 2,
      shop_id: 1
    })).rejects.toThrow(/Conflict on/);

    // Should have called create once for the first occurrence before failing on the second
    expect(mockAptRepo.create).toHaveBeenCalledTimes(1);
  });
});
