// app/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;
  const { pathname } = request.nextUrl;

  // Define protected admin routes
  const isAdminRoute = pathname.startsWith('/admin') && 
                      !pathname.startsWith('/login');

  // If trying to access admin without token, redirect to login
  if (isAdminRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If already logged in and trying to access login page, redirect to admin
  if (pathname.startsWith('/login') && token) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};