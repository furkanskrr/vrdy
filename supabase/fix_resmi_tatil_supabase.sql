-- =============================================================================
-- ZORUNLU: Resmi tatil + vardiya kaydı (mevcut Supabase projesinde bir kez çalıştırın)
-- Hata örnekleri:
--   "violates check constraint shift_overrides_shift_kind_check"
--   "Could not find the table 'public.group_holidays'"
-- Supabase Dashboard → SQL → New query → Tümünü yapıştır → Run
-- =============================================================================

-- 1) group_holidays tablosu
create table if not exists public.group_holidays (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  tarih date not null,
  aciklama text not null default 'Resmi tatil',
  created_at timestamptz not null default now(),
  unique (group_id, tarih)
);

create index if not exists group_holidays_group_id_idx on public.group_holidays(group_id);

alter table public.group_holidays enable row level security;

drop policy if exists "Grup tatillerini okuyabilir" on public.group_holidays;
drop policy if exists "Mudur tatil ekleyebilir" on public.group_holidays;
drop policy if exists "Mudur tatil guncelleyebilir" on public.group_holidays;
drop policy if exists "Mudur tatil silebilir" on public.group_holidays;

create policy "Grup tatillerini okuyabilir"
  on public.group_holidays for select using (
    group_id = public.current_profile_group_id()
  );

create policy "Mudur tatil ekleyebilir"
  on public.group_holidays for insert with check (
    exists (
      select 1 from public.group_members
      where group_id = group_holidays.group_id
        and profile_id = auth.uid()
        and rol = 'mudur'
    )
  );

create policy "Mudur tatil guncelleyebilir"
  on public.group_holidays for update using (
    exists (
      select 1 from public.group_members
      where group_id = group_holidays.group_id
        and profile_id = auth.uid()
        and rol = 'mudur'
    )
  );

create policy "Mudur tatil silebilir"
  on public.group_holidays for delete using (
    exists (
      select 1 from public.group_members
      where group_id = group_holidays.group_id
        and profile_id = auth.uid()
        and rol = 'mudur'
    )
  );

-- Realtime (zaten ekliyse bu blok hata vermez)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_holidays'
  ) then
    alter publication supabase_realtime add table public.group_holidays;
  end if;
end $$;

-- 2) shift_overrides: resmi_tatil türü
alter table public.shift_overrides
  drop constraint if exists shift_overrides_shift_kind_check;

alter table public.shift_overrides
  add constraint shift_overrides_shift_kind_check check (shift_kind in (
    'sabah', 'ogle', 'tamgun', 'izin', 'antre', 'aksam',
    'envanter', 'envanter_izni', 'envanter_full',
    'resmi_tatil'
  ));

-- 3) Takas tablosu varsa aynı tür listesi
do $$
begin
  if to_regclass('public.shift_swap_requests') is not null then
    alter table public.shift_swap_requests
      drop constraint if exists shift_swap_requests_shift_kind_from_check;
    alter table public.shift_swap_requests
      drop constraint if exists shift_swap_requests_shift_kind_to_check;

    alter table public.shift_swap_requests
      add constraint shift_swap_requests_shift_kind_from_check check (shift_kind_from in (
        'sabah', 'ogle', 'tamgun', 'izin', 'antre', 'aksam',
        'envanter', 'envanter_izni', 'envanter_full',
        'resmi_tatil'
      ));

    alter table public.shift_swap_requests
      add constraint shift_swap_requests_shift_kind_to_check check (shift_kind_to in (
        'sabah', 'ogle', 'tamgun', 'izin', 'antre', 'aksam',
        'envanter', 'envanter_izni', 'envanter_full',
        'resmi_tatil'
      ));
  end if;
end $$;
