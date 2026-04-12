"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Box, CircularProgress } from '@mui/material';
import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role !== 'super_admin') {
      console.warn('Acceso denegado: Se requiere rol de Super Admin');
      router.replace('/dashboard');
    }
  }, [role, loading, router]);

  if (loading || role !== 'super_admin') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
