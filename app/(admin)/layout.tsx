"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Box, CircularProgress } from '@mui/material';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Si no está autenticado, el useEffect redirigirá, pero mientras tanto no mostramos nada
  if (!isAuthenticated) return null;

  return <DashboardLayout>{children}</DashboardLayout>;
}
