import { redirect } from 'next/navigation';
import { FieldCanvas } from '@/components/field/field-canvas';
import { FieldNav } from '@/components/field/field-nav';
import { createClient } from '@/lib/db/server';

// the field view — mementree's home for an authed keeper.
// phase A: nav + empty scene + walk controls. no trees, no panels yet.
// phase C will add field auto-creation when the keeper plants their first tree.

export const metadata = {
  title: 'mementree',
};

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
    <>
      <FieldNav handle={profile?.handle ?? 'keeper'} />
      <FieldCanvas />
    </>
  );
}
