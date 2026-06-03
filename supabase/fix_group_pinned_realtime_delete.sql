-- Sabit kaldırma: DELETE realtime + eski legacy sütun temizliği
-- Supabase SQL Editor'de bir kez çalıştırın.

alter table public.group_pinned_messages replica identity full;

do $realtime$
begin
  alter publication supabase_realtime add table public.groups;
exception
  when duplicate_object then
    null;
end
$realtime$;
