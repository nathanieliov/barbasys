import { IAppointmentRepository } from '../../repositories/appointment-repository.interface.js';
import { IBarberShiftRepository } from '../../repositories/barber-shift-repository.interface.js';
import { Database } from 'better-sqlite3';
import { GetAvailabilityRequest, GetAvailabilityResponse } from '@barbasys/shared';

export class GetAvailableSlots {
  constructor(
    private appointmentRepo: IAppointmentRepository,
    private shiftRepo: IBarberShiftRepository,
    private db: Database
  ) {}

  async execute(request: GetAvailabilityRequest): Promise<GetAvailabilityResponse> {
    const { barber_id: barberId, date, duration: durationMinutes } = request;
    // Robust date parsing to avoid timezone offsets (date is "YYYY-MM-DD")
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();
    
    const shifts = await this.shiftRepo.findByBarberAndDay(barberId, dayOfWeek);

    if (shifts.length === 0) return [];

    // Get appointments for this day (including overlaps from yesterday)
    const dayStart = `${date} 00:00:00`;
    const dayEnd = `${date} 23:59:59`;
    const appointments = await this.appointmentRepo.findByBarberAndDateRange(barberId, dayStart, dayEnd);

    // Get time off for this day (more robust overlap check)
    const timeOff = this.db.prepare(`
      SELECT start_time, end_time FROM barber_time_off 
      WHERE barber_id = ? 
      AND datetime(start_time) < datetime(?) 
      AND datetime(end_time) > datetime(?)
    `).all(barberId, dayEnd, dayStart) as any[];

    const availableSlots: string[] = [];
    const now = new Date();
    const nowLocalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

    for (const shift of shifts) {
      const [startH, startM] = shift.start_time.split(':').map(Number);
      const [endH, endM] = shift.end_time.split(':').map(Number);
      
      let currentTimeObj = new Date(year, month - 1, day, startH, startM, 0);
      const shiftEndTs = new Date(year, month - 1, day, endH, endM, 0).getTime();

      // 15-minute intervals
      while (currentTimeObj.getTime() + durationMinutes * 60000 <= shiftEndTs) {
        const slotStartTs = currentTimeObj.getTime();
        const slotEndTs = slotStartTs + durationMinutes * 60000;
        
        const slotStartStr = currentTimeObj.toTimeString().split(' ')[0].substring(0, 5);
        const slotDateTimeStr = `${date} ${slotStartStr}:00`;

        // Don't show slots in the past (using wall-clock comparison)
        if (slotDateTimeStr < nowLocalStr) {
          currentTimeObj = new Date(currentTimeObj.getTime() + 15 * 60000);
          continue;
        }

        // Check against appointments
        const hasConflict = appointments.some(appt => {
          // Parse appointment start time (stored as local time)
          const apptStartTs = new Date(appt.start_time.replace(' ', 'T')).getTime();
          const apptEndTs = apptStartTs + appt.total_duration_minutes * 60000;
          
          // Overlap check: (StartA < EndB) && (EndA > StartB)
          return (slotStartTs < apptEndTs && slotEndTs > apptStartTs);
        });

        // Check against time off
        const hasTimeOff = timeOff.some(to => {
          const toStartTs = new Date(to.start_time.replace(' ', 'T')).getTime();
          const toEndTs = new Date(to.end_time.replace(' ', 'T')).getTime();
          return (slotStartTs < toEndTs && slotEndTs > toStartTs);
        });

        if (!hasConflict && !hasTimeOff) {
          availableSlots.push(slotStartStr);
        }

        currentTimeObj = new Date(currentTimeObj.getTime() + 15 * 60000); // Check every 15 mins
      }
    }

    return Array.from(new Set(availableSlots)).sort();
  }
}
