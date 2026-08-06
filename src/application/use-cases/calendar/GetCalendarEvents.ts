import type { ICalendarRepository } from '@/domain/repositories/ICalendarRepository';
import type { CalendarEvent } from '@/domain/entities/CalendarEvent';
import { calendarRangeSchema, type CalendarRangeDto } from '@/application/dto/calendar';

export class GetCalendarEvents {
  constructor(private readonly calendarRepository: ICalendarRepository) {}

  async execute(userId: string, rawRange: CalendarRangeDto): Promise<CalendarEvent[]> {
    const { from, to } = calendarRangeSchema.parse(rawRange);
    return this.calendarRepository.getEventsInRange(userId, from, to);
  }
}
