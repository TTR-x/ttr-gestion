
import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const isDev = process.env.NODE_ENV === 'development';
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

const nextConfig: NextConfig = {
  // Export statique pour Capacitor, standalone pour web
  output: isCapacitorBuild ? 'export' : 'standalone',

  // Trailing slash pour éviter les problèmes de routing en mode export
  trailingSlash: isCapacitorBuild,

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Images non optimisées pour l'export statique
    unoptimized: isCapacitorBuild,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

// N'appliquer PWA que si ce n'est pas un build Capacitor
const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  disable: isDev || isCapacitorBuild,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
});

export default isCapacitorBuild ? nextConfig : withPWA(nextConfig);
