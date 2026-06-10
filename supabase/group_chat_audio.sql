-- Sohbet: ses mesajı desteği
-- Supabase SQL Editor'de bir kez çalıştırın (group_chat_media_shortcuts.sql sonrası).

alter table public.group_messages drop constraint if exists group_messages_attachment_type_check;
alter table public.group_messages
  add constraint group_messages_attachment_type_check
  check (attachment_type is null or attachment_type in ('image', 'file', 'audio'));

alter table public.group_chat_shortcuts drop constraint if exists group_chat_shortcuts_response_attachment_type_check;
alter table public.group_chat_shortcuts
  add constraint group_chat_shortcuts_response_attachment_type_check
  check (response_attachment_type is null or response_attachment_type in ('image', 'file', 'audio'));

update storage.buckets
set
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/mpeg', 'audio/webm', 'audio/x-m4a'
  ]
where id = 'group-chat';
