import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAvailableSlots } from './GetAvailableSlots.js';
import { IAppointmentRepository } from '../../repositories/appointment-repository.interface.js';
import { IBarberShiftRepository } from '../../repositories/barber-shift-repository.interface.js';
import { Database } from 'better-sqlite3';

describe('GetAvailableSlots Use Case', () => {
  const mockAptRepo = { findByBarberAndDateRange: vi.fn() } as unknown as IAppointmentRepository;
  const mockShiftRepo = { findByBarberAndDay: vi.fn() } as unknown as IBarberShiftRepository;
  const mockDb = { prepare: vi.fn() } as unknown as Database;

  const useCase = new GetAvailableSlots(mockAptRepo, mockShiftRepo, mockDb);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return available slots based on shifts', async () => {
    vi.mocked(mockShiftRepo.findByBarberAndDay).mockResolvedValue([
      { id: 1, barber_id: 1, day_of_week: 1, start_time: '09:00', end_time: '10:00' }
    ]);
    vi.mocked(mockAptRepo.findByBarberAndDateRange).mockResolvedValue([]);
    vi.mocked(mockDb.prepare).mockReturnValue({
      all: vi.fn().mockReturnValue([])
    } as any);

    const slots = await useCase.execute({ barber_id: 1, date: '2026-04-06', duration: 30 }); // Monday

    expect(slots).toEqual(['09:00', '09:15', '09:30']);
  });

  it('should handle slot exactly at shift boundaries', async () => {
    vi.mocked(mockShiftRepo.findByBarberAndDay).mockResolvedValue([
      { id: 1, barber_id: 1, day_of_week: 1, start_time: '09:00', end_time: '10:00' }
    ]);
    vi.mocked(mockAptRepo.findByBarberAndDateRange).mockResolvedValue([]);
    vi.mocked(mockDb.prepare).mockReturnValue({
      all: vi.fn().mockReturnValue([])
    } as any);

    // Slot 09:30 to 10:00 should be the last one
    const slots = await useCase.execute({ barber_id: 1, date: '2026-04-06', duration: 30 });
    expect(slots).toContain('09:30');
    expect(slots).not.toContain('09:45'); // 09:45 to 10:15 would exceed boundary
  });

  it('should return empty array if no shifts for that day', async () => {
    vi.mocked(mockShiftRepo.findByBarberAndDay).mockResolvedValue([]);
    
    const slots = await useCase.execute({ barber_id: 1, date: '2026-04-06', duration: 30 });
    expect(slots).toEqual([]);
  });

  it('should filter out slots that conflict with existing appointments', async () => {
    vi.mocked(mockShiftRepo.findByBarberAndDay).mockResolvedValue([
      { id: 1, barber_id: 1, day_of_week: 1, start_time: '09:00', end_time: '10:00' }
    ]);
    
    // Existing appointment at 09:15 - 09:45
    vi.mocked(mockAptRepo.findByBarberAndDateRange).mockResolvedValue([
      { id: 101, start_time: '2026-04-06 09:15:00', total_duration_minutes: 30 } as any
    ]);
    
    vi.mocked(mockDb.prepare).mockReturnValue({
      all: vi.fn().mockReturnValue([])
    } as any);

    const slots = await useCase.execute({ barber_id: 1, date: '2026-04-06', duration: 30 });

    expect(slots).not.toContain('09:00'); // 09:00-09:30 overlaps 09:15-09:45
    expect(slots).not.toContain('09:15'); // 09:15-09:45 overlaps 09:15-09:45
    expect(slots).not.toContain('09:30'); // 09:30-10:00 overlaps 09:15-09:45
    expect(slots).toEqual([]);
  });

  it('should handle partial overlap with existing appointment', async () => {
    vi.mocked(mockShiftRepo.findByBarberAndDay).mockResolvedValue([
      { id: 1, barber_id: 1, day_of_week: 1, start_time: '09:00', end_time: '11:00' }
    ]);
    
    // Existing appointment at 09:45 - 10:15
    vi.mocked(mockAptRepo.findByBarberAndDateRange).mockResolvedValue([
      { id: 101, start_time: '2026-04-06 09:45:00', total_duration_minutes: 30 } as any
    ]);
    
    vi.mocked(mockDb.prepare).mockReturnValue({
      all: vi.fn().mockReturnValue([])
    } as any);

    const slots = await useCase.execute({ barber_id: 1, date: '2026-04-06', duration: 30 });

    // 09:00-09:30 OK
    // 09:15-09:45 OK (Ends exactly when appointment starts)
    // 09:30-10:00 Conflict (Overlaps 09:45-10:15)
    // 09:45-10:15 Conflict
    // 10:00-10:30 Conflict
    // 10:15-10:45 OK (Starts exactly when appointment ends)
    // 10:30-11:00 OK
    expect(slots).toContain('09:00');
    expect(slots).toContain('09:15');
    expect(slots).not.toContain('09:30');
    expect(slots).not.toContain('09:45');
    expect(slots).not.toContain('10:00');
    expect(slots).toContain('10:15');
    expect(slots).toContain('10:30');
  });

  it('should filter out slots that conflict with time off', async () => {
    vi.mocked(mockShiftRepo.findByBarberAndDay).mockResolvedValue([
      { id: 1, barber_id: 1, day_of_week: 1, start_time: '09:00', end_time: '10:00' }
    ]);
    vi.mocked(mockAptRepo.findByBarberAndDateRange).mockResolvedValue([]);
    
    // Time off from 09:00 to 09:30
    vi.mocked(mockDb.prepare).mockReturnValue({
      all: vi.fn().mockReturnValue([{ start_time: '2026-04-06T09:00:00', end_time: '2026-04-06T09:30:00' }])
    } as any);

    const slots = await useCase.execute({ barber_id: 1, date: '2026-04-06', duration: 30 });

    // 09:00 -> 09:30 (Conflicts with time off)
    // 09:15 -> 09:45 (Conflicts)
    // 09:30 -> 10:00 (OK)
    expect(slots).toEqual(['09:30']);
  });
});
