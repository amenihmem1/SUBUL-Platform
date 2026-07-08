import { NextRequest, NextResponse } from 'next/server';

export function getSession(request: NextRequest) {
  const sessionCookie = request.cookies.get('auth_session');
  
  if (!sessionCookie) {
    return null;
  }
  
  try {
    const session = JSON.parse(sessionCookie.value);
    
    // Check if session is expired
    if (session.expires && new Date(session.expires) < new Date()) {
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Failed to parse session cookie:', error);
    return null;
  }
}

export function requireAuth(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    const loginUrl = new URL('/api/auth/login', request.url);
    if (request.nextUrl.pathname !== '/') {
      loginUrl.searchParams.set('returnTo', request.nextUrl.pathname);
    }
    return NextResponse.redirect(loginUrl);
  }
  
  return null; // No redirect needed, user is authenticated
}
