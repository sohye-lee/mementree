import { redirect } from 'next/navigation';
import { FieldsHome, type FieldsHomeItem } from '@/components/fields/fields-home';
import { createClient } from '@/lib/db/server';
import type { FieldMode } from '@/types/domain';

// `/` is the keeper's hub — a picker for the fields they keep. it is not a
// field itself; each field lives at `/{handle}/{slug}`. fields are created
// explicitly via the new-field modal, never auto-created.

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

  const { data: fieldRows } = await supabase
    .from('fields')
    .select('id, slug, title, mode, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });

  const fields = fieldRows ?? [];

  // living-tree counts, one query across every field
  const counts = new Map<string, number>();
  const ids = fields.map((f) => f.id as string);
  if (ids.length) {
    const { data: treeRows } = await supabase
      .from('trees')
      .select('field_id')
      .in('field_id', ids)
      .eq('state', 'living');
    for (const r of treeRows ?? []) {
      const fid = r.field_id as string;
      counts.set(fid, (counts.get(fid) ?? 0) + 1);
    }
  }

  const items: FieldsHomeItem[] = fields.map((f) => ({
    id: f.id as string,
    slug: f.slug as string,
    title: f.title as string,
    mode: (f.mode ?? null) as FieldMode | null,
    treeCount: counts.get(f.id as string) ?? 0,
  }));

  return (
    <FieldsHome
      handle={profile?.handle ?? 'keeper'}
      displayName={profile?.display_name ?? profile?.handle ?? ''}
      fields={items}
    />
  );
}
