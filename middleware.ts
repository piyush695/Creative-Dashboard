import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Next.js 16 middleware — no external module imports allowed in Edge Runtime.
// Auth check via cookie/session token only.

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — no auth required. /api/auth stays open (next-auth's own
  // sign-in/callback/csrf endpoints must be reachable pre-session).
  const publicPaths = ['/login', '/register', '/reset-password', '/verify', '/api/auth']
  const isPublicPath = publicPaths.some(p => pathname.startsWith(p))
  const isApi = pathname.startsWith('/api')
  // The dot heuristic must NOT apply to /api paths (an API URL containing a dot
  // would otherwise bypass auth).
  const isStaticAsset = !isApi && (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.'))

  if (isPublicPath || isStaticAsset) {
    return NextResponse.next()
  }

  // Check for auth session token (next-auth stores it as a cookie).
  // NOTE: this is a cookie-PRESENCE gate (Edge runtime — no crypto verification
  // here). Mutating API routes ALSO verify the session server-side via
  // requireSession() (server/api-auth.ts) — defense in depth.
  const sessionToken = request.cookies.get('authjs.session-token')?.value
    || request.cookies.get('__Secure-authjs.session-token')?.value
    || request.cookies.get('next-auth.session-token')?.value
    || request.cookies.get('__Secure-next-auth.session-token')?.value

  if (!sessionToken) {
    // APIs get a 401 (a login redirect is meaningless to a fetch caller);
    // pages redirect to login.
    if (isApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // /api is INTENTIONALLY protected now (it was excluded before — every API
    // was open to the internet). /api/auth is allowed through in code above.
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|placeholder|public).*)',
  ],
}
