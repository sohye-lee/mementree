-- mementree — row level security policies (v1: keeper-only)
-- v2 will add policies for visitors based on fields.access and fields.visitor_perm.

alter table public.profiles enable row level security;
alter table public.fields   enable row level security;
alter table public.trees    enable row level security;
alter table public.memos    enable row level security;

-- profiles: a user can read and edit only their own profile
create policy "profiles: self only" on public.profiles
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- fields: keeper has full access. visitor access deferred to v2.
create policy "fields: keeper only (v1)" on public.fields
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- trees: scoped through the owning field
create policy "trees: via field keeper (v1)" on public.trees
  for all
  using (field_id in (select id from public.fields where owner_id = auth.uid()))
  with check (field_id in (select id from public.fields where owner_id = auth.uid()));

-- memos: scoped through the owning tree's field
create policy "memos: via tree field keeper (v1)" on public.memos
  for all
  using (
    tree_id in (
      select t.id from public.trees t
      join public.fields f on f.id = t.field_id
      where f.owner_id = auth.uid()
    )
  )
  with check (
    tree_id in (
      select t.id from public.trees t
      join public.fields f on f.id = t.field_id
      where f.owner_id = auth.uid()
    )
  );
