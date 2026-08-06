import { redirect } from 'next/navigation';
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseCalendarRepository } from '@/infrastructure/supabase/repositories/SupabaseCalendarRepository';
import { GetCalendarEvents } from '@/application/use-cases/calendar/GetCalendarEvents';
import { CalendarView } from '@/presentation/components/modules/calendar/CalendarView';

export const metadata = { title: 'Calendario' };

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const now = new Date();
  const monthStart = startOfMonth(now);
  const range = {
    from: format(startOfWeek(monthStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    to: format(endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  };

  const events = await new GetCalendarEvents(new SupabaseCalendarRepository(supabase)).execute(user.id, range);

  return (
    <CalendarView
      userId={user.id}
      initialMonth={format(monthStart, 'yyyy-MM-dd')}
      initialRange={range}
      initialData={events}
    />
  );
}
