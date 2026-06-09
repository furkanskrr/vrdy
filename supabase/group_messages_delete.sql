-- Grup sohbeti: mesaj silme (RLS)
-- Supabase SQL Editor'de bir kez çalıştırın.

-- Realtime DELETE olayında eski satır (group_id dahil) için gerekli
alter table public.group_messages replica identity full;

drop policy if exists "Kendi mesajini silebilir" on public.group_messages;
drop policy if exists "Mudur grup mesajini silebilir" on public.group_messages;

create policy "Kendi mesajini silebilir"
  on public.group_messages for delete
  using (
    group_id = public.current_profile_group_id()
    and profile_id = auth.uid()
  );

create policy "Mudur grup mesajini silebilir"
  on public.group_messages for delete
  using (
    group_id = public.current_profile_group_id()
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = group_messages.group_id
        and gm.profile_id = auth.uid()
        and gm.rol in ('mudur', 'yardimci')
    )
  );
