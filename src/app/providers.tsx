'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/presentation/components/ui/tooltip';
import { NativeAuthBridge } from '@/presentation/components/modules/auth/NativeAuthBridge';

/**
 * Providers globales de la app. Vive en app/ (no en presentation/) porque es
 * composición específica de Next.js (Client Component boundary), no lógica reusable.
 *
 * QueryClient se crea con useState (no como módulo global) para que cada
 * request de servidor tenga su propia instancia y no se filtren datos entre
 * usuarios en SSR — detalle de seguridad, no solo de rendimiento.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} themes={['dark', 'light']}>
        <TooltipProvider delayDuration={200}>
          <NativeAuthBridge />
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast: 'glass !rounded-lg !text-foreground !border-border',
                description: '!text-muted-foreground',
              },
            }}
          />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
