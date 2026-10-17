'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { completeLessonAction } from '@/app/(dashboard)/academy/actions';
import { MIN_EXERCISE_LENGTH } from '@/domain/academy/constants';
import { cn } from '@/shared/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Button } from '@/presentation/components/ui/button';
import { Textarea } from '@/presentation/components/ui/textarea';

interface Props {
  lessonId: string;
  exercise: { prompt: string; placeholder: string };
  question: string;
  options: string[];
  completed: boolean;
  previousResponse: string;
  xp: number;
}

/**
 * Ejercicio + pregunta. La respuesta correcta NO viaja al navegador: se
 * valida en el servidor (completeLessonAction).
 */
export function LessonPractice({
  lessonId,
  exercise,
  question,
  options,
  completed,
  previousResponse,
  xp,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [response, setResponse] = useState(previousResponse);
  const [answer, setAnswer] = useState<number | null>(null);
  const [result, setResult] = useState<{ passed: boolean; message: string } | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (answer === null) {
      toast.error('Elige una respuesta.');
      return;
    }
    startTransition(async () => {
      const r = await completeLessonAction({ lessonId, answerIndex: answer, exerciseResponse: response });
      if (r.passed) {
        setResult({ passed: true, message: r.explanation ?? '¡Correcto!' });
        if (!r.alreadyCompleted) toast.success(`Lección completada · +${r.xp ?? xp} puntos de aprendizaje`);
        router.refresh();
      } else {
        setResult({ passed: false, message: r.error ?? 'Inténtalo de nuevo.' });
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>5. Ejercicio y comprobación</CardTitle>
        {completed && (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 className="size-3.5" /> Ya completaste esta lección. Puedes repasarla (no suma
            puntos de nuevo).
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{exercise.prompt}</span>
            <Textarea
              rows={3}
              maxLength={2000}
              placeholder={exercise.placeholder}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">
              Mínimo {MIN_EXERCISE_LENGTH} caracteres. Solo tú puedes verlo.
            </span>
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">{question}</legend>
            {options.map((option, i) => (
              <label
                key={option}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted',
                  answer === i && 'border-primary bg-primary/10'
                )}
              >
                <input
                  type="radio"
                  name="answer"
                  className="accent-primary"
                  checked={answer === i}
                  onChange={() => setAnswer(i)}
                />
                {option}
              </label>
            ))}
          </fieldset>

          {result && (
            <p role="status" className={cn('text-sm', result.passed ? 'text-success' : 'text-warning')}>
              {result.message}
            </p>
          )}

          <Button type="submit" disabled={pending} className="self-start">
            {pending ? 'Comprobando…' : completed ? 'Comprobar de nuevo' : 'Completar lección'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
