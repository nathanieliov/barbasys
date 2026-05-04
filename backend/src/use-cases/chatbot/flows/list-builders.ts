import type { Service, Barber } from '../../../domain/entities.js';

interface ListItem {
  id: string;
  title: string;
}

interface ListResult {
  header: string;
  body: string;
  buttonText: string;
  items: ListItem[];
}

export function buildBarberList(barbers: Barber[]): ListResult {
  return {
    header: 'Select a Barber',
    body: 'Choose your preferred barber:',
    buttonText: 'Barbers',
    items: barbers.map(b => ({
      id: String(b.id),
      title: b.fullname,
    })),
  };
}

export function buildServiceList(services: Service[], language: 'es' | 'en'): ListResult {
  return {
    header: language === 'es' ? 'Selecciona un Servicio' : 'Select a Service',
    body: language === 'es' ? 'Elige el servicio que deseas:' : 'Choose your desired service:',
    buttonText: language === 'es' ? 'Servicios' : 'Services',
    items: services.map(s => ({
      id: String(s.id),
      title: `${s.name} - $${s.price} (${s.duration_minutes} min)`,
    })),
  };
}

export function buildDateList(language: 'es' | 'en'): ListResult {
  const dates: ListItem[] = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    dates.push({
      id: dateStr,
      title: dayName,
    });
  }

  return {
    header: language === 'es' ? 'Selecciona una Fecha' : 'Select a Date',
    body: language === 'es' ? 'Elige una fecha disponible:' : 'Choose an available date:',
    buttonText: language === 'es' ? 'Fechas' : 'Dates',
    items: dates,
  };
}

export function buildSlotList(slots: string[], language: 'es' | 'en'): ListResult {
  return {
    header: language === 'es' ? 'Selecciona una Hora' : 'Select a Time',
    body: language === 'es' ? 'Elige una hora disponible:' : 'Choose an available time:',
    buttonText: language === 'es' ? 'Horas' : 'Times',
    items: slots.map(slot => ({
      id: slot,
      title: language === 'es' ? slot : formatTimeAMPM(slot),
    })),
  };
}

function formatTimeAMPM(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}
