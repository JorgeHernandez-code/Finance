import type { CapacitorConfig } from '@capacitor/cli';

/**
 * La app no se exporta como HTML estático: toda la app depende de Server
 * Actions y de una ruta de servidor (/auth/callback) que no pueden vivir en
 * un bundle 100% estático dentro del APK. En su lugar, el WebView nativo
 * navega directo al sitio real en Netlify (`server.url`) — el APK es un
 * envoltorio nativo (ícono, splash, permisos) sobre la app ya funcionando en
 * producción. `webDir` sigue siendo obligatorio para `cap sync`, pero su
 * contenido (./www) nunca se ve: se navega directo a `server.url` al abrir.
 */
const config: CapacitorConfig = {
  appId: 'com.jorgehernandez.finance',
  appName: 'Finance',
  webDir: 'www',
  server: {
    url: 'https://jorge-finance.netlify.app',
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
