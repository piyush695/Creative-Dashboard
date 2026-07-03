import { auth } from '@/server/auth';
import { NextResponse } from 'next/server';

/**
 * Session guard for API route handlers (defense in depth behind the middleware
 * cookie-presence check — this one VERIFIES the session server-side).
 *
 * Usage at the top of any mutating handler:
 *   const unauth = await requireSession();
 *   if (unauth) return unauth;
 */
export async function requireSession(): Promise<NextResponse | null> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return null;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
