"use client";

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from "@/theme";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Provider de tema sin logs de debug para evitar múltiples renderizados
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}