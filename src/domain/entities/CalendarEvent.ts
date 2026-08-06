export type CalendarEventType = 'subscription' | 'debt' | 'savings_goal';

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  amount: number | null;
  color: string;
  href: string;
}
