import { notFound } from 'next/navigation';
import { FieldChrome, type ViewerRole } from '@/components/field/field-chrome';
import { createClient } from '@/lib/db/server';
import { loadFieldContent } from '@/lib/field-query';
import type { FieldMode } from '@/types/domain';

// a field viewed by its share link: mementree.app/{handle}/{slug}.
// the owner gets the full keeper view here too; everyone else is a visitor.
//
// row visibility is enforced by RLS — the page just queries and renders.

export const metadata = {
  title: 'mementree',
};

interface PageProps {
  params: Promise<{ handle: string; slug: string }>;
}

export default async function FieldPage({ params }: PageProps) {
  const { handle, slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // resolve the field owner by handle
  const { data: owner } = await supabase
    .from('profiles')
    .select('id, handle')
    .eq('handle', handle)
    .maybeSingle();
  if (!owner) notFound();

  // resolve the field
  const { data: field } = await supabase
    .from('fields')
    .select('id, mode, slug, owner_id')
    .eq('owner_id', owner.id)
    .eq('slug', slug)
    .maybeSingle();
  if (!field) notFound();

  const isKeeper = !!user && user.id === field.owner_id;
  const role: ViewerRole = isKeeper ? 'keeper' : 'visitor';
  const viewerSignedIn = !!user;
  // keeper or signed-in visitor may tie memos
  const canMemo = viewerSignedIn;

  const { trees, fallen } = await loadFieldContent(
    supabase,
    field.id as string,
  );

  // the memo composer's default author is the VIEWER's name, not the owner's
  let defaultLead = '';
  if (user) {
    const { data: me } = await supabase
      .from('profiles')
      .select('handle, display_name')
      .eq('id', user.id)
      .maybeSingle();
    defaultLead = me?.display_name ?? me?.handle ?? '';
  }

  return (
    <FieldChrome
      role={role}
      canMemo={canMemo}
      viewerSignedIn={viewerSignedIn}
      handle={owner.handle as string}
      slug={field.slug as string}
      trees={trees}
      fallen={isKeeper ? fallen : []}
      firstTime={isKeeper && trees.length === 0}
      fieldMode={(field.mode ?? null) as FieldMode | null}
      defaultLead={defaultLead}
    />
  );
}
