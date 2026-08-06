'use client';

import { useActionState } from 'react';
import { resetPasswordAction, type ActionState } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Alert } from '@/presentation/components/ui/alert';
import { SubmitButton } from '@/presentation/components/modules/auth/SubmitButton';

const initialState: ActionState = {};

/**
 * Solo se llega aquí con una sesión de recuperación válida, establecida por
 * src/app/auth/callback/route.ts después de que el usuario hace clic en el
 * enlace del correo. Si alguien entra a esta URL sin ese paso previo, el
 * middleware (src/middleware.ts) lo redirige a /login antes de renderizar esto.
 */
export default function ResetPasswordPage() {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Nueva contraseña</CardTitle>
        <CardDescription>Elige una contraseña nueva para tu cuenta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.error && <Alert variant="danger">{state.error}</Alert>}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <SubmitButton>Actualizar contraseña</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
