'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { recordCheckinAction } from '@/app/(dashboard)/plan/actions';
import { CHECKINS, type CheckinKey } from '@/domain/finance/checkins';
import { Button, type ButtonProps } from '@/presentation/components/ui/button';

interface CheckinButtonProps {
  actionKey: CheckinKey;
  label?: string;
  done?: boolean;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}

/** Confirma una acción del usuario. Muestra la descripción para que quede claro qué se está confirmando. */
export function CheckinButton({
  actionKey,
  label,
  done = false,
  variant = 'outline',
  size = 'sm',
}: CheckinButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [isDone, setIsDone] = useState(done);
  const meta = CHECKINS[actionKey];

  if (isDone) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <Check className="size-3.5" /> {meta.label}: hecho
      </span>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      title={meta.description}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await recordCheckinAction(actionKey);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          setIsDone(true);
          toast.success(`${meta.label} registrada.`);
          router.refresh();
        })
      }
    >
      <Check className="size-4" />
      {label ?? meta.label}
    </Button>
  );
}
