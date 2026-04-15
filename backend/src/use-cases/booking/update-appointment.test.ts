import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateAppointment } from './UpdateAppointment.js';
import { IAppointmentRepository } from '../../repositories/appointment-repository.interface.js';
import { IServiceRepository } from '../../repositories/service-repository.interface.js';
import { IBarberShiftRepository } from '../../repositories/barber-shift-repository.interface.js';

describe('UpdateAppointment Use Case', () => {
  const mockAptRepo = { 
    findById: vi.fn(), 
    update: vi.fn(), 
    findByBarberAndDateRange: vi.fn(),
    clearItems: vi.fn(),
    addItem: vi.fn()
  } as unknown as IAppointmentRepository;
  
  const mockServiceRepo = { findById: vi.fn() } as unknown as IServiceRepository;
  const mockShiftRepo = { isBarberWorking: vi.fn() } as unknown as IBarberShiftRepository;

  const useCase = new UpdateAppointment(mockAptRepo, mockServiceRepo, mockShiftRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow customer to update their own future appointment', async () => {
    const futureDate = new Date(Date.now() + 100000).toISOString().replace('T', ' ').substring(0, 19);
    vi.mocked(mockAptRepo.findById).mockResolvedValue({
      id: 1,
      customer_id: 10,
      barber_id: 2,
      start_time: futureDate,
      total_duration_minutes: 30,
      status: 'scheduled'
    } as any);

    vi.mocked(mockShiftRepo.isBarberWorking).mockResolvedValue(true);
    vi.mocked(mockAptRepo.findByBarberAndDateRange).mockResolvedValue([]);

    await useCase.execute({
      appointment_id: 1,
      user_id: 1,
      user_role: 'CUSTOMER',
      customer_id: 10,
      new_notes: 'Updated notes'
    });

    expect(mockAptRepo.update).toHaveBeenCalledWith(expect.objectContaining({
      id: 1,
      notes: 'Updated notes'
    }));
  });

  it('should throw if conflict detected when rescheduling', async () => {
    const futureDate = new Date(Date.now() + 100000).toISOString().replace('T', ' ').substring(0, 19);
    const newDate = new Date(Date.now() + 200000).toISOString().replace('T', ' ').substring(0, 19);
    
    vi.mocked(mockAptRepo.findById).mockResolvedValue({
      id: 1,
      customer_id: 10,
      barber_id: 2,
      start_time: futureDate,
      total_duration_minutes: 30,
      status: 'scheduled'
    } as any);

    vi.mocked(mockShiftRepo.isBarberWorking).mockResolvedValue(true);
    // Mock a conflicting appointment
    vi.mocked(mockAptRepo.findByBarberAndDateRange).mockResolvedValue([
      {
        id: 2,
        start_time: newDate,
        total_duration_minutes: 30,
        status: 'scheduled'
      } as any
    ]);

    await expect(useCase.execute({
      appointment_id: 1,
      user_id: 1,
      user_role: 'CUSTOMER',
      customer_id: 10,
      new_start_time: newDate
    })).rejects.toThrow('Conflict with another appointment');
  });

  it('should update services and duration', async () => {
    const futureDate = new Date(Date.now() + 100000).toISOString().replace('T', ' ').substring(0, 19);
    
    vi.mocked(mockAptRepo.findById).mockResolvedValue({
      id: 1,
      customer_id: 10,
      barber_id: 2,
      start_time: futureDate,
      total_duration_minutes: 30,
      status: 'scheduled'
    } as any);

    vi.mocked(mockServiceRepo.findById).mockResolvedValue({
      id: 5,
      name: 'New Service',
      duration_minutes: 45,
      price: 50
    } as any);

    vi.mocked(mockShiftRepo.isBarberWorking).mockResolvedValue(true);
    vi.mocked(mockAptRepo.findByBarberAndDateRange).mockResolvedValue([]);

    await useCase.execute({
      appointment_id: 1,
      user_id: 1,
      user_role: 'CUSTOMER',
      customer_id: 10,
      new_services: [{ id: 5, quantity: 1 }]
    });

    expect(mockAptRepo.update).toHaveBeenCalledWith(expect.objectContaining({
      total_duration_minutes: 45,
      service_id: 5
    }));
    expect(mockAptRepo.clearItems).toHaveBeenCalledWith(1);
    expect(mockAptRepo.addItem).toHaveBeenCalledWith(expect.objectContaining({
      service_id: 5,
      price_at_booking: 50
    }));
  });
});
