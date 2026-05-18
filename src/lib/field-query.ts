// shared loader for a field's content — used by the keeper's home (`/`) and
// the visitor route (`/[handle]/[slug]`).
//
// row visibility is governed by RLS: a visitor's client only gets the trees
// they're allowed to see (public always; shared when signed in). withered
// trees and fallen memos come back empty for non-keepers, so `fallen` is
// naturally empty for visitors.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FieldTreeData } from '@/components/field/field-chrome';
import type { FallenItem } from '@/components/field/fallen-tray';
import type { TreeAccess } from '@/types/domain';

type MemoRow = {
  id: string;
  tree_id: string;
  author: string | null;
  text: string;
  state: 'tied' | 'fallen';
  created_at: string;
  fallen_at: string | null;
};

export async function loadFieldContent(
  supabase: SupabaseClient,
  fieldId: string,
): Promise<{ trees: FieldTreeData[]; fallen: FallenItem[] }> {
  const { data: treeRows } = await supabase
    .from('trees')
    .select(
      'id, x, z, seed, ord, name, year, lead, description, access, state, withered_at',
    )
    .eq('field_id', fieldId)
    .in('state', ['living', 'withered'])
    .order('ord', { ascending: true });

  const livingTreeIds = (treeRows ?? [])
    .filter((r) => r.state === 'living')
    .map((r) => r.id as string);

  const { data: memoRows } = livingTreeIds.length
    ? await supabase
        .from('memos')
        .select('id, tree_id, author, text, state, created_at, fallen_at')
        .in('tree_id', livingTreeIds)
        .in('state', ['tied', 'fallen'])
        .order('ord', { ascending: true })
    : { data: [] as unknown[] };

  const memos = (memoRows ?? []) as MemoRow[];

  const treeNameById = new Map<string, string>();
  for (const r of treeRows ?? []) {
    treeNameById.set(r.id as string, r.name as string);
  }

  // tied memos grouped by tree
  const tiedByTree = new Map<string, MemoRow[]>();
  for (const m of memos) {
    if (m.state !== 'tied') continue;
    const arr = tiedByTree.get(m.tree_id) ?? [];
    arr.push(m);
    tiedByTree.set(m.tree_id, arr);
  }

  const trees: FieldTreeData[] = (treeRows ?? [])
    .filter((r) => r.state === 'living')
    .map((r) => {
      const id = r.id as string;
      const myMemos = tiedByTree.get(id) ?? [];
      return {
        id,
        x: Number(r.x),
        z: Number(r.z),
        seed: Number(r.seed),
        ord: Number(r.ord),
        name: r.name as string,
        year: (r.year as string | null) ?? null,
        lead: (r.lead as string | null) ?? null,
        description: (r.description as string | null) ?? null,
        access: ((r.access as string | null) ?? 'public') as TreeAccess,
        memos: myMemos.map((m) => ({
          id: m.id,
          author: m.author,
          text: m.text,
          createdAt: m.created_at,
        })),
      };
    });

  // fallen items: withered trees + fallen memos, recency-sorted
  const witheredTrees = (treeRows ?? [])
    .filter((r) => r.state === 'withered')
    .map((r) => {
      const witheredAt =
        (r.withered_at as string | null) ?? new Date().toISOString();
      return {
        sortKey: new Date(witheredAt).getTime(),
        item: {
          kind: 'tree' as const,
          id: r.id as string,
          name: r.name as string,
          witheredAt,
        } satisfies FallenItem,
      };
    });

  const fallenMemos = memos
    .filter((m) => m.state === 'fallen')
    .map((m) => {
      const fallenAt = m.fallen_at ?? new Date().toISOString();
      return {
        sortKey: new Date(fallenAt).getTime(),
        item: {
          kind: 'memo' as const,
          id: m.id,
          text: m.text,
          author: m.author,
          parentTreeName: treeNameById.get(m.tree_id) ?? null,
          fallenAt,
        } satisfies FallenItem,
      };
    });

  const fallen = [...witheredTrees, ...fallenMemos]
    .sort((a, b) => b.sortKey - a.sortKey)
    .map((r) => r.item);

  return { trees, fallen };
}
