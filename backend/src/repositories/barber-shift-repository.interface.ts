export interface BarberShift {
  id: number;
  barber_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface IBarberShiftRepository {
  findByBarberAndDay(barberId: number, dayOfWeek: number): Promise<BarberShift[]>;
  isBarberWorking(barberId: number, dayOfWeek: number, time: string): Promise<boolean>;
  checkRangeWorking(barberId: number, dayOfWeek: number, startTime: string, endTime: string): Promise<boolean>;
  checkTimeOffConflict(barberId: number, start: string, end: string): Promise<boolean>;
}
