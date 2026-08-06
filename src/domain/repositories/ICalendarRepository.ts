import type { CalendarEvent } from '@/domain/entities/CalendarEvent';

export interface ICalendarRepository {
  /** from/to en formato YYYY-MM-DD, inclusive. */
  getEventsInRange(userId: string, from: string, to: string): Promise<CalendarEvent[]>;
}
