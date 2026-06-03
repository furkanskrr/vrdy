-- Grup sohbeti: yanıt (reply) ve sabitlenmiş duyuru (pinned_message_id)
-- Supabase SQL Editor'de bir kez çalıştırın.

-- Yanıtlanan mesaj (aynı grupta olmalı)
alter table public.group_messages
  add column if not exists reply_to_id uuid references public.group_messages(id) on delete set null;

create index if not exists group_messages_reply_to_idx
  on public.group_messages (reply_to_id)
  where reply_to_id is not null;

-- Grup başına tek sabit mesaj
alter table public.groups
  add column if not exists pinned_message_id uuid references public.group_messages(id) on delete set null;

create or replace function public.groups_pinned_message_same_group()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.pinned_message_id is null then
    return new;
  end if;
  if not exists (
    select 1 from public.group_messages m
    where m.id = new.pinned_message_id and m.group_id = new.id
  ) then
    raise exception 'pinned_message_id bu gruba ait bir mesaj olmalı';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_groups_pinned_check on public.groups;
create trigger trg_groups_pinned_check
  before insert or update of pinned_message_id on public.groups
  for each row execute procedure public.groups_pinned_message_same_group();

-- Müdür güncellemesi yalnızca sabitleme alanına izin versin (diğer sütunlar değişemez).
-- İstisna: kullanıcı silme / FK bakımı — yalnızca olusturan_id NULL yapılabilir (diğer sütunlar aynı kalmalı).
create or replace function public.groups_mudur_pin_only_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.olusturan_id is distinct from new.olusturan_id
     and new.olusturan_id is null
     and new.id is not distinct from old.id
     and new.kod is not distinct from old.kod
     and new.magaza_adi is not distinct from old.magaza_adi
     and new.created_at is not distinct from old.created_at
     and new.pinned_message_id is not distinct from old.pinned_message_id
  then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.kod is distinct from old.kod
     or new.magaza_adi is distinct from old.magaza_adi
     or new.olusturan_id is distinct from old.olusturan_id
     or new.created_at is distinct from old.created_at
  then
    raise exception 'Grup kaydında yalnızca pinned_message_id güncellenebilir';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_groups_pin_only on public.groups;
create trigger trg_groups_pin_only
  before update on public.groups
  for each row execute procedure public.groups_mudur_pin_only_guard();

-- Yanıt satırı: yanıtlanan mesaj aynı grupta olmalı
create or replace function public.group_messages_reply_same_group()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.reply_to_id is null then
    return new;
  end if;
  if not exists (
    select 1 from public.group_messages parent
    where parent.id = new.reply_to_id and parent.group_id = new.group_id
  ) then
    raise exception 'reply_to_id aynı grupta olmalı';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_group_messages_reply_check on public.group_messages;
create trigger trg_group_messages_reply_check
  before insert or update of reply_to_id, group_id on public.group_messages
  for each row execute procedure public.group_messages_reply_same_group();

-- Grup üyesi: yalnızca pinned_message_id güncelleyebilir (legacy sabitleme; diğer sütunlara dokunulmaz)
drop policy if exists "Mudur grup sabit mesajini guncelleyebilir" on public.groups;
drop policy if exists "Grup uyesi sabit mesajini guncelleyebilir" on public.groups;
create policy "Grup uyesi sabit mesajini guncelleyebilir"
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

-- Realtime: groups güncellemesi (sabitleme); zaten üyeyse hata vermesin
do $realtime$
begin
  alter publication supabase_realtime add table public.groups;
exception
  when duplicate_object then
    null;
end
$realtime$;
