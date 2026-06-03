-- Sabitleme: tüm grup üyeleri (müdür şartı yok)
-- Supabase SQL Editor'de bir kez çalıştırın.

drop policy if exists "Mudur sabit mesaj ekler" on public.group_pinned_messages;
drop policy if exists "Mudur sabit mesaj siler" on public.group_pinned_messages;
drop policy if exists "Grup uyesi sabit mesaj ekler" on public.group_pinned_messages;
drop policy if exists "Grup uyesi sabit mesaj siler" on public.group_pinned_messages;

create policy "Grup uyesi sabit mesaj ekler"
  on public.group_pinned_messages for insert
  with check (
    group_id = public.current_profile_group_id()
    and pinned_by = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.group_id = group_pinned_messages.group_id
    )
  );

create policy "Grup uyesi sabit mesaj siler"
  on public.group_pinned_messages for delete
  using (
    group_id = public.current_profile_group_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.group_id = group_pinned_messages.group_id
    )
  );

drop policy if exists "Mudur grup sabit mesajini guncelleyebilir" on public.groups;
drop policy if exists "Grup uyesi sabit mesaj guncelleyebilir" on public.groups;

create policy "Grup uyesi sabit mesaj guncelleyebilir"
  on public.groups for update
  using (
    id = public.current_profile_group_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.group_id = groups.id
    )
  )
  with check (
    id = public.current_profile_group_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.group_id = groups.id
    )
  );
