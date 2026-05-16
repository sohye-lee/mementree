// supabase auth session refresh on every request.
// without this, server components would see a stale session and RLS would block
// requests that should succeed.
//
// next.js 16 renamed `middleware` → `proxy` (same mechanics, clearer name).
// exported both as default and as `proxy` to satisfy whichever shape the
// dev/prod runtime adapter happens to look for (we saw an "adapterFn is not a
// function" runtime error when only the named export was present).

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // touching getUser() refreshes the session cookie if needed.
  // do not put logic between createServerClient and getUser — risk of session drift.
  await supabase.auth.getUser();

  return response;
}

export { proxy };
export default proxy;

export const config = {
  matcher: [
    // skip static assets and images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
