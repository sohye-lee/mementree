'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/db/server';
import { hashStr } from '@/lib/seed';
import type { FieldMode } from '@/types/domain';
import type { PlantTreeState, TieMemoState } from './action-state';

// ─── auth ────────────────────────────────────────────────────────────────────

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/sign-in');
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const VALID_MODES: readonly FieldMode[] = ['project', 'wish', 'diary', 'note'];

function isMode(v: unknown): v is FieldMode {
  return typeof v === 'string' && (VALID_MODES as readonly string[]).includes(v);
}

// finds an open spot for a new tree. first tree always lands at (0, -2) so the
// keeper sees it right in front. subsequent trees probe random positions in
// ±15 units, keeping ≥4 units from any existing tree.
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
      return { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 };
    }
  }
  return {
    x: Math.round((Math.random() - 0.5) * 30 * 10) / 10,
    z: Math.round((Math.random() - 0.5) * 30 * 10) / 10,
  };
}

async function requireKeeperField() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: field } = await supabase
    .from('fields')
    .select('id, mode')
    .eq('owner_id', user.id)
    .maybeSingle();
  return field ? { supabase, user, field } : null;
}

// ─── plant tree ──────────────────────────────────────────────────────────────

export async function plantTree(
  _prev: PlantTreeState,
  formData: FormData,
): Promise<PlantTreeState> {
  const name = String(formData.get('name') ?? '').trim();
  const yearRaw = String(formData.get('year') ?? '').trim();
  const leadRaw = String(formData.get('lead') ?? '').trim();
  const briefRaw = String(formData.get('brief') ?? '').trim();
  const modeRaw = formData.get('mode');
  const access = formData.get('access') === 'shared' ? 'shared' : 'public';

  if (!name) return { ok: false, error: 'nameRequired' };

  const ctx = await requireKeeperField();
  if (!ctx) return { ok: false, error: 'serverError' };
  const { supabase, user, field } = ctx;

  const isFirst = field.mode === null;
  if (isFirst) {
    if (!isMode(modeRaw)) return { ok: false, error: 'modeRequired' };
    const { error: modeErr } = await supabase
      .from('fields')
      .update({ mode: modeRaw })
      .eq('id', field.id);
    if (modeErr) return { ok: false, error: 'serverError' };
  }

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
    seed: hashStr(`${name}:${Date.now()}`),
    access,
  };

  const { data: inserted, error } = await supabase
    .from('trees')
    .insert(tree)
    .select('id')
    .single();

  if (error || !inserted) return { ok: false, error: 'serverError' };
  revalidatePath('/');
  return { ok: true, treeId: inserted.id as string, treeName: name };
}

// ─── tie memo ────────────────────────────────────────────────────────────────

export async function tieMemo(
  _prev: TieMemoState,
  formData: FormData,
): Promise<TieMemoState> {
  const treeId = String(formData.get('treeId') ?? '');
  const text = String(formData.get('text') ?? '').trim();
  const authorRaw = String(formData.get('author') ?? '').trim();

  if (!text) return { ok: false, error: 'textRequired' };
  if (!treeId) return { ok: false, error: 'serverError' };

  const ctx = await requireKeeperField();
  if (!ctx) return { ok: false, error: 'serverError' };
  const { supabase, user } = ctx;

  // confirm tree exists in keeper's field (rls helps but we want a clean error)
  const { data: tree } = await supabase
    .from('trees')
    .select('id')
    .eq('id', treeId)
    .maybeSingle();
  if (!tree) return { ok: false, error: 'serverError' };

  const { data: tiedRows } = await supabase
    .from('memos')
    .select('ord')
    .eq('tree_id', treeId)
    .eq('state', 'tied');
  const nextOrd =
    Math.max(0, ...(tiedRows ?? []).map((r) => Number(r.ord) || 0)) + 1;

  const profile = (
    await supabase
      .from('profiles')
      .select('handle, display_name')
      .eq('id', user.id)
      .maybeSingle()
  ).data;
  const defaultAuthor = profile?.display_name ?? profile?.handle ?? '';

  const memo = {
    tree_id: treeId,
    ord: nextOrd,
    author: authorRaw || defaultAuthor || null,
    text: text.slice(0, 180),
  };

  const { data: inserted, error } = await supabase
    .from('memos')
    .insert(memo)
    .select('id')
    .single();
  if (error || !inserted) return { ok: false, error: 'serverError' };

  revalidatePath('/');
  return { ok: true, memoId: inserted.id as string };
}

// ─── soft delete + restore ───────────────────────────────────────────────────

export async function witherTree(treeId: string) {
  const ctx = await requireKeeperField();
  if (!ctx) return;
  const { supabase } = ctx;
  await supabase
    .from('trees')
    .update({
      state: 'withered',
      withered_at: new Date().toISOString(),
    })
    .eq('id', treeId);
  revalidatePath('/');
}

export async function liftTreeBack(treeId: string) {
  const ctx = await requireKeeperField();
  if (!ctx) return;
  const { supabase } = ctx;
  await supabase
    .from('trees')
    .update({ state: 'living', withered_at: null })
    .eq('id', treeId);
  revalidatePath('/');
}

export async function letMemoFall(memoId: string) {
  const ctx = await requireKeeperField();
  if (!ctx) return;
  const { supabase } = ctx;
  await supabase
    .from('memos')
    .update({
      state: 'fallen',
      fallen_at: new Date().toISOString(),
    })
    .eq('id', memoId);
  revalidatePath('/');
}

export async function liftMemoBack(memoId: string) {
  const ctx = await requireKeeperField();
  if (!ctx) return;
  const { supabase } = ctx;
  await supabase
    .from('memos')
    .update({ state: 'tied', fallen_at: null })
    .eq('id', memoId);
  revalidatePath('/');
}

// ─── tree visibility ─────────────────────────────────────────────────────────

export async function setTreeAccess(
  treeId: string,
  access: 'public' | 'shared',
) {
  const ctx = await requireKeeperField();
  if (!ctx) return;
  const { supabase } = ctx;
  await supabase
    .from('trees')
    .update({ access: access === 'shared' ? 'shared' : 'public' })
    .eq('id', treeId);
  revalidatePath('/');
}
