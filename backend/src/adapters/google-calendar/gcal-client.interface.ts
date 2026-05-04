export interface BusySlot {
  start: string;
  end: string;
}

export interface CalendarEvent {
  summary: string;
  startIso: string;
  endIso: string;
}

export interface WatchResponse {
  channelId: string;
  resourceId: string;
  expiresAt: number;
}

export interface IGCalClient {
  freebusy(barberId: number, timeMin: string, timeMax: string): Promise<BusySlot[]>;
  insertEvent(barberId: number, event: CalendarEvent): Promise<string>;
  patchEvent(barberId: number, eventId: string, patch: Partial<CalendarEvent>): Promise<void>;
  deleteEvent(barberId: number, eventId: string): Promise<void>;
  watch(barberId: number, webhookUrl: string): Promise<WatchResponse>;
  stopWatch(barberId: number, channelId: string, resourceId: string): Promise<void>;
}
