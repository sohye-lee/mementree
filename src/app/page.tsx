import { redirect } from 'next/navigation';
import { copy } from '@/lib/copy';
import { createClient } from '@/lib/db/server';
import { signOut } from './actions';
import styles from './page.module.css';

// v1 placeholder home. once the field view is built, this page becomes the
// keeper's field at `/[handle]/[slug]`; this `/` will redirect to that.

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('handle')
    .eq('id', user.id)
    .single();

  return (
    <main className={styles.main}>
      <p className={styles.line}>
        {copy.home.signedInAs}{' '}
        <span className={styles.handle}>{profile?.handle ?? '—'}</span>.
      </p>
      <p className={styles.subline}>the field is still being prepared.</p>
      <form action={signOut}>
        <button type="submit" className={styles.signOut}>
          {copy.home.signOut}
        </button>
      </form>
    </main>
  );
}
