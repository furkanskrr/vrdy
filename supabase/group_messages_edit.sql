-- Grup sohbeti: mesaj düzenleme (RLS + edited_at)
-- Supabase SQL Editor'de bir kez çalıştırın.

alter table public.group_messages
  add column if not exists edited_at timestamptz;

drop policy if exists "Kendi mesajini duzenleyebilir" on public.group_messages;

create policy "Kendi mesajini duzenleyebilir"
  on public.group_messages for update
  using (
    group_id = public.current_profile_group_id()
    and profile_id = auth.uid()
  )
  with check (
    group_id = public.current_profile_group_id()
    and profile_id = auth.uid()
  );
