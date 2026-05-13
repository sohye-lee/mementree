// admin supabase client. server-only. bypasses RLS. use sparingly.
//
// when to use:
// - cron jobs / scheduled functions (e.g. 30-day fallen purge)
// - one-off admin scripts
// - server actions that legitimately need to act outside a user's permissions
//
// when NOT to use:
// - any code path triggered by a user's request (use server.ts so RLS applies)

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient must not be called from the browser.');
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
