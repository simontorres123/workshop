import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/providers/AuthProvider";
import LegacyServiceWorkerCleanup from "@/components/providers/LegacyServiceWorkerCleanup";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { getAppUrl } from '@/lib/app-url';

export const metadata: Metadata = {
  metadataBase: getAppUrl(),
  title: {
    default: 'Workshop',
    template: '%s | Workshop',
  },
  description: 'Gestión integral para talleres de reparación.',
  icons: {
    icon: [{ url: '/brand/workshop-mark.png', type: 'image/png' }],
    apple: [{ url: '/brand/workshop-mark.png', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    siteName: 'Workshop',
    title: 'Workshop',
    description: 'Gestión integral para talleres de reparación.',
    images: [{ url: '/brand/workshop-mark.png', width: 1254, height: 1254, alt: 'Workshop' }],
  },
  twitter: {
    card: 'summary',
    title: 'Workshop',
    description: 'Gestión integral para talleres de reparación.',
    images: ['/brand/workshop-mark.png'],
  },
};

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppRouterCacheProvider>
          <AuthProvider>
            <LegacyServiceWorkerCleanup />
            {children}
            <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
          </AuthProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
