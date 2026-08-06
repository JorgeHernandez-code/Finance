'use client';

import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps } from '@/presentation/components/ui/button';

/**
 * useFormStatus solo funciona dentro de un <form>; por eso este botón vive
 * en su propio componente en vez de leer el estado directamente en la page.
 */
export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending} {...props}>
      {pending ? 'Procesando...' : children}
    </Button>
  );
}
