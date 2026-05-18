import { redirect } from 'next/navigation';
import { FieldChrome } from '@/components/field/field-chrome';
import { createClient } from '@/lib/db/server';
import { loadFieldContent } from '@/lib/field-query';
import type { FieldMode } from '@/types/domain';

// the keeper's own field. `/[handle]/[slug]` serves the same view to
// visitors; this route is the signed-in keeper's shortcut and the only
// place a field is auto-created.

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
    .select('handle, display_name')
    .eq('id', user.id)
    .single();

  let { data: field } = await supabase
    .from('fields')
    .select('id, mode, slug')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!field) {
    const { data: created } = await supabase
      .from('fields')
      .insert({
        owner_id: user.id,
        slug: 'field',
        title: 'field',
        mode: null,
      })
      .select('id, mode, slug')
      .single();
    field = created;
  }

  const { trees, fallen } = field
    ? await loadFieldContent(supabase, field.id as string)
    : { trees: [], fallen: [] };

  const firstTime = trees.length === 0;
  const fieldMode = (field?.mode ?? null) as FieldMode | null;
  const defaultLead = profile?.display_name ?? profile?.handle ?? '';

  return (
    <FieldChrome
      role="keeper"
      canMemo
      viewerSignedIn
      handle={profile?.handle ?? 'keeper'}
      slug={(field?.slug as string | undefined) ?? 'field'}
      trees={trees}
      fallen={fallen}
      firstTime={firstTime}
      fieldMode={fieldMode}
      defaultLead={defaultLead}
    />
  );
}
