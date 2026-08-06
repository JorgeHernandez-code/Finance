'use client';

import { useCallback } from 'react';
import { logoutAction } from '@/app/(auth)/actions';
import { useIdleLogout } from '@/presentation/hooks/useIdleLogout';

/**
 * Componente sin UI: solo monta el watcher de inactividad dentro del shell
 * protegido. Separado de DashboardShell para que este último pueda seguir
 * siendo un Server Component.
 */
export function IdleLogoutWatcher() {
  const handleIdle = useCallback(() => {
    void logoutAction();
  }, []);

  useIdleLogout(handleIdle);
  return null;
}
