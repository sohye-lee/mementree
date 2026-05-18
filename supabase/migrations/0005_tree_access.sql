-- mementree — per-tree visibility for sharing.
--
-- each tree is either:
--   'public' — visible to anyone who opens the field's share link
--   'shared' — visible only to signed-in visitors (the keeper's people)
-- the keeper always sees all of their own trees regardless.
--
-- visitor read / write policies land in 0006_share_rls.sql.

alter table public.trees
  add column access text not null default 'public'
  check (access in ('public', 'shared'));
