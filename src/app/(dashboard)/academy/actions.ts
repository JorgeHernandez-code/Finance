'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseProgressRepository } from '@/infrastructure/supabase/repositories/SupabaseProgressRepository';
import { checkLessonCompletion, getLesson } from '@/domain/academy/lessons';

const schema = z.object({
  lessonId: z.string().regex(/^[a-z0-9-]{2,80}$/),
  answerIndex: z.number().int().min(0).max(10),
  exerciseResponse: z.string().max(2000),
});

export interface CompleteLessonResult {
  passed?: boolean;
  alreadyCompleted?: boolean;
  xp?: number;
  error?: string;
  explanation?: string;
}

/**
 * La respuesta se valida en el SERVIDOR contra el contenido de la lección:
 * abrirla no da puntos; hay que hacer el ejercicio y acertar la pregunta.
 * El XP de una lección se otorga una sola vez (clave única en xp_events).
 */
export async function completeLessonAction(input: z.input<typeof schema>): Promise<CompleteLessonResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: 'Datos inválidos.' };
  const lesson = getLesson(parsed.data.lessonId);
  if (!lesson) return { error: 'Lección no encontrada.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado.' };

  const repo = new SupabaseProgressRepository(supabase);
  const previous = await repo.getLessonProgress(user.id, lesson.id);
  const check = checkLessonCompletion(lesson, parsed.data.answerIndex, parsed.data.exerciseResponse);

  if (previous?.completed_at) {
    // Repasar una lección completada no vuelve a dar puntos.
    return {
      passed: check.passed,
      alreadyCompleted: true,
      explanation: lesson.quiz.explanation,
      error: check.passed ? undefined : check.reason,
    };
  }

  try {
    await repo.saveLessonAttempt(
      user.id,
      lesson.id,
      parsed.data.exerciseResponse.trim(),
      check.passed,
      previous?.attempts ?? 0
    );
    if (check.passed) {
      await repo.grantXp(user.id, [
        {
          sourceType: 'lesson',
          sourceKey: lesson.id,
          points: lesson.xp,
          description: `Lección: ${lesson.title}`.slice(0, 200),
        },
      ]);
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar el progreso.' };
  }

  for (const path of ['/academy', `/academy/${lesson.id}`, '/progress', '/dashboard'] as const)
    revalidatePath(path);
  if (!check.passed) return { passed: false, error: check.reason };
  return { passed: true, xp: lesson.xp, explanation: lesson.quiz.explanation };
}
