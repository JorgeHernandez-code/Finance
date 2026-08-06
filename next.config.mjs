/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'export' genera un build 100% estático — necesario para empaquetar con Capacitor.
  // Se activa solo cuando se construye para móvil (ver script cap:build en fase móvil).
  output: process.env.BUILD_TARGET === 'capacitor' ? 'export' : undefined,
  images: {
    unoptimized: process.env.BUILD_TARGET === 'capacitor',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
