import { jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session-cookie';

/**
 * Edge middleware auth check. Reads AUTH_SECRET here so Next.js inlines it
 * into the middleware bundle (importing via other modules can omit env vars).
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const secret = process.env.AUTH_SECRET;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!secret || !token) {
    return false;
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}
