import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { CheckCircle2, Circle, Lock } from 'lucide-react';
import { createClient } from '@/infrastructure/supabase/server';
import { LESSONS, LEVELS, isLevelUnlocked, nextLesson, type Lesson } from '@/domain/academy/lessons';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Progress } from '@/presentation/components/ui/progress';
import { Badge } from '@/presentation/components/ui/badge';

export const metadata = { title: 'Academia' };

export default async function AcademyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed_at')
    .eq('user_id', user.id);
  const completed = new Set((data ?? []).filter((r) => r.completed_at).map((r) => r.lesson_id));
  const next = nextLesson(completed);
  const earned = LESSONS.filter((l) => completed.has(l.id)).reduce((s, l) => s + l.xp, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Academia Finance</h1>
        <p className="text-sm text-muted-foreground">
          Lecciones cortas y prácticas, aplicadas a tus propios datos. Completa el ejercicio y responde la
          pregunta para avanzar.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {completed.size} de {LESSONS.length} lecciones · {earned} puntos de aprendizaje
            </span>
            <Progress value={(completed.size / LESSONS.length) * 100} className="w-64 max-w-full" />
          </div>
          {next && (
            <Link
              href={`/academy/${next.id}` as Route}
              className="text-sm font-medium text-primary hover:underline"
            >
              Continuar: {next.title} →
            </Link>
          )}
        </CardContent>
      </Card>

      {([1, 2, 3, 4, 5] as Lesson['level'][]).map((level) => {
        const unlocked = isLevelUnlocked(level, completed);
        const lessons = LESSONS.filter((l) => l.level === level).sort((a, b) => a.order - b.order);
        const done = lessons.filter((l) => completed.has(l.id)).length;
        return (
          <Card key={level} className={unlocked ? undefined : 'opacity-70'}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>
                  Nivel {level}. {LEVELS[level].title}
                </CardTitle>
                {unlocked ? (
                  <Badge variant={done === lessons.length ? 'success' : 'outline'}>
                    {done}/{lessons.length}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="size-3" /> Completa 2 lecciones del nivel {level - 1}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{LEVELS[level].description}</p>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y divide-border">
                {lessons.map((l) => {
                  const isDone = completed.has(l.id);
                  const content = (
                    <span className="flex items-center gap-3 py-2.5 text-sm">
                      {isDone ? (
                        <CheckCircle2 className="size-4 shrink-0 text-success" />
                      ) : unlocked ? (
                        <Circle className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <Lock className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="flex-1">{l.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {l.minutes} min · {isDone ? 'Repasar' : `${l.xp} pts`}
                      </span>
                    </span>
                  );
                  return (
                    <li key={l.id}>
                      {unlocked ? (
                        <Link href={`/academy/${l.id}` as Route} className="block hover:text-primary">
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      <p className="text-xs text-muted-foreground">
        Contenido de educación financiera general. No es asesoría legal, tributaria ni de inversión
        personalizada. Las lecciones no citan normas ni cifras que cambian con el tiempo.
      </p>
    </div>
  );
}
