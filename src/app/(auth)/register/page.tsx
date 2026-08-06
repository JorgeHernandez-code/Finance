'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerAction, type ActionState } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Alert } from '@/presentation/components/ui/alert';
import { SubmitButton } from '@/presentation/components/modules/auth/SubmitButton';

const initialState: ActionState = {};

export default function RegisterPage() {
  const [state, formAction] = useActionState(registerAction, initialState);

  if (state.success) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Revisa tu correo</CardTitle>
          <CardDescription>
            Te enviamos un enlace de confirmación. Ábrelo para activar tu cuenta y luego inicia sesión.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="text-sm text-primary hover:underline">
            Volver a iniciar sesión
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Crear cuenta</CardTitle>
        <CardDescription>Empieza a organizar tus finanzas.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={formAction} className="flex flex-col gap-4">
          {state.error && <Alert variant="danger">{state.error}</Alert>}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input id="fullName" name="fullName" type="text" placeholder="Jorge Hernández" required minLength={2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" name="email" type="email" placeholder="tu@correo.com" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <SubmitButton>Crear cuenta</SubmitButton>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
