-- mementree — share: visitor read + signed-in visitor memo insert.
--
-- the keeper-only policies from 0002_rls.sql stay. postgres ORs all
-- policies that apply to an action, so these are purely additive:
-- the keeper keeps full access; visitors gain a scoped read + memo write.

-- profiles: handle + display_name are public identity — anyone may read.
create policy "profiles: public read" on public.profiles
  for select using (true);

-- fields: a field row (slug, title, mode) carries nothing secret and must
-- be resolvable from a share link — anyone may read.
-- NOTE: password_hash lives on this table; passwords are deferred and the
-- column is null for now. when passwords land, expose fields via a view or
-- security-definer function so the hash never reaches the client.
create policy "fields: public read" on public.fields
  for select using (true);

-- trees: visitors read living trees by visibility —
--   public → anyone;  shared → signed-in visitors only.
create policy "trees: visitor read" on public.trees
  for select using (
    state = 'living'
    and (
      access = 'public'
      or (access = 'shared' and auth.uid() is not null)
    )
  );

-- memos: readable when tied and the parent tree is visitor-readable.
create policy "memos: visitor read" on public.memos
  for select using (
    state = 'tied'
    and exists (
      select 1 from public.trees t
      where t.id = memos.tree_id
        and t.state = 'living'
        and (
          t.access = 'public'
          or (t.access = 'shared' and auth.uid() is not null)
        )
    )
  );

-- memos: a signed-in visitor may tie a memo to any tree they can see.
create policy "memos: visitor insert" on public.memos
  for insert
  with check (
    auth.uid() is not null
    and exists (
      select 1 from public.trees t
      where t.id = memos.tree_id
        and t.state = 'living'
        and t.access in ('public', 'shared')
    )
  );
