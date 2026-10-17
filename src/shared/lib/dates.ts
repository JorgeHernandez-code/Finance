import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

/**
 * Fechas del dominio como strings 'YYYY-MM-DD' (igual que Postgres `date`).
 * Todo cálculo recibe `today` explícito: así los resultados son
 * deterministas y comprobables en pruebas.
 */
export type IsoDate = string;

export const toIso = (date: Date): IsoDate => format(date, 'yyyy-MM-dd');
export const fromIso = (iso: IsoDate): Date => parseISO(iso.slice(0, 10));
export const todayIso = (): IsoDate => toIso(new Date());

export const addDaysIso = (iso: IsoDate, days: number): IsoDate => toIso(addDays(fromIso(iso), days));
export const addMonthsIso = (iso: IsoDate, months: number): IsoDate => toIso(addMonths(fromIso(iso), months));
export const daysBetween = (from: IsoDate, to: IsoDate): number =>
  differenceInCalendarDays(fromIso(to), fromIso(from));
export const monthsBetween = (from: IsoDate, to: IsoDate): number =>
  differenceInCalendarMonths(fromIso(to), fromIso(from));

/** Semana ISO: lunes a domingo. */
export const weekStart = (iso: IsoDate): IsoDate => toIso(startOfWeek(fromIso(iso), { weekStartsOn: 1 }));
export const weekEnd = (iso: IsoDate): IsoDate => toIso(endOfWeek(fromIso(iso), { weekStartsOn: 1 }));
export const monthStart = (iso: IsoDate): IsoDate => toIso(startOfMonth(fromIso(iso)));
export const monthEnd = (iso: IsoDate): IsoDate => toIso(endOfMonth(fromIso(iso)));

export const isBetween = (iso: IsoDate, from: IsoDate, to: IsoDate): boolean => {
  const day = iso.slice(0, 10);
  return day >= from && day <= to;
};

export interface Period {
  type: 'week' | 'month';
  start: IsoDate;
  end: IsoDate;
}

export function periodFor(type: Period['type'], date: IsoDate): Period {
  return type === 'week'
    ? { type, start: weekStart(date), end: weekEnd(date) }
    : { type, start: monthStart(date), end: monthEnd(date) };
}

export function previousPeriod(period: Period): Period {
  return periodFor(period.type, addDaysIso(period.start, -1));
}
