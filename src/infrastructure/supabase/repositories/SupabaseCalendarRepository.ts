import type { SupabaseClient } from '@supabase/supabase-js';
import { addMonths, addWeeks, addYears, format, parseISO } from 'date-fns';
import type { Database } from '@/shared/types/database';
import type { ICalendarRepository } from '@/domain/repositories/ICalendarRepository';
import type { CalendarEvent } from '@/domain/entities/CalendarEvent';

import type { BillingCycle } from '@/domain/finance/snapshot';

function advance(date: Date, cycle: BillingCycle): Date {
  if (cycle === 'weekly') return addWeeks(date, 1);
  if (cycle === 'biweekly') return addWeeks(date, 2);
  if (cycle === 'monthly') return addMonths(date, 1);
  if (cycle === 'quarterly') return addMonths(date, 3);
  return addYears(date, 1);
}

/**
 * `subscriptions.next_billing_date` guarda solo la próxima fecha de cobro,
 * no una serie recurrente — para que el calendario muestre renovaciones en
 * cualquier mes que el usuario navegue (no solo el mes de next_billing_date),
 * se "rueda" la fecha hacia adelante según billing_cycle hasta cubrir el
 * rango pedido. El guard evita loops infinitos ante datos corruptos.
 */
function projectOccurrences(startDate: string, cycle: BillingCycle, from: Date, to: Date): string[] {
  let current = parseISO(startDate);
  let guard = 0;

  while (current < from && guard < 1000) {
    current = advance(current, cycle);
    guard++;
  }

  const occurrences: string[] = [];
  while (current <= to && guard < 2000) {
    occurrences.push(format(current, 'yyyy-MM-dd'));
    current = advance(current, cycle);
    guard++;
  }

  return occurrences;
}

export class SupabaseCalendarRepository implements ICalendarRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getEventsInRange(userId: string, from: string, to: string): Promise<CalendarEvent[]> {
    const fromDate = parseISO(from);
    const toDate = parseISO(to);

    const [subscriptionsRes, debtsRes, savingsRes] = await Promise.all([
      this.client
        .from('subscriptions')
        .select('id, name, amount, billing_cycle, next_billing_date, color')
        .eq('user_id', userId)
        .eq('status', 'active'),
      this.client
        .from('debts')
        .select(
          'id, creditor_name, principal_amount, installment_amount, due_date, next_payment_date, direction, status'
        )
        .eq('user_id', userId)
        .neq('status', 'paid'),
      this.client
        .from('savings_goals')
        .select('id, name, target_amount, target_date, color')
        .eq('user_id', userId)
        .eq('status', 'active')
        .not('target_date', 'is', null)
        .gte('target_date', from)
        .lte('target_date', to),
    ]);

    if (subscriptionsRes.error) {
      console.error('[SupabaseCalendarRepository.getEventsInRange subscriptions]', subscriptionsRes.error);
      throw new Error(`No se pudieron cargar las suscripciones: ${subscriptionsRes.error.message}`);
    }
    if (debtsRes.error) {
      console.error('[SupabaseCalendarRepository.getEventsInRange debts]', debtsRes.error);
      throw new Error(`No se pudieron cargar las deudas: ${debtsRes.error.message}`);
    }
    if (savingsRes.error) {
      console.error('[SupabaseCalendarRepository.getEventsInRange savings]', savingsRes.error);
      throw new Error(`No se pudieron cargar las metas de ahorro: ${savingsRes.error.message}`);
    }

    const events: CalendarEvent[] = [];

    for (const sub of subscriptionsRes.data ?? []) {
      const occurrences = projectOccurrences(sub.next_billing_date, sub.billing_cycle, fromDate, toDate);
      for (const date of occurrences) {
        events.push({
          id: `subscription-${sub.id}-${date}`,
          type: 'subscription',
          title: sub.name,
          date,
          amount: sub.amount,
          color: sub.color,
          href: '/subscriptions',
        });
      }
    }

    // Fechas ACORDADAS: próximo pago (cuota) y vencimiento final. Las deudas
    // sin fecha no aparecen: no hay nada acordado que mostrar.
    for (const debt of debtsRes.data ?? []) {
      const verb = debt.direction === 'i_owe' ? 'Pagar a' : 'Cobrar a';
      const color = debt.direction === 'i_owe' ? '#ef4444' : '#22c55e';
      if (debt.next_payment_date && debt.next_payment_date >= from && debt.next_payment_date <= to) {
        events.push({
          id: `debt-next-${debt.id}`,
          type: 'debt',
          title: `${verb} ${debt.creditor_name} (cuota)`,
          date: debt.next_payment_date,
          amount: debt.installment_amount ?? debt.principal_amount,
          color,
          href: '/debts',
        });
      }
      if (
        debt.due_date &&
        debt.due_date >= from &&
        debt.due_date <= to &&
        debt.due_date !== debt.next_payment_date
      ) {
        events.push({
          id: `debt-${debt.id}`,
          type: 'debt',
          title: `${verb} ${debt.creditor_name} (vencimiento)`,
          date: debt.due_date,
          amount: debt.principal_amount,
          color,
          href: '/debts',
        });
      }
    }

    for (const goal of savingsRes.data ?? []) {
      if (!goal.target_date) continue;
      events.push({
        id: `savings-${goal.id}`,
        type: 'savings_goal',
        title: `Meta: ${goal.name}`,
        date: goal.target_date,
        amount: goal.target_amount,
        color: goal.color,
        href: '/savings',
      });
    }

    return events.sort((a, b) => a.date.localeCompare(b.date));
  }
}
