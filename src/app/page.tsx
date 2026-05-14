import { redirect } from 'next/navigation';
import { FieldCanvas } from '@/components/field/field-canvas';
import { FieldNav } from '@/components/field/field-nav';
import { createClient } from '@/lib/db/server';
import type { SceneTree } from '@/lib/three/scene';

// the field view — mementree's home for an authed keeper.
//
// phase A: nav + empty scene + walk controls.
// phase B: + auto-create empty field on first visit, load living trees,
//          render their meshes.
// phase C: tree creation modal (mode + first tree atomic), detail panel,
//          memo composition. field auto-creation here moves into the
//          first-tree modal flow.

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

  // ensure a field exists. v1 has one field per keeper.
  // mode is null until the first tree is planted.
  let { data: field } = await supabase
    .from('fields')
    .select('id')
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
      .select('id')
      .single();
    field = created;
  }

  // load living trees for the field. withered ones stay hidden until restored
  // (phase D will surface them in a "fallen" view).
  let trees: SceneTree[] = [];
  if (field) {
    const { data: rows } = await supabase
      .from('trees')
      .select('id, x, z, seed')
      .eq('field_id', field.id)
      .eq('state', 'living')
      .order('ord', { ascending: true });
    trees =
      rows?.map((r) => ({
        id: r.id as string,
        x: Number(r.x),
        z: Number(r.z),
        seed: Number(r.seed),
      })) ?? [];
  }

  return (
    <>
      <FieldNav handle={profile?.handle ?? 'keeper'} />
      <FieldCanvas trees={trees} />
    </>
  );
}
