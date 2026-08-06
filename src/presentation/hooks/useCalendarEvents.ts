'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/infrastructure/supabase/client';
import { SupabaseCalendarRepository } from '@/infrastructure/supabase/repositories/SupabaseCalendarRepository';
import { GetCalendarEvents } from '@/application/use-cases/calendar/GetCalendarEvents';
import type { CalendarEvent } from '@/domain/entities/CalendarEvent';

/**
 * `initialData` solo aplica al mes calculado server-side (initialFrom/initialTo);
 * para cualquier otro mes se pasa `undefined` explícitamente (no un valor
 * "reciclado") para no sembrar el cache de un mes con eventos de otro —
 * mismo criterio que useReportSummary.
 */
export function useCalendarEvents(
  userId: string,
  from: string,
  to: string,
  initialRange: { from: string; to: string },
  initialData: CalendarEvent[]
) {
  const isInitialRange = from === initialRange.from && to === initialRange.to;

  return useQuery({
    queryKey: ['calendar-events', userId, from, to],
    queryFn: async () => {
      const supabase = createClient();
      return new GetCalendarEvents(new SupabaseCalendarRepository(supabase)).execute(userId, { from, to });
    },
    initialData: isInitialRange ? initialData : undefined,
    placeholderData: (previous) => previous,
    staleTime: 30 * 1000,
  });
}
