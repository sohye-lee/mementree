import { NextResponse } from 'next/server';
import { createClient } from '@/lib/db/server';

// supabase magic link redirects here with `?code=...` (PKCE flow).
// we exchange the code for a session cookie and forward the user on.

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=callback`);
}
