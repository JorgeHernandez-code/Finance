import type { CapacitorConfig } from '@capacitor/cli';

// Configuración base para Fase 21 (PWA + Capacitor).
// webDir apunta al export estático de Next.js (`next build` con BUILD_TARGET=capacitor).
const config: CapacitorConfig = {
  appId: 'com.jorgehernandez.finance',
  appName: 'Finance',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
