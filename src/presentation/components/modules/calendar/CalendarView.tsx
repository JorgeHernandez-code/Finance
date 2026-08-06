'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, RefreshCw, HandCoins, Target } from 'lucide-react';
import { useCalendarEvents } from '@/presentation/hooks/useCalendarEvents';
import { formatMoney } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import type { CalendarEvent, CalendarEventType } from '@/domain/entities/CalendarEvent';
import { Button } from '@/presentation/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const TYPE_ICON: Record<CalendarEventType, typeof RefreshCw> = {
  subscription: RefreshCw,
  debt: HandCoins,
  savings_goal: Target,
};

interface CalendarViewProps {
  userId: string;
  initialMonth: string;
  initialRange: { from: string; to: string };
  initialData: CalendarEvent[];
}

function monthRange(monthStart: Date): { from: string; to: string } {
  const gridStart = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
  return { from: format(gridStart, 'yyyy-MM-dd'), to: format(gridEnd, 'yyyy-MM-dd') };
}

export function CalendarView({ userId, initialMonth, initialRange, initialData }: CalendarViewProps) {
  const [monthStart, setMonthStart] = useState(() => parseISO(initialMonth));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const range = useMemo(() => monthRange(monthStart), [monthStart]);
  const { data: events = [], isFetching } = useCalendarEvents(userId, range.from, range.to, initialRange, initialData);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  const days = useMemo(() => eachDayOfInterval({ start: parseISO(range.from), end: parseISO(range.to) }), [range]);

  const upcoming = useMemo(
    () =>
      [...events]
        .filter((event) => event.date >= format(new Date(), 'yyyy-MM-dd'))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 8),
    [events]
  );

  const selectedEvents = selectedDate ? (eventsByDay.get(selectedDate) ?? []) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Calendario</h1>
          <p className="text-sm text-muted-foreground">Renovaciones, vencimientos de deudas y metas de ahorro.</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="size-8" onClick={() => setMonthStart((m) => subMonths(m, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium capitalize text-foreground">
            {format(monthStart, 'MMMM yyyy', { locale: es })}
          </span>
          <Button variant="outline" size="icon" className="size-8" onClick={() => setMonthStart((m) => addMonths(m, 1))}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMonthStart(startOfMonth(new Date()))}>
            Hoy
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-1.5">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDay.get(dayKey) ?? [];
                const inMonth = isSameMonth(day, monthStart);
                const selected = selectedDate === dayKey;

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => setSelectedDate(selected ? null : dayKey)}
                    className={cn(
                      'flex min-h-20 flex-col items-start gap-1 rounded-md border border-transparent p-1.5 text-left transition-colors hover:bg-muted/60',
                      !inMonth && 'opacity-40',
                      selected && 'border-primary bg-primary/10',
                      isToday(day) && !selected && 'bg-muted/40'
                    )}
                  >
                    <span className={cn('text-xs font-medium', isToday(day) ? 'text-primary' : 'text-foreground')}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span key={event.id} className="size-1.5 rounded-full" style={{ backgroundColor: event.color }} />
                      ))}
                      {dayEvents.length > 3 && <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(parseISO(selectedDate), "d 'de' MMMM", { locale: es }) : 'Próximos eventos'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(selectedDate ? selectedEvents : upcoming).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {selectedDate ? 'Sin eventos este día.' : 'Sin eventos próximos.'}
              </p>
            ) : (
              (selectedDate ? selectedEvents : upcoming).map((event) => {
                const Icon = TYPE_ICON[event.type];
                return (
                  <Link
                    key={event.id}
                    href={event.href}
                    className="flex items-center gap-3 rounded-md border border-border/60 p-2.5 transition-colors hover:bg-muted/40"
                  >
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${event.color}22`, color: event.color }}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(event.date), 'd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                    {event.amount !== null && (
                      <span className="tabular shrink-0 text-sm font-medium text-foreground">{formatMoney(event.amount)}</span>
                    )}
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {isFetching && <p className="text-center text-xs text-muted-foreground">Actualizando...</p>}
    </div>
  );
}
