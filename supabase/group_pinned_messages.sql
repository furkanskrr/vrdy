-- Çoklu sabit mesaj (grup başına birden fazla duyuru)
-- Supabase SQL Editor'de bir kez çalıştırın.

create table if not exists public.group_pinned_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  message_id uuid not null references public.group_messages(id) on delete cascade,
  pinned_by uuid not null references public.profiles(id) on delete cascade,
  pinned_at timestamptz not null default now(),
  unique (group_id, message_id)
);

create index if not exists group_pinned_messages_group_idx
  on public.group_pinned_messages (group_id, pinned_at desc);

create or replace function public.group_pinned_message_same_group()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.group_messages m
    where m.id = new.message_id and m.group_id = new.group_id
  ) then
    raise exception 'message_id bu gruba ait bir mesaj olmalı';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_group_pinned_same_group on public.group_pinned_messages;
create trigger trg_group_pinned_same_group
  before insert or update of message_id, group_id on public.group_pinned_messages
  for each row execute procedure public.group_pinned_message_same_group();

alter table public.group_pinned_messages enable row level security;

drop policy if exists "Grup sabit mesajlari okunur" on public.group_pinned_messages;
drop policy if exists "Mudur sabit mesaj ekler" on public.group_pinned_messages;
drop policy if exists "Mudur sabit mesaj siler" on public.group_pinned_messages;
drop policy if exists "Grup uyesi sabit mesaj ekler" on public.group_pinned_messages;
drop policy if exists "Grup uyesi sabit mesaj siler" on public.group_pinned_messages;

create policy "Grup sabit mesajlari okunur"
  on public.group_pinned_messages for select
  using (group_id = public.current_profile_group_id());

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

-- Eski tek-sütun sabitlemeyi taşı (varsa, bir müdür profiliyle)
insert into public.group_pinned_messages (group_id, message_id, pinned_by)
select g.id, g.pinned_message_id, mp.id
from public.groups g
inner join lateral (
  select p.id
  from public.profiles p
  where p.group_id = g.id and p.rol = 'mudur'
  order by p.created_at asc nulls last
  limit 1
) mp on true
where g.pinned_message_id is not null
on conflict (group_id, message_id) do nothing;

do $realtime$
begin
  alter publication supabase_realtime add table public.group_pinned_messages;
exception
  when duplicate_object then
    null;
end
$realtime$;
