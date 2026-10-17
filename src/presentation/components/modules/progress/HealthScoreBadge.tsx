import type { Confidence } from '@/domain/finance/healthScore';
import { cn } from '@/shared/lib/utils';

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  building: 'En construcción',
  low: 'Confianza baja',
  medium: 'Confianza media',
  high: 'Confianza alta',
};

/** Anillo con el puntaje 0–100 (o "en construcción"). Accesible: el número va en texto. */
export function HealthScoreRing({ score, size = 96 }: { score: number | null; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const tone =
    score === null
      ? 'text-muted-foreground'
      : score >= 70
        ? 'text-success'
        : score >= 40
          ? 'text-primary'
          : 'text-warning';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          className="text-muted"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={cn('transition-all', tone)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            'tabular font-semibold',
            score === null ? 'text-xs text-muted-foreground' : 'text-2xl text-foreground'
          )}
        >
          {score === null ? 'En construcción' : score}
        </span>
        {score !== null && <span className="text-[10px] text-muted-foreground">de 100</span>}
      </div>
    </div>
  );
}
