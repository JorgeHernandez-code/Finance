'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { forgotPasswordAction, type ActionState } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Alert } from '@/presentation/components/ui/alert';
import { SubmitButton } from '@/presentation/components/modules/auth/SubmitButton';

const initialState: ActionState = {};

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialState);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Recuperar contraseña</CardTitle>
        <CardDescription>Te enviaremos un enlace para restablecerla.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {state.success ? (
          <Alert variant="success">
            Si ese correo tiene una cuenta registrada, te llegará un enlace en unos minutos. Revisa también spam.
          </Alert>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            {state.error && <Alert variant="danger">{state.error}</Alert>}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" name="email" type="email" placeholder="tu@correo.com" autoComplete="email" required />
            </div>
            <SubmitButton>Enviar enlace</SubmitButton>
          </form>
        )}

        <Link href="/login" className="text-center text-xs text-muted-foreground hover:text-primary">
          Volver a iniciar sesión
        </Link>
      </CardContent>
    </Card>
  );
}
