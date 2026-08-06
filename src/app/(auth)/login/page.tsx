'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction, type ActionState } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Alert } from '@/presentation/components/ui/alert';
import { SubmitButton } from '@/presentation/components/modules/auth/SubmitButton';
import { GoogleButton } from '@/presentation/components/modules/auth/GoogleButton';

const initialState: ActionState = {};

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Iniciar sesión</CardTitle>
        <CardDescription>Accede a tu dashboard financiero.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={formAction} className="flex flex-col gap-4">
          {state.error && <Alert variant="danger">{state.error}</Alert>}
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
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <SubmitButton>Iniciar sesión</SubmitButton>
        </form>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> o <div className="h-px flex-1 bg-border" />
        </div>

        <GoogleButton />

        <div className="flex justify-between text-xs text-muted-foreground">
          <Link href="/forgot-password" className="hover:text-primary">
            ¿Olvidaste tu contraseña?
          </Link>
          <Link href="/register" className="hover:text-primary">
            Crear cuenta
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
