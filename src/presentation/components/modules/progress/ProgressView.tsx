import Link from 'next/link';
import type { Route } from 'next';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Award, CheckCircle2, Circle, Flame, Lock, PartyPopper, Trophy } from 'lucide-react';
import type { HealthScore } from '@/domain/finance/healthScore';
import type { Achievement, Challenge, LevelInfo, Streak } from '@/domain/finance/progress';
import type { SnapshotXpEvent } from '@/domain/finance/snapshot';
import type { StoredHealthSnapshot } from '@/domain/finance/healthScore';
import { cn } from '@/shared/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Badge } from '@/presentation/components/ui/badge';
import { Progress } from '@/presentation/components/ui/progress';
import { HealthScoreRing, CONFIDENCE_LABEL } from './HealthScoreBadge';
import { ScoreHistoryChart } from './ScoreHistoryChart';

interface ProgressViewProps {
  weekly: HealthScore;
  monthly: HealthScore;
  history: StoredHealthSnapshot[];
  level: LevelInfo;
  streak: Streak;
  challenges: Challenge[];
  achievements: Achievement[];
  xpByMonth: { month: string; xp: number }[];
  milestones: SnapshotXpEvent[];
  message: string;
  newlyGranted: number;
}

function ScoreBreakdown({ score, title }: { score: HealthScore; title: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <HealthScoreRing score={score.score} />
          <div className="flex flex-col gap-1 text-sm">
            <Badge variant="outline" className="w-fit">
              {CONFIDENCE_LABEL[score.confidence]}
            </Badge>
            <span className="text-xs text-muted-foreground">{score.confidenceReason}</span>
            <span className="text-xs text-muted-foreground">
              {format(parseISO(score.period.start), 'd MMM', { locale: es })} –{' '}
              {format(parseISO(score.period.end), 'd MMM yyyy', { locale: es })} · reglas {score.rulesVersion}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {score.components.map((c) => (
            <details key={c.key} className="rounded-md border border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="font-medium">{c.label}</span>
                <span className="tabular text-muted-foreground">
                  {c.score === null ? 'No aplica' : `${c.score} / 20`}
                </span>
              </summary>
              <ul className="flex flex-col divide-y divide-border border-t border-border px-3 text-sm">
                {c.items.map((i) => (
                  <li key={i.key} className="flex flex-col gap-0.5 py-2">
                    <span className="flex items-center justify-between gap-2">
                      <span>{i.label}</span>
                      <span className="tabular text-xs text-muted-foreground">
                        {i.applicable ? `${i.earned} / ${i.max}` : 'No aplica'}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">{i.detail}</span>
                    {i.howToImprove && (
                      <span className="text-xs text-primary">Siguiente paso: {i.howToImprove}</span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProgressView(props: ProgressViewProps) {
  const { level, streak, challenges, achievements } = props;
  const weeklyHistory = props.history.filter((h) => h.periodType === 'week').slice(-12);
  const monthlyHistory = props.history.filter((h) => h.periodType === 'month').slice(-12);
  const versions = new Set(props.history.map((h) => h.rulesVersion));
  const maxXp = Math.max(1, ...props.xpByMonth.map((m) => m.xp));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Mi progreso</h1>
        <p className="text-sm text-muted-foreground">{props.message}</p>
      </div>

      {props.newlyGranted > 0 && (
        <Card className="border-success/40">
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <PartyPopper className="size-5 text-success" />
            ¡Sumaste {props.newlyGranted} XP por tus avances recientes!
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Trophy className="size-4 text-primary" /> Nivel actual
            </span>
            <span className="text-2xl font-semibold">
              {level.level} · {level.name}
            </span>
            <Progress value={level.progress} />
            <span className="text-xs text-muted-foreground">
              {level.xp} XP ·{' '}
              {level.nextLevelXp !== null
                ? `${level.nextLevelXp - level.xp} XP para el nivel ${level.level + 1}`
                : ''}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Flame className="size-4 text-warning" /> Racha de registro (semanas)
            </span>
            <span className="text-2xl font-semibold">{streak.current}</span>
            <span className="text-xs text-muted-foreground">
              Mejor racha: {streak.best} ·{' '}
              {streak.activeThisWeek ? 'esta semana ya cuenta' : 'registra algo esta semana para continuarla'}
            </span>
            <span className="text-xs text-muted-foreground">
              Si una racha se corta, tu experiencia y logros se conservan.
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <span className="text-xs text-muted-foreground">Experiencia por mes</span>
            <div
              className="flex h-20 items-end gap-1.5"
              role="img"
              aria-label="XP por mes de los últimos 6 meses"
            >
              {props.xpByMonth.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary/70"
                    style={{ height: `${Math.max(2, (m.xp / maxXp) * 64)}px` }}
                    title={`${m.xp} XP`}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {format(parseISO(m.month), 'MMM', { locale: es })}
                  </span>
                </div>
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground">
              La experiencia mide hábitos. No es dinero y no se convierte en saldo.
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Retos de esta semana</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {challenges.map((c) => (
            <Link
              key={c.id}
              href={c.href as Route}
              className="flex items-start gap-3 rounded-md border border-border p-3 hover:bg-muted"
            >
              {c.completed ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="flex items-center justify-between gap-2 text-sm font-medium">
                  {c.title}
                  <span className="text-xs font-normal text-muted-foreground">
                    {c.completed ? 'Completado' : `+${c.xp} XP`}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{c.description}</span>
                <span className="text-xs text-muted-foreground">{c.progressLabel}</span>
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ScoreBreakdown score={props.weekly} title="Índice de Salud Financiera · semana" />
        <ScoreBreakdown score={props.monthly} title="Índice de Salud Financiera · mes" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Evolución del índice</CardTitle>
          <p className="text-xs text-muted-foreground">
            Cada periodo se guarda al cerrarse y no se recalcula después.{' '}
            {versions.size > 1
              ? 'Hay periodos calculados con versiones distintas de las reglas (se indica en cada punto).'
              : ''}
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Semanal</p>
            {weeklyHistory.length > 1 ? (
              <ScoreHistoryChart points={weeklyHistory} periodType="week" />
            ) : (
              <p className="text-sm text-muted-foreground">
                La gráfica aparece a partir de la segunda semana.
              </p>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Mensual</p>
            {monthlyHistory.length > 1 ? (
              <ScoreHistoryChart points={monthlyHistory} periodType="month" />
            ) : (
              <p className="text-sm text-muted-foreground">La gráfica aparece a partir del segundo mes.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Logros</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {achievements.map((a) => (
              <div
                key={a.id}
                className={cn(
                  'flex items-start gap-2 rounded-md border border-border p-3',
                  !a.unlocked && 'opacity-60'
                )}
              >
                {a.unlocked ? (
                  <Award className="mt-0.5 size-4 shrink-0 text-warning" />
                ) : (
                  <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{a.title}</span>
                  <span className="text-xs text-muted-foreground">{a.description}</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Hitos</CardTitle>
          </CardHeader>
          <CardContent>
            {props.milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tus hitos aparecerán aquí a medida que avances.</p>
            ) : (
              <ol className="flex flex-col gap-2 border-l border-border pl-4 text-sm">
                {props.milestones.map((m) => (
                  <li key={m.sourceKey}>
                    <span className="font-medium">{m.description.replace(/^Logro: /, '')}</span>
                    <span className="block text-xs text-muted-foreground">
                      {format(parseISO(m.earnedAt), "d 'de' MMMM yyyy", { locale: es })}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        El Índice de Salud Financiera es un indicador personal de organización y progreso. No es un puntaje
        crediticio ni una evaluación de ninguna entidad, y no mide tu valor como persona.
      </p>
    </div>
  );
}
