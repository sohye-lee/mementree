'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/db/server';
import { hashStr } from '@/lib/seed';
import type { FieldMode } from '@/types/domain';
import type { PlantTreeState } from './plant-state';

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/sign-in');
}

const VALID_MODES: readonly FieldMode[] = ['project', 'wish', 'diary', 'note'];

function isMode(v: unknown): v is FieldMode {
  return typeof v === 'string' && (VALID_MODES as readonly string[]).includes(v);
}

// finds an open spot for a new tree. first tree always lands at (0, -2) so the
// keeper sees it right in front. subsequent trees probe random positions in
// ±15 units, keeping ≥4 units from any existing tree. matches the tone of the
// original `pickPlantingSpot` (random + far-enough) without needing camera
// state on the server.
function pickPosition(
  existing: { x: number; z: number }[],
): { x: number; z: number } {
  if (existing.length === 0) return { x: 0, z: -2 };

  const MIN_DIST_SQ = 4 * 4;
  for (let attempt = 0; attempt < 64; attempt++) {
    const x = (Math.random() - 0.5) * 30;
    const z = (Math.random() - 0.5) * 30;
    let ok = true;
    for (const t of existing) {
      const dx = t.x - x;
      const dz = t.z - z;
      if (dx * dx + dz * dz < MIN_DIST_SQ) {
        ok = false;
        break;
      }
    }
    if (ok) {
      return {
        x: Math.round(x * 10) / 10,
        z: Math.round(z * 10) / 10,
      };
    }
  }
  // last resort: just place somewhere; collision is unlikely after 64 tries.
  return {
    x: Math.round((Math.random() - 0.5) * 30 * 10) / 10,
    z: Math.round((Math.random() - 0.5) * 30 * 10) / 10,
  };
}

export async function plantTree(
  _prev: PlantTreeState,
  formData: FormData,
): Promise<PlantTreeState> {
  const name = String(formData.get('name') ?? '').trim();
  const yearRaw = String(formData.get('year') ?? '').trim();
  const leadRaw = String(formData.get('lead') ?? '').trim();
  const briefRaw = String(formData.get('brief') ?? '').trim();
  const modeRaw = formData.get('mode');

  if (!name) {
    return { ok: false, error: 'nameRequired' };
  }
  if (name.length > 40) {
    // gently truncate rather than error — keeps the moment moving.
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'serverError' };
  }

  // load the keeper's field. should always exist by the time the modal opens
  // (page.tsx auto-creates one), but guard anyway.
  const { data: field } = await supabase
    .from('fields')
    .select('id, mode')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!field) {
    return { ok: false, error: 'serverError' };
  }

  // first tree picks the field's mode; subsequent trees inherit it.
  const isFirst = field.mode === null;
  if (isFirst) {
    if (!isMode(modeRaw)) {
      return { ok: false, error: 'modeRequired' };
    }
    const { error: modeErr } = await supabase
      .from('fields')
      .update({ mode: modeRaw })
      .eq('id', field.id);
    if (modeErr) return { ok: false, error: 'serverError' };
  }

  // load existing trees for placement + ord. only living ones occupy space.
  const { data: livingRows } = await supabase
    .from('trees')
    .select('x, z, ord')
    .eq('field_id', field.id)
    .eq('state', 'living');

  const existing = (livingRows ?? []).map((r) => ({
    x: Number(r.x),
    z: Number(r.z),
  }));
  const pos = pickPosition(existing);
  const nextOrd =
    Math.max(0, ...(livingRows ?? []).map((r) => Number(r.ord) || 0)) + 1;

  const profile = (
    await supabase
      .from('profiles')
      .select('handle, display_name')
      .eq('id', user.id)
      .maybeSingle()
  ).data;
  const defaultLead = profile?.display_name ?? profile?.handle ?? '';

  const tree = {
    field_id: field.id,
    ord: nextOrd,
    name,
    year: yearRaw || String(new Date().getFullYear()),
    lead: leadRaw || defaultLead,
    description: briefRaw || null,
    x: pos.x,
    z: pos.z,
    // seed pinned to creation moment so renames don't reshape the tree
    seed: hashStr(`${name}:${Date.now()}`),
  };

  const { data: inserted, error } = await supabase
    .from('trees')
    .insert(tree)
    .select('id')
    .single();

  if (error || !inserted) {
    return { ok: false, error: 'serverError' };
  }

  revalidatePath('/');
  return { ok: true, treeId: inserted.id as string };
}
