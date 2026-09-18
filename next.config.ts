import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mantener separados los artefactos de desarrollo y producción evita que
  // `next build` elimine manifiestos que `next dev` todavía está usando.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Deshabilitar React Strict Mode para evitar doble renderizado en desarrollo
  reactStrictMode: false,
  
  // IGNORAR errores de ESLint durante el build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // IGNORAR errores de TypeScript durante el build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Optimizar páginas para desarrollo rápido
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },
};

export default nextConfig;
