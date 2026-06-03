-- Push: get_group_push_tokens guvenligi + authenticated icin EXECUTE
-- Supabase SQL Editor'de bir kez calistirin.

create or replace function public.get_group_push_tokens(p_group_id uuid)
returns table(token text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.group_id = p_group_id
  ) then
    return;
  end if;
  return query
  select p.expo_push_token::text as token
  from public.profiles p
  where p.group_id = p_group_id
    and p.expo_push_token is not null
    and btrim(p.expo_push_token) <> '';
end;
$$;

grant execute on function public.get_group_push_tokens(uuid) to authenticated;
