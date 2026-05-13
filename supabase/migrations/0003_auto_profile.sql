-- mementree — auto-create a profile when a new auth user signs up.
-- handle is derived from the email's local part (lowercased, alphanum only).
-- on collision, append a short uuid suffix.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_handle text;
  final_handle text;
begin
  base_handle := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9]', '', 'gi'));

  if base_handle = '' or base_handle is null then
    base_handle := 'keeper';
  end if;

  final_handle := base_handle;

  if exists (select 1 from public.profiles where handle = final_handle) then
    final_handle := base_handle || '_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  insert into public.profiles (id, handle, display_name)
  values (new.id, final_handle, null);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
