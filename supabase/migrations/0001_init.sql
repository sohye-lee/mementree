-- mementree — initial schema
-- source: handoff/data-model.md §2
-- adapted for supabase: app profiles link 1:1 to auth.users

-- profiles: 1:1 with auth.users, holds the public handle and display name
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  handle       text unique not null,
  display_name text,
  created_at   timestamptz not null default now()
);

-- fields: a user's space. one user can own many fields (v2+).
create table public.fields (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  slug          text not null,
  title         text not null,
  mode          text not null check (mode in ('project','wish','diary','note')),
  access        text not null default 'private' check (access in ('private','unlisted','public')),
  password_hash text,
  visitor_perm  text not null default 'read'
                check (visitor_perm in ('read','memo','plant')),
  created_at    timestamptz not null default now(),
  unique (owner_id, slug)
);

-- trees: each tree in a field is a project/diary entry
-- handoff calls the column 'desc' but that's a sql reserved word; renamed to 'description'
create table public.trees (
  id          uuid primary key default gen_random_uuid(),
  field_id    uuid not null references public.fields(id) on delete cascade,
  ord         int  not null,
  name        text not null,
  year        text,
  lead        text,
  description text,
  x           real not null,
  z           real not null,
  seed        bigint not null,
  state       text not null default 'living' check (state in ('living','withered')),
  withered_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index trees_field_living_idx on public.trees(field_id) where state = 'living';

-- memos: notes hung on a tree's branches
create table public.memos (
  id         uuid primary key default gen_random_uuid(),
  tree_id    uuid not null references public.trees(id) on delete cascade,
  ord        int  not null,
  author     text,
  text       text not null,
  state      text not null default 'tied' check (state in ('tied','fallen')),
  fallen_at  timestamptz,
  created_at timestamptz not null default now()
);
create index memos_tree_tied_idx on public.memos(tree_id) where state = 'tied';
