-- auth.users silinirken "Database error deleting user" hatası
-- Supabase → SQL Editor'de çalıştırın. Güvenle tekrar çalıştırılabilir.
--
-- 1) groups.olusturan_id → profil silinince NULL
-- 2) shift_overrides.created_by → profil silinince NULL
-- 3) group_members.partner_id → partner üye satırı silinince diğer satırda NULL (en sık eksik olan)

-- ─── groups.olusturan_id ───
do $$
declare
  r record;
begin
  for r in
    select tc.constraint_name as cname
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_schema = kcu.constraint_schema
      and tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
      and tc.table_name = kcu.table_name
    where tc.table_schema = 'public'
      and tc.table_name = 'groups'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'olusturan_id'
  loop
    execute format('alter table public.groups drop constraint %I', r.cname);
  end loop;
end $$;

alter table public.groups
  add constraint groups_olusturan_id_fkey
  foreign key (olusturan_id) references public.profiles(id) on delete set null;

-- ─── shift_overrides.created_by ───
do $$
declare
  r record;
begin
  for r in
    select tc.constraint_name as cname
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_schema = kcu.constraint_schema
      and tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
      and tc.table_name = kcu.table_name
    where tc.table_schema = 'public'
      and tc.table_name = 'shift_overrides'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'created_by'
  loop
    execute format('alter table public.shift_overrides drop constraint %I', r.cname);
  end loop;
end $$;

alter table public.shift_overrides
  add constraint shift_overrides_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

-- ─── group_members.partner_id (partner eşlemesi silmeyi engelliyorsa) ───
do $$
declare
  r record;
begin
  for r in
    select tc.constraint_name as cname
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_schema = kcu.constraint_schema
      and tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
      and tc.table_name = kcu.table_name
    where tc.table_schema = 'public'
      and tc.table_name = 'group_members'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'partner_id'
  loop
    execute format('alter table public.group_members drop constraint %I', r.cname);
  end loop;
end $$;

alter table public.group_members
  add constraint group_members_partner_id_fkey
  foreign key (partner_id) references public.group_members(id) on delete set null;

-- Tanı: public şemasında profiles(id)'e referans veren FK'lar (hata sürerse sonucu paylaşın)
-- select c.conname, c.conrelid::regclass as tablo, pg_get_constraintdef(c.oid) as tanim
-- from pg_constraint c
-- where c.contype = 'f' and c.confrelid = 'public.profiles'::regclass
-- order by 2, 1;
