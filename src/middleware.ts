import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // RUTAS PRIVADAS (Si no hay token, redirigir al login)
  const privateRoutes = [
    '/dashboard', '/repairs', '/inventory', '/clients', 
    '/sales', '/settings', '/system', '/organizations'
  ];

  const isPrivateRoute = privateRoutes.some(route => pathname.startsWith(route));

  if (isPrivateRoute && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // Si hay token e intenta ir al login, mandarlo al dashboard
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/track|_next/static|_next/image|favicon.ico).*)',
  ],
};
