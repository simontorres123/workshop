"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Box, CircularProgress } from '@mui/material';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const technicianRestrictedRoute = role === 'technician' && (pathname === '/dashboard' || pathname.startsWith('/reports'));

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
    if (!loading && isAuthenticated && technicianRestrictedRoute) {
      router.replace('/my-repairs');
    }
  }, [isAuthenticated, loading, router, technicianRestrictedRoute]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Si no está autenticado, el useEffect redirigirá, pero mientras tanto no mostramos nada
  if (!isAuthenticated || technicianRestrictedRoute) return null;

  return <DashboardLayout>{children}</DashboardLayout>;
}
