'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/db/server';
import { hashStr } from '@/lib/seed';
import type { FieldMode } from '@/types/domain';
import type {
  CreateFieldState,
  PlantTreeState,
  TieMemoState,
} from './action-state';

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

// derive a url slug from a field name: lowercase ascii words joined by hyphens.
// non-ascii names (e.g. korean) reduce to empty — caller falls back to 'field'.
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
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

// a signed-in user. ownership of any specific field/tree/memo is enforced by
// RLS on the write — these helpers only gate on "is anyone signed in".
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, user };
}

// ─── create field ───────────────────────────────────────────────────────────

// a keeper may hold many fields — each one a different kind of keeping
// (project / wish / diary / note). the mode is chosen here, at field
// creation, and frozen; trees planted later inherit the field's kind.
export async function createField(
  _prev: CreateFieldState,
  formData: FormData,
): Promise<CreateFieldState> {
  const name = String(formData.get('name') ?? '').trim();
  const modeRaw = formData.get('mode');

  if (!name) return { ok: false, error: 'nameRequired' };
  if (!isMode(modeRaw)) return { ok: false, error: 'modeRequired' };

  const ctx = await requireUser();
  if (!ctx) return { ok: false, error: 'serverError' };
  const { supabase, user } = ctx;

  // the owner's handle forms the first url segment
  const { data: profile } = await supabase
    .from('profiles')
    .select('handle')
    .eq('id', user.id)
    .maybeSingle();
  const handle = profile?.handle as string | undefined;
  if (!handle) return { ok: false, error: 'serverError' };

  // slug must be unique within this owner — suffix on collision
  const base = slugify(name) || 'field';
  const { data: existingFields } = await supabase
    .from('fields')
    .select('slug')
    .eq('owner_id', user.id);
  const taken = new Set((existingFields ?? []).map((r) => r.slug as string));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

  const { error } = await supabase.from('fields').insert({
    owner_id: user.id,
    slug,
    title: name,
    mode: modeRaw,
  });
  if (error) return { ok: false, error: 'serverError' };

  revalidatePath('/');
  redirect(`/${handle}/${slug}`);
}

// ─── plant tree ──────────────────────────────────────────────────────────────

export async function plantTree(
  _prev: PlantTreeState,
  formData: FormData,
): Promise<PlantTreeState> {
  const fieldId = String(formData.get('fieldId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const yearRaw = String(formData.get('year') ?? '').trim();
  const leadRaw = String(formData.get('lead') ?? '').trim();
  const briefRaw = String(formData.get('brief') ?? '').trim();
  const access = formData.get('access') === 'shared' ? 'shared' : 'public';

  if (!name) return { ok: false, error: 'nameRequired' };
  if (!fieldId) return { ok: false, error: 'serverError' };

  const ctx = await requireUser();
  if (!ctx) return { ok: false, error: 'serverError' };
  const { supabase, user } = ctx;

  // the field must belong to this user (RLS also blocks the insert, but
  // resolving it here lets us fail cleanly instead of on a constraint).
  const { data: field } = await supabase
    .from('fields')
    .select('id')
    .eq('id', fieldId)
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!field) return { ok: false, error: 'serverError' };

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
  revalidatePath('/', 'layout');
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

  // a memo may be tied by the keeper OR by any signed-in visitor — so this
  // does not require field ownership. RLS gates the insert: a signed-in
  // user may tie a memo to any living public/shared tree (or their own).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'serverError' };

  // the tree must be visible to this user (RLS scopes the select).
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

  // revalidate every field route — the memo may live on a visited field
  revalidatePath('/', 'layout');
  return { ok: true, memoId: inserted.id as string };
}

// ─── soft delete + restore ───────────────────────────────────────────────────
// ownership is enforced by RLS — these only require a signed-in user.

export async function witherTree(treeId: string) {
  const ctx = await requireUser();
  if (!ctx) return;
  const { supabase } = ctx;
  await supabase
    .from('trees')
    .update({
      state: 'withered',
      withered_at: new Date().toISOString(),
    })
    .eq('id', treeId);
  revalidatePath('/', 'layout');
}

export async function liftTreeBack(treeId: string) {
  const ctx = await requireUser();
  if (!ctx) return;
  const { supabase } = ctx;
  await supabase
    .from('trees')
    .update({ state: 'living', withered_at: null })
    .eq('id', treeId);
  revalidatePath('/', 'layout');
}

export async function letMemoFall(memoId: string) {
  const ctx = await requireUser();
  if (!ctx) return;
  const { supabase } = ctx;
  await supabase
    .from('memos')
    .update({
      state: 'fallen',
      fallen_at: new Date().toISOString(),
    })
    .eq('id', memoId);
  revalidatePath('/', 'layout');
}

export async function liftMemoBack(memoId: string) {
  const ctx = await requireUser();
  if (!ctx) return;
  const { supabase } = ctx;
  await supabase
    .from('memos')
    .update({ state: 'tied', fallen_at: null })
    .eq('id', memoId);
  revalidatePath('/', 'layout');
}

// ─── tree visibility ─────────────────────────────────────────────────────────

export async function setTreeAccess(
  treeId: string,
  access: 'public' | 'shared',
) {
  const ctx = await requireUser();
  if (!ctx) return;
  const { supabase } = ctx;
  await supabase
    .from('trees')
    .update({ access: access === 'shared' ? 'shared' : 'public' })
    .eq('id', treeId);
  revalidatePath('/', 'layout');
}
