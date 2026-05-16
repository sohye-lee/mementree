import { redirect } from 'next/navigation';
import {
  FieldChrome,
  type FieldTreeData,
} from '@/components/field/field-chrome';
import type { FallenItem } from '@/components/field/fallen-tray';
import { createClient } from '@/lib/db/server';
import type { FieldMode } from '@/types/domain';

// the field view — mementree's home for an authed keeper.
// data loading: profile → field (auto-create if missing) → living trees +
// memos → fallen items (trees + memos). all reactive ui state lives in
// FieldChrome.

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

  // living trees + their tied memos (server filters by state for both)
  let trees: FieldTreeData[] = [];
  let fallen: FallenItem[] = [];

  if (field) {
    const { data: treeRows } = await supabase
      .from('trees')
      .select(
        'id, x, z, seed, ord, name, year, lead, description, state, withered_at',
      )
      .eq('field_id', field.id)
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

    type MemoRow = {
      id: string;
      tree_id: string;
      author: string | null;
      text: string;
      state: 'tied' | 'fallen';
      created_at: string;
      fallen_at: string | null;
    };
    const memos = (memoRows ?? []) as MemoRow[];

    const treeNameById = new Map<string, string>();
    for (const r of treeRows ?? []) treeNameById.set(r.id as string, r.name as string);

    // tied memos grouped by tree
    const tiedByTree = new Map<string, MemoRow[]>();
    for (const m of memos) {
      if (m.state !== 'tied') continue;
      const arr = tiedByTree.get(m.tree_id) ?? [];
      arr.push(m);
      tiedByTree.set(m.tree_id, arr);
    }

    trees = (treeRows ?? [])
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
          memos: myMemos.map((m) => ({
            id: m.id,
            author: m.author,
            text: m.text,
            createdAt: m.created_at,
          })),
        };
      });

    // fallen items: withered trees + fallen memos (sorted by recency)
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

    fallen = [...witheredTrees, ...fallenMemos]
      .sort((a, b) => b.sortKey - a.sortKey)
      .map((r) => r.item);
  }

  const firstTime = trees.length === 0;
  const fieldMode = (field?.mode ?? null) as FieldMode | null;
  const defaultLead = profile?.display_name ?? profile?.handle ?? '';

  return (
    <FieldChrome
      handle={profile?.handle ?? 'keeper'}
      trees={trees}
      fallen={fallen}
      firstTime={firstTime}
      fieldMode={fieldMode}
      defaultLead={defaultLead}
    />
  );
}
