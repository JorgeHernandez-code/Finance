'use client';

import { useEffect, useRef } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;

/**
 * Cierre de sesión automático por inactividad (docs/03-SEGURIDAD.md §1).
 * 15 minutos sin interacción → se ejecuta `onIdle` (normalmente logoutAction).
 * Vive en un hook aparte para poder testear el timer sin montar todo el shell.
 */
export function useIdleLogout(onIdle: () => void, timeoutMs: number = 15 * 60 * 1000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onIdle, timeoutMs);
    }

    resetTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [onIdle, timeoutMs]);
}
