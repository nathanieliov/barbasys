import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { CreateAppointment, CreateAppointmentRequest } from './booking/create-appointment.js';
import { IAppointmentRepository } from '../repositories/appointment-repository.interface.js';
import { IBarberShiftRepository } from '../repositories/barber-shift-repository.interface.js';
import { IServiceRepository } from '../repositories/service-repository.interface.js';

describe('CreateAppointment', () => {
  let createAppointment: CreateAppointment;
  let mockAppointmentRepo: Mocked<IAppointmentRepository>;
  let mockBarberShiftRepo: Mocked<IBarberShiftRepository>;
  let mockServiceRepo: Mocked<IServiceRepository>;

  beforeEach(() => {
    mockAppointmentRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByBarberAndDateRange: vi.fn(),
      checkConflict: vi.fn(),
      delete: vi.fn(),
    } as any;

    mockBarberShiftRepo = {
      findByBarberAndDay: vi.fn(),
      isBarberWorking: vi.fn(),
    } as any;

    mockServiceRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as any;

    createAppointment = new CreateAppointment(
      mockAppointmentRepo,
      mockBarberShiftRepo,
      mockServiceRepo
    );
  });

  it('should create a single appointment when no recurring rule is provided', async () => {
    const request: CreateAppointmentRequest = {
      barber_id: 1,
      customer_id: 1,
      service_id: 1,
      start_time: '2023-10-23T10:00:00.000Z',
      shop_id: 1,
    };

    mockServiceRepo.findById.mockResolvedValue({ id: 1, name: 'Haircut', duration_minutes: 30, price: 25, shop_id: 1 });
    mockBarberShiftRepo.isBarberWorking.mockResolvedValue(true);
    mockAppointmentRepo.checkConflict.mockResolvedValue(false);
    mockAppointmentRepo.create.mockResolvedValue(100);

    const result = await createAppointment.execute(request);

    expect(result.ids).toEqual([100]);
    expect(result.recurring_id).toBeNull();
    expect(mockAppointmentRepo.create).toHaveBeenCalledTimes(1);
  });

  it('should throw an error when barber is not working', async () => {
    const request: CreateAppointmentRequest = {
      barber_id: 1,
      customer_id: 1,
      service_id: 1,
      start_time: '2023-10-23T10:00:00.000Z',
      shop_id: 1,
    };

    mockServiceRepo.findById.mockResolvedValue({ id: 1, name: 'Haircut', duration_minutes: 30, price: 25, shop_id: 1 });
    mockBarberShiftRepo.isBarberWorking.mockResolvedValue(false);

    await expect(createAppointment.execute(request)).rejects.toThrow(/Barber not working/);
  });

  it('should throw an error when there is a conflict', async () => {
    const request: CreateAppointmentRequest = {
      barber_id: 1,
      customer_id: 1,
      service_id: 1,
      start_time: '2023-10-23T10:00:00.000Z',
      shop_id: 1,
    };

    mockServiceRepo.findById.mockResolvedValue({ id: 1, name: 'Haircut', duration_minutes: 30, price: 25, shop_id: 1 });
    mockBarberShiftRepo.isBarberWorking.mockResolvedValue(true);
    mockAppointmentRepo.checkConflict.mockResolvedValue(true);

    await expect(createAppointment.execute(request)).rejects.toThrow(/Conflict/);
  });

  it('should create multiple appointments for weekly recurring rule', async () => {
    const request: CreateAppointmentRequest = {
      barber_id: 1,
      customer_id: 1,
      service_id: 1,
      start_time: '2023-10-23T10:00:00.000Z', // A Monday
      recurring_rule: 'weekly',
      occurrences: 3,
      shop_id: 1,
    };

    mockServiceRepo.findById.mockResolvedValue({ id: 1, name: 'Haircut', duration_minutes: 30, price: 25, shop_id: 1 });
    mockBarberShiftRepo.isBarberWorking.mockResolvedValue(true);
    mockAppointmentRepo.checkConflict.mockResolvedValue(false);
    mockAppointmentRepo.create.mockResolvedValueOnce(101).mockResolvedValueOnce(102).mockResolvedValueOnce(103);

    const result = await createAppointment.execute(request);

    expect(result.ids).toHaveLength(3);
    expect(result.ids).toEqual([101, 102, 103]);
    expect(result.recurring_id).not.toBeNull();
    expect(mockAppointmentRepo.create).toHaveBeenCalledTimes(3);

    // Verify dates
    const calls = mockAppointmentRepo.create.mock.calls;
    expect(calls[0][0].start_time).toContain('2023-10-23');
    expect(calls[1][0].start_time).toContain('2023-10-30');
    expect(calls[2][0].start_time).toContain('2023-11-06');
  });
});
