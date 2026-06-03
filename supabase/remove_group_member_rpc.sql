-- Ekip üyesi silindiğinde: group_members satırı + partner bağları + ilgili profilin group_id ve onboarding sıfırlanır.
-- Böylece silinen kişi (veya yanlış gruba giren müdür) uygulamada tekrar rol / grup kurulumuna döner.
-- Supabase SQL Editor'de bir kez çalıştırın.

create or replace function public.remove_group_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  g_id uuid;
  p_id uuid;
begin
  select gm.group_id, gm.profile_id into g_id, p_id
  from public.group_members gm
  where gm.id = p_member_id;

  if not found then
    return;
  end if;

  if not exists (
    select 1 from public.group_members m
    where m.group_id = g_id
      and m.profile_id = auth.uid()
      and m.rol = 'mudur'
  ) then
    raise exception 'Yalnızca müdür üye silebilir';
  end if;

  update public.group_members
  set partner_id = null
  where group_id = g_id and partner_id = p_member_id;

  update public.group_members
  set partner_id = null
  where group_id = g_id
    and id = (
      select partner_id from public.group_members where id = p_member_id limit 1
    );

  delete from public.group_members where id = p_member_id;

  if p_id is not null then
    update public.profiles
    set
      group_id = null,
      onboarding_complete = false
    where id = p_id
      and group_id = g_id;
  end if;
end;
$$;

grant execute on function public.remove_group_member(uuid) to authenticated;
