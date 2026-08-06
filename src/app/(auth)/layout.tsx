import { Wallet } from 'lucide-react';

/**
 * Layout de las rutas públicas de autenticación (login, registro, recuperar
 * contraseña) — sin sidebar ni topbar. La lógica de formularios llega en Fase 4.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Wallet className="size-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Finance</span>
      </div>
      {children}
    </div>
  );
}
