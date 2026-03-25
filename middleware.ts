import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Next.js 16 middleware — no external module imports allowed in Edge Runtime.
// Auth check via cookie/session token only.

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — no auth required
  const publicPaths = ['/login', '/register', '/reset-password', '/verify', '/api/auth']
  const isPublicPath = publicPaths.some(p => pathname.startsWith(p))
  const isStaticAsset = pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')

  if (isPublicPath || isStaticAsset) {
    return NextResponse.next()
  }

  // Check for auth session token (next-auth stores it as a cookie)
  const sessionToken = request.cookies.get('authjs.session-token')?.value
    || request.cookies.get('__Secure-authjs.session-token')?.value
    || request.cookies.get('next-auth.session-token')?.value
    || request.cookies.get('__Secure-next-auth.session-token')?.value

  if (!sessionToken) {
    // Not authenticated — redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|placeholder|public).*)',
  ],
}
