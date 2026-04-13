import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Rutas públicas que no requieren autenticación
  const isPublicRoute = 
    pathname === '/login' || 
    pathname === '/register' || 
    pathname.startsWith('/track') || 
    pathname.startsWith('/api/track') ||
    pathname.startsWith('/_next/') || 
    pathname === '/favicon.ico';

  // Si es una ruta de API (excepto track), permitir que el Route Handler maneje la auth o bloquear aquí
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/track')) {
    // Podríamos bloquear aquí si no hay token, pero las APIs ya tienen su propia validación
    return NextResponse.next();
  }

  // Redirigir al login si no hay token y no es ruta pública
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si hay token e intenta ir al login o register, mandarlo al dashboard
  if (token && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/track (public API)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/track|_next/static|_next/image|favicon.ico).*)',
  ],
};
