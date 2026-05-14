'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/db/server';

// type lives in a sibling file so this 'use server' module only exports async fns.
// (next.js 16 rule: invalid-use-server-value)
import type { SendMagicLinkState } from './state';

export async function sendMagicLink(
  _prev: SendMagicLinkState,
  formData: FormData,
): Promise<SendMagicLinkState> {
  const email = String(formData.get('email') ?? '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'invalidEmail' };
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin =
    headersList.get('origin') ??
    headersList.get('host') ??
    'http://localhost:3000';

  // origin from `host` header is missing the protocol — patch it for prod.
  const fullOrigin = origin.startsWith('http') ? origin : `https://${origin}`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${fullOrigin}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { ok: false, error: 'sendFailed' };
  }

  return { ok: true };
}
