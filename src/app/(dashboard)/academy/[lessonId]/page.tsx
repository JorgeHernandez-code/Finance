import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseFinancialSnapshotRepository } from '@/infrastructure/supabase/repositories/SupabaseFinancialSnapshotRepository';
import { getLesson, isLevelUnlocked, LEVELS } from '@/domain/academy/lessons';
import { buildLessonContext } from '@/domain/academy/context';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { LessonPractice } from '@/presentation/components/modules/academy/LessonPractice';

export async function generateMetadata({ params }: { params: Promise<{ lessonId: string }> }) {
  const lesson = getLesson((await params).lessonId);
  return { title: lesson ? lesson.title : 'Lección' };
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const lesson = getLesson((await params).lessonId);
  if (!lesson) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [snapshot, progressRes] = await Promise.all([
    new SupabaseFinancialSnapshotRepository(supabase).load(user.id),
    supabase
      .from('lesson_progress')
      .select('lesson_id, completed_at, exercise_response')
      .eq('user_id', user.id),
  ]);
  const progress = progressRes.data ?? [];
  const completed = new Set(progress.filter((p) => p.completed_at).map((p) => p.lesson_id));
  if (!isLevelUnlocked(lesson.level, completed)) redirect('/academy');
  const mine = progress.find((p) => p.lesson_id === lesson.id);
  const applied = lesson.applyToMe(buildLessonContext(snapshot));

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <Link href="/academy" className="text-xs text-muted-foreground hover:text-foreground">
          ← Academia · Nivel {lesson.level}: {LEVELS[lesson.level].title}
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{lesson.title}</h1>
        <p className="text-xs text-muted-foreground">{lesson.minutes} minutos</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>1. Explicación</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm leading-relaxed">
          {lesson.explanation.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>2. Ejemplo práctico</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed">{lesson.example}</CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>3. Aplicación a tu situación</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>{applied}</p>
          <Link href={lesson.action.href} className="font-medium text-primary hover:underline">
            4. Acción recomendada: {lesson.action.label} →
          </Link>
        </CardContent>
      </Card>

      <LessonPractice
        lessonId={lesson.id}
        exercise={lesson.exercise}
        question={lesson.quiz.question}
        options={lesson.quiz.options}
        completed={!!mine?.completed_at}
        previousResponse={mine?.exercise_response ?? ''}
        xp={lesson.xp}
      />

      {lesson.sources && (
        <p className="text-xs text-muted-foreground">
          Fuentes:{' '}
          {lesson.sources.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer noopener" className="underline">
              {s.label} (actualizado {s.updatedAt})
            </a>
          ))}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Educación financiera general; no es asesoría legal, tributaria ni de inversión.
      </p>
    </article>
  );
}
