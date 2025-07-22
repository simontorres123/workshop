import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');

  const { pathname } = request.nextUrl;

  // Si el usuario intenta acceder a una ruta de admin y no tiene cookie de sesión,
  // redirigir a la página de login.
  if (pathname.startsWith('/admin') && !sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Si el usuario está autenticado e intenta acceder a la página de login,
  // redirigirlo al dashboard.
  if (pathname === '/login' && sessionCookie) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

// Especifica las rutas en las que se ejecutará el middleware.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
