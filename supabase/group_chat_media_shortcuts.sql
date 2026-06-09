-- Sohbet: fotoğraf/dosya ekleri + /ata kısayolları + Storage
-- Supabase SQL Editor'de bir kez çalıştırın.

-- 1) Mesaj ekleri (metin veya ek zorunlu)
alter table public.group_messages
  add column if not exists attachment_type text check (attachment_type is null or attachment_type in ('image', 'file')),
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text;

alter table public.group_messages drop constraint if exists group_messages_body_check;

alter table public.group_messages
  add constraint group_messages_body_check check (
    char_length(body) <= 2000
    and (
      char_length(trim(body)) > 0
      or (
        attachment_path is not null
        and btrim(attachment_path) <> ''
      )
    )
  );

-- 2) /ata kısayolları (tüm grup üyeleri ekleyebilir; aynı tetikleyici üzerine yazılır)
create table if not exists public.group_chat_shortcuts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  trigger_key text not null,
  response_body text not null default '',
  response_attachment_type text check (response_attachment_type is null or response_attachment_type in ('image', 'file')),
  response_attachment_path text,
  response_attachment_name text,
  response_attachment_mime text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  updated_at timestamptz not null default now(),
  constraint group_chat_shortcuts_trigger_len check (char_length(trim(trigger_key)) between 1 and 40),
  constraint group_chat_shortcuts_response_check check (
    char_length(response_body) <= 2000
    and (
      char_length(trim(response_body)) > 0
      or (
        response_attachment_path is not null
        and btrim(response_attachment_path) <> ''
      )
    )
  ),
  unique (group_id, trigger_key)
);

create index if not exists group_chat_shortcuts_group_idx
  on public.group_chat_shortcuts (group_id);

alter table public.group_chat_shortcuts enable row level security;

drop policy if exists "Grup uyesi kisayollari okuyabilir" on public.group_chat_shortcuts;
drop policy if exists "Grup uyesi kisayol ekleyebilir" on public.group_chat_shortcuts;
drop policy if exists "Grup uyesi kisayol guncelleyebilir" on public.group_chat_shortcuts;
drop policy if exists "Grup uyesi kisayol silebilir" on public.group_chat_shortcuts;

create policy "Grup uyesi kisayollari okuyabilir"
  on public.group_chat_shortcuts for select
  using (group_id = public.current_profile_group_id());

create policy "Grup uyesi kisayol ekleyebilir"
  on public.group_chat_shortcuts for insert
  with check (
    group_id = public.current_profile_group_id()
    and created_by = auth.uid()
  );

create policy "Grup uyesi kisayol guncelleyebilir"
  on public.group_chat_shortcuts for update
  using (group_id = public.current_profile_group_id())
  with check (group_id = public.current_profile_group_id());

create policy "Grup uyesi kisayol silebilir"
  on public.group_chat_shortcuts for delete
  using (group_id = public.current_profile_group_id());

-- 3) Storage bucket (özel; imzalı URL ile okunur)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'group-chat',
  'group-chat',
  false,
  10485760,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Grup uyesi sohbet dosyasi yukler" on storage.objects;
drop policy if exists "Grup uyesi sohbet dosyasi okur" on storage.objects;
drop policy if exists "Grup uyesi kendi dosyasini siler" on storage.objects;

create policy "Grup uyesi sohbet dosyasi yukler"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'group-chat'
    and (storage.foldername(name))[1] = public.current_profile_group_id()::text
  );

create policy "Grup uyesi sohbet dosyasi okur"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'group-chat'
    and (storage.foldername(name))[1] = public.current_profile_group_id()::text
  );

create policy "Grup uyesi kendi dosyasini siler"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'group-chat'
    and (storage.foldername(name))[1] = public.current_profile_group_id()::text
    and (storage.foldername(name))[2] = auth.uid()::text
  );
