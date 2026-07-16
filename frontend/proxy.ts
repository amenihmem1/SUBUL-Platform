import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDashboardPath, getEffectiveRole, normalizeLocale } from '@/lib/auth/routing';
import { resolveLocaleFromRequest } from '@/lib/i18n/detectLocale.server';

function decodeJwtPayload(token: string): { sub?: number; email?: string; role?: string; hasCompletedAssessment?: boolean; isEmailVerified?: boolean } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as { sub?: number; email?: string; role?: string; hasCompletedAssessment?: boolean; isEmailVerified?: boolean };
  } catch {
    return null;
  }
}

function isRoleCompatibleReturnUrl(url: string | null, role: string | null | undefined): boolean {
  if (!url || !url.startsWith('/')) return false;
  const r = String(role || '').toLowerCase();
  if (url.includes('/dashboard/admin')) return r === 'admin';
  if (url.includes('/dashboard/learner')) return r === 'learner';
  if (url.includes('/dashboard/employer')) return r === 'employer';
  if (url.includes('/dashboard/university')) return r === 'university';
  if (url.includes('/dashboard/instructor')) return r === 'instructor';
  return true;
}

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const pathnameLocale = normalizeLocale(pathname.split('/')[1]);

  if (pathname.includes('.')) {
    return NextResponse.next();
  }

  if (
    pathname === '/hr-coach-app' ||
    pathname.startsWith('/hr-coach-app/') ||
    /^\/(en|fr)\/hr-coach-app(\/|$)/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Legacy /ar/* URLs → French (Arabic UI locale removed)
  if (pathname === '/ar' || pathname.startsWith('/ar/')) {
    const newPath = pathname.replace(/^\/ar/, '/fr');
    return NextResponse.redirect(new URL(newPath, request.url), 308);
  }

  const hasLocale = /^\/(en|fr)\//.test(pathname);

  const isJustLocale = /^\/(en|fr)$/.test(pathname);

  if (
    request.nextUrl.searchParams.get('path') === '/' &&
    /^\/(en|fr)\/dashboard\/learner\/(hr-coach|technical-coach)$/.test(pathname)
  ) {
    const cleanUrl = new URL(request.url);
    cleanUrl.searchParams.delete('path');
    return NextResponse.redirect(cleanUrl, 308);
  }
  if (hasLocale || isJustLocale) {
    // Continue to auth checks below for localized/protected routes.
  } else {

    const preferredLocale = resolveLocaleFromRequest(request);

    if (pathname === '/') {
      return NextResponse.redirect(new URL(`/${preferredLocale}`, request.url));
    }

    return NextResponse.redirect(new URL(`/${preferredLocale}${pathname}`, request.url));
  }

  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/css/') ||
    pathname.startsWith('/js/')
  ) {
    return NextResponse.next();
  }

  const isAuthPage = pathname.match(/^\/(fr|en)\/auth\/(login|register|forgot-password|callback|verify-email|resend-verification|reset-password)(\/.*)?$/);
  // For login/register, redirect authenticated users to their dashboard.
  if (pathname.match(/^\/(fr|en)\/auth\/(login|register)(\/.*)?$/)) {
    const tokenCookie = request.cookies.get('access_token');
    const token = tokenCookie?.value ? decodeURIComponent(tokenCookie.value) : null;
    if (!token) return NextResponse.next();
    const payload = decodeJwtPayload(token);
    if (!payload) return NextResponse.next();
    const returnUrl = request.nextUrl.searchParams.get('returnUrl');
    const role = getEffectiveRole(payload.role, payload.email);
    if (returnUrl && isRoleCompatibleReturnUrl(returnUrl, role)) {
      return NextResponse.redirect(new URL(returnUrl, request.url));
    }
    return NextResponse.redirect(new URL(getDashboardPath(pathnameLocale, role), request.url));
  }
  // Other auth pages stay publicly reachable.
  if (isAuthPage) return NextResponse.next();

  // Keep non-localized unauthorized route reachable, but always prefer locale-safe routing in guards below.
  if (pathname === '/unauthorized') {
    return NextResponse.next();
  }

  const isProtectedRoute =
    pathname.startsWith('/fr/dashboard/') ||
    pathname.startsWith('/en/dashboard/') ||
    pathname.startsWith('/dashboard/') ||
    pathname.includes('/admin') ||
    pathname.includes('/learner') ||
    pathname.includes('/company') ||
    pathname.includes('/profile');

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const tokenCookie = request.cookies.get('access_token');
  const token = tokenCookie?.value ? decodeURIComponent(tokenCookie.value) : null;

  if (!token) {
    const loginUrl = new URL(`/${pathnameLocale}/auth/login`, request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    const loginUrl = new URL(`/${pathnameLocale}/auth/login`, request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = getEffectiveRole(payload.role, payload.email);
  const isAdmin = role === 'admin';
  const isLearner = role === 'learner';
  const isEmployer = role === 'employer';
  const isUniversity = role === 'university';
  const isInstructor = role === 'instructor';

  // /dashboard/admin (or path contains /admin) -> only admin
  if (pathname.includes('/admin') || pathname.includes('/dashboard/admin')) {
    if (!isAdmin) {
      return NextResponse.redirect(new URL(getDashboardPath(pathnameLocale, role), request.url));
    }
    return NextResponse.next();
  }

  // /dashboard/learner -> learner or admin
  if (pathname.includes('/dashboard/learner')) {
    if (!isLearner && !isAdmin) {
      return NextResponse.redirect(new URL(getDashboardPath(pathnameLocale, role), request.url));
    }

    return NextResponse.next();
  }

  // /dashboard/employer -> employer or admin
  if (pathname.includes('/dashboard/employer')) {
    if (!isEmployer && !isAdmin) {
      return NextResponse.redirect(new URL(getDashboardPath(pathnameLocale, role), request.url));
    }
    return NextResponse.next();
  }

  // /dashboard/university -> university or admin
  if (pathname.includes('/dashboard/university')) {
    if (!isUniversity && !isAdmin) {
      return NextResponse.redirect(new URL(getDashboardPath(pathnameLocale, role), request.url));
    }
    return NextResponse.next();
  }

  // /dashboard/instructor -> instructor or admin
  if (pathname.includes('/dashboard/instructor')) {
    if (!isInstructor && !isAdmin) {
      return NextResponse.redirect(new URL(getDashboardPath(pathnameLocale, role), request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next|api|monitoring|favicon.ico|public|images|css|js).*)',
  ],
};
