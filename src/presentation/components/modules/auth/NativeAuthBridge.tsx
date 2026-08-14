'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { createClient } from '@/infrastructure/supabase/client';

/**
 * Google bloquea el login OAuth dentro de un WebView embebido (el que usa
 * Capacitor) — por eso GoogleButton, en nativo, abre el flujo en el navegador
 * del sistema (Chrome Custom Tabs) en vez de navegar dentro de la app.
 * Google redirige de vuelta a la app por el custom URL scheme
 * (com.jorgehernandez.finance://auth/callback?code=...), Android reabre la
 * app con esa URL, y este listener termina el login: intercambia el code
 * por una sesión y navega al dashboard.
 *
 * Montado una sola vez en app/providers.tsx. No hace nada en web —
 * Capacitor.isNativePlatform() es false ahí.
 */
export function NativeAuthBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
      const url = new URL(event.url);
      const code = url.searchParams.get('code');
      if (!code) return;

      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      await Browser.close().catch(() => {
        // Puede que el navegador del sistema ya se haya cerrado solo — no es un error real.
      });

      router.replace(error ? '/login?error=auth_callback_failed' : '/dashboard');
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [router]);

  return null;
}
