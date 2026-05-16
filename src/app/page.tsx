import { redirect } from 'next/navigation';
import {
  FieldChrome,
  type FieldTreeData,
} from '@/components/field/field-chrome';
import { FieldNav } from '@/components/field/field-nav';
import { createClient } from '@/lib/db/server';
import type { FieldMode } from '@/types/domain';

// the field view — mementree's home for an authed keeper.
//
// phase A: nav + empty scene + walk controls.
// phase B: + auto-create empty field on first visit, load living trees.
// phase C: + plant flow (onboarding modal for first tree, FAB + modal for
//          subsequent).
// phase D: + tree selection (raycast + ring color) and detail panel.

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

  // ensure a field exists. v1 has one field per keeper.
  // mode is null until the first tree is planted.
  let { data: field } = await supabase
    .from('fields')
    .select('id, mode')
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
      .select('id, mode')
      .single();
    field = created;
  }

  // load living trees. detail panel needs name/year/lead/description in addition
  // to the geometry data (x, z, seed).
  let trees: FieldTreeData[] = [];
  if (field) {
    const { data: rows } = await supabase
      .from('trees')
      .select('id, x, z, seed, ord, name, year, lead, description')
      .eq('field_id', field.id)
      .eq('state', 'living')
      .order('ord', { ascending: true });
    trees =
      rows?.map((r) => ({
        id: r.id as string,
        x: Number(r.x),
        z: Number(r.z),
        seed: Number(r.seed),
        ord: Number(r.ord),
        name: r.name as string,
        year: (r.year as string | null) ?? null,
        lead: (r.lead as string | null) ?? null,
        description: (r.description as string | null) ?? null,
      })) ?? [];
  }

  const firstTime = trees.length === 0;
  const fieldMode = (field?.mode ?? null) as FieldMode | null;
  const defaultLead = profile?.display_name ?? profile?.handle ?? '';

  return (
    <>
      <FieldNav handle={profile?.handle ?? 'keeper'} />
      <FieldChrome
        trees={trees}
        firstTime={firstTime}
        fieldMode={fieldMode}
        defaultLead={defaultLead}
      />
    </>
  );
}
