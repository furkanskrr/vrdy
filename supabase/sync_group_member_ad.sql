-- Hesap bilgilerinden profil adı güncellendiğinde ekip listesi (group_members.ad) ile uyum için.
-- RLS: yalnızca müdür group_members güncelleyebilir; bu yüzden kullanıcı kendi satırı için SECURITY DEFINER RPC kullanır.
-- Supabase SQL Editor'de bir kez çalıştırın.

create or replace function public.sync_my_group_member_ad(p_ad text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if trim(coalesce(p_ad, '')) = '' then
    return;
  end if;
  update public.group_members
  set ad = trim(p_ad)
  where profile_id = auth.uid();
end;
$$;

grant execute on function public.sync_my_group_member_ad(text) to authenticated;
