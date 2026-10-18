import type { GoalStatusValue, SnapshotGoal } from '@/domain/finance/snapshot';

export type SavingsGoalStatus = GoalStatusValue;

/** Meta de ahorro con su progreso (v_savings_progress). */
export interface SavingsGoal extends SnapshotGoal {
  icon: string;
  color: string;
  progressPercent: number;
  notes: string | null;
}

export const GOAL_STATUS_LABEL: Record<SavingsGoalStatus, string> = {
  active: 'Activa',
  paused: 'En pausa',
  completed: 'Completada',
  cancelled: 'Cancelada',
  archived: 'Archivada',
};
