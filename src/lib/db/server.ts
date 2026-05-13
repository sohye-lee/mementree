// server-side supabase client for RSC, server actions, and route handlers.
// reads/writes the auth cookie via next/headers — keeps the session in sync.
// uses the publishable key; RLS still applies based on the cookie's auth.uid().

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll was called from an RSC context where cookies are read-only.
            // safe to ignore — middleware refreshes the session on each request.
          }
        },
      },
    },
  );
}
