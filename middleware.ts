import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('firebase_token')?.value;

  // Si no hay token y la ruta es privada, redirige al login
  if (!token && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Si hay token y está en login, redirige a inventory
  if (token && request.nextUrl.pathname === '/auth/login') {
    return NextResponse.redirect(new URL('/admin/inventory', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/auth/login'],
};
