-- mementree — make fields.mode nullable.
--
-- mode is selected when the keeper plants their FIRST tree (per ux decision).
-- a freshly-created empty field therefore has no mode yet. once the first
-- tree is planted, the chosen mode is written here and frozen for the field.

alter table public.fields drop constraint fields_mode_check;
alter table public.fields alter column mode drop not null;
alter table public.fields add constraint fields_mode_check
  check (mode is null or mode in ('project', 'wish', 'diary', 'note'));
