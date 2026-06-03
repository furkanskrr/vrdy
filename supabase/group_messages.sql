-- Grup içi sohbet (haberleşme; bildirim akışı değil, mesaj listesi)
-- Supabase SQL Editor'de bir kez çalıştırın. Realtime açıksa yayına eklenir.

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sender_ad text not null,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists group_messages_group_created_idx
  on public.group_messages (group_id, created_at desc);

alter table public.group_messages enable row level security;

-- Tekrar çalıştırınca 42710 (policy already exists) olmaması için
drop policy if exists "Grup uyesi mesajlari okuyabilir" on public.group_messages;
drop policy if exists "Grup uyesi mesaj yazabilir" on public.group_messages;

create policy "Grup uyesi mesajlari okuyabilir"
  on public.group_messages for select
  using (group_id = public.current_profile_group_id());

create policy "Grup uyesi mesaj yazabilir"
  on public.group_messages for insert
  with check (
    group_id = public.current_profile_group_id()
    and profile_id = auth.uid()
  );

-- Gerçek zamanlı: tablo zaten yayında ise 42710 vermemesi için
-- Dashboard: Database → Replication → group_messages işaretli olmalı.
do $realtime$
begin
  alter publication supabase_realtime add table public.group_messages;
exception
  when duplicate_object then
    null; -- zaten "supabase_realtime" üyesi
end
$realtime$;
