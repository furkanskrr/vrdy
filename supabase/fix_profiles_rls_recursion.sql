-- profiles RLS: "infinite recursion detected in policy for relation 'profiles'"
-- Nedeni: Politikalarda (select group_id from profiles where id = auth.uid()) tekrar profiles RLS tetikliyor.
-- Cozum: SECURITY DEFINER fonksiyonu RLS'i bypass eder.
-- Supabase SQL Editor'de TEK SEFER calistirin.

create or replace function public.current_profile_group_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select group_id from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_profile_group_id() to authenticated;

-- profiles
drop policy if exists "Ayni gruptaki profilleri okuyabilir" on public.profiles;
create policy "Ayni gruptaki profilleri okuyabilir"
  on public.profiles for select using (
    group_id is not null
    and group_id = public.current_profile_group_id()
  );

-- groups
drop policy if exists "Grup uyesi grubu okuyabilir" on public.groups;
create policy "Grup uyesi grubu okuyabilir"
  on public.groups for select using (
    id = public.current_profile_group_id()
  );

-- group_members
drop policy if exists "Grup uyesi uyeleri okuyabilir" on public.group_members;
create policy "Grup uyesi uyeleri okuyabilir"
  on public.group_members for select using (
    group_id = public.current_profile_group_id()
  );

drop policy if exists "Mudur uye ekleyebilir" on public.group_members;
create policy "Mudur uye ekleyebilir"
  on public.group_members for insert with check (
    group_id = public.current_profile_group_id()
  );

drop policy if exists "Mudur uye guncelleyebilir" on public.group_members;
create policy "Mudur uye guncelleyebilir"
  on public.group_members for update using (
    group_id = public.current_profile_group_id()
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.profile_id = auth.uid()
        and gm.rol = 'mudur'
    )
  );

drop policy if exists "Mudur uye silebilir" on public.group_members;
create policy "Mudur uye silebilir"
  on public.group_members for delete using (
    group_id = public.current_profile_group_id()
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.profile_id = auth.uid()
        and gm.rol = 'mudur'
    )
  );

-- day_offs
drop policy if exists "Grup uyesi izinleri okuyabilir" on public.day_offs;
create policy "Grup uyesi izinleri okuyabilir"
  on public.day_offs for select using (
    group_id = public.current_profile_group_id()
  );

-- shift_overrides
drop policy if exists "Grup uyesi vardiyalari okuyabilir" on public.shift_overrides;
create policy "Grup uyesi vardiyalari okuyabilir"
  on public.shift_overrides for select using (
    group_id = public.current_profile_group_id()
  );
