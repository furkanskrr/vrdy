-- Sohbet "görüldü": üyenin sohbeti son açtığı / son işaretlediği zaman (grup başına)
-- group_messages.sql sonrası SQL Editor'de bir kez çalıştırın.

create table if not exists public.group_chat_reads (
  group_id uuid not null references public.groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create index if not exists group_chat_reads_group_idx
  on public.group_chat_reads (group_id);

alter table public.group_chat_reads enable row level security;

create policy "Grup uyesi okumalari okuyabilir"
  on public.group_chat_reads for select
  using (group_id = public.current_profile_group_id());

create policy "Grup uyesi kendi okumasini ekler"
  on public.group_chat_reads for insert
  with check (
    group_id = public.current_profile_group_id()
    and profile_id = auth.uid()
  );

create policy "Grup uyesi kendi okumasini gunceller"
  on public.group_chat_reads for update
  using (
    group_id = public.current_profile_group_id()
    and profile_id = auth.uid()
  )
  with check (
    group_id = public.current_profile_group_id()
    and profile_id = auth.uid()
  );

-- İsteğe bağlı (zaten ekliyse yok sayın)
alter publication supabase_realtime add table public.group_chat_reads;
