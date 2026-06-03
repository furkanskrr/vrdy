-- =============================================
-- Vrdy - Supabase Database Schema
-- Supabase SQL Editor'de calistirin
-- =============================================

-- 1. Profiles (auth.users ile 1:1)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  ad text not null default '',
  magaza_adi text not null default '',
  rol text not null default 'personel' check (rol in ('mudur', 'yardimci', 'personel')),
  onboarding_complete boolean not null default false,
  group_id uuid,
  expo_push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mevcut projeler: tablo zaten varken sütun eklemek için (SQL Editor'de bir kez)
alter table public.profiles
  add column if not exists onboarding_complete boolean not null default false;

-- Oturumdaki kullanicinin group_id degeri (SECURITY DEFINER: profiles RLS dongusunu kirar)
create or replace function public.current_profile_group_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select group_id from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_profile_group_id() to authenticated;

alter table public.profiles enable row level security;

create policy "Herkes kendi profilini okuyabilir"
  on public.profiles for select using (auth.uid() = id);

create policy "Ayni gruptaki profilleri okuyabilir"
  on public.profiles for select using (
    group_id is not null
    and group_id = public.current_profile_group_id()
  );

create policy "Herkes kendi profilini guncelleyebilir"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Yeni kullanici kayit olunca profil olustur
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, ad)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'ad', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Groups (magaza gruplari)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  kod text not null unique,
  magaza_adi text not null,
  olusturan_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;

create policy "Grup uyesi grubu okuyabilir"
  on public.groups for select using (
    id = public.current_profile_group_id()
  );

create policy "Herkes gruplarin kodunu arayabilir"
  on public.groups for select using (true);

create policy "Herkes grup olusturabilir"
  on public.groups for insert with check (auth.uid() = olusturan_id);

-- 3. Group Members (ekip uyeler)
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  ad text not null,
  rol text not null default 'personel' check (rol in ('mudur', 'yardimci', 'personel')),
  partner_id uuid references public.group_members(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(group_id, profile_id)
);

alter table public.group_members enable row level security;

create policy "Grup uyesi uyeleri okuyabilir"
  on public.group_members for select using (
    group_id = public.current_profile_group_id()
  );

create policy "Mudur uye ekleyebilir"
  on public.group_members for insert with check (
    group_id = public.current_profile_group_id()
  );

-- Davet kodu ile katilan: profilde henuz group_id yok; yukaridaki politika NULL yuzunden reddeder
create policy "Davet ile kendini gruba ekle"
  on public.group_members for insert with check (
    profile_id = auth.uid()
    and public.current_profile_group_id() is null
  );

create policy "Mudur uye guncelleyebilir"
  on public.group_members for update using (
    group_id = public.current_profile_group_id()
    and exists (
      select 1 from public.group_members
      where group_id = group_members.group_id
        and profile_id = auth.uid()
        and rol = 'mudur'
    )
  );

create policy "Mudur uye silebilir"
  on public.group_members for delete using (
    group_id = public.current_profile_group_id()
    and exists (
      select 1 from public.group_members
      where group_id = group_members.group_id
        and profile_id = auth.uid()
        and rol = 'mudur'
    )
  );

-- 4. Day Offs (izin gunleri)
create table if not exists public.day_offs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  member_id uuid not null references public.group_members(id) on delete cascade,
  gun_index smallint not null check (gun_index between 0 and 6),
  updated_at timestamptz not null default now(),
  unique(group_id, member_id)
);

alter table public.day_offs enable row level security;

create policy "Grup uyesi izinleri okuyabilir"
  on public.day_offs for select using (
    group_id = public.current_profile_group_id()
  );

create policy "Mudur izin ekleyebilir"
  on public.day_offs for insert with check (
    exists (
      select 1 from public.group_members
      where group_id = day_offs.group_id
        and profile_id = auth.uid()
        and rol = 'mudur'
    )
  );

create policy "Mudur izin guncelleyebilir"
  on public.day_offs for update using (
    exists (
      select 1 from public.group_members
      where group_id = day_offs.group_id
        and profile_id = auth.uid()
        and rol = 'mudur'
    )
  );

create policy "Mudur izin silebilir"
  on public.day_offs for delete using (
    exists (
      select 1 from public.group_members
      where group_id = day_offs.group_id
        and profile_id = auth.uid()
        and rol = 'mudur'
    )
  );

-- 5. Shift Overrides (vardiya atamalari)
create table if not exists public.shift_overrides (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  member_id uuid not null references public.group_members(id) on delete cascade,
  tarih date not null,
  shift_kind text not null check (shift_kind in (
    'sabah', 'ogle', 'tamgun', 'izin', 'antre', 'aksam',
    'envanter', 'envanter_izni', 'envanter_full',
    'resmi_tatil'
  )),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(group_id, member_id, tarih)
);

alter table public.shift_overrides enable row level security;

create policy "Grup uyesi vardiyalari okuyabilir"
  on public.shift_overrides for select using (
    group_id = public.current_profile_group_id()
  );

create policy "Mudur vardiya atayabilir"
  on public.shift_overrides for insert with check (
    exists (
      select 1 from public.group_members
      where group_id = shift_overrides.group_id
        and profile_id = auth.uid()
        and rol = 'mudur'
    )
  );

create policy "Mudur vardiya guncelleyebilir"
  on public.shift_overrides for update using (
    exists (
      select 1 from public.group_members
      where group_id = shift_overrides.group_id
        and profile_id = auth.uid()
        and rol = 'mudur'
    )
  );

create policy "Mudur vardiya silebilir"
  on public.shift_overrides for delete using (
    exists (
      select 1 from public.group_members
      where group_id = shift_overrides.group_id
        and profile_id = auth.uid()
        and rol = 'mudur'
    )
  );

-- 5b. Resmi tatil takvimi (grup bazli takvim gunleri)
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

-- 6. Realtime yayin (tum tablolar icin)
alter publication supabase_realtime add table public.group_members;
alter publication supabase_realtime add table public.day_offs;
alter publication supabase_realtime add table public.group_holidays;
alter publication supabase_realtime add table public.shift_overrides;

-- 7. Push bildirim: sadece ayni gruptaki uyeler RPC cagirabilir
create or replace function public.get_group_push_tokens(p_group_id uuid)
returns table(token text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.group_id = p_group_id
  ) then
    return;
  end if;
  return query
  select p.expo_push_token::text as token
  from public.profiles p
  where p.group_id = p_group_id
    and p.expo_push_token is not null
    and btrim(p.expo_push_token) <> '';
end;
$$;

grant execute on function public.get_group_push_tokens(uuid) to authenticated;

-- 8. Vardiya takası (partner → müdür onayı → override)
create table if not exists public.shift_swap_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  from_member_id uuid not null references public.group_members(id) on delete cascade,
  to_member_id uuid not null references public.group_members(id) on delete cascade,
  date_from date not null,
  date_to date not null,
  shift_kind_from text not null check (shift_kind_from in (
    'sabah', 'ogle', 'tamgun', 'izin', 'antre', 'aksam',
    'envanter', 'envanter_izni', 'envanter_full',
    'resmi_tatil'
  )),
  shift_kind_to text not null check (shift_kind_to in (
    'sabah', 'ogle', 'tamgun', 'izin', 'antre', 'aksam',
    'envanter', 'envanter_izni', 'envanter_full',
    'resmi_tatil'
  )),
  status text not null default 'awaiting_partner' check (status in (
    'awaiting_partner', 'awaiting_manager', 'approved', 'rejected_partner', 'rejected_manager', 'cancelled'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shift_swap_requests_group_id_idx on public.shift_swap_requests(group_id);

-- Takas yalnizca ayni takvim gunu icin
alter table public.shift_swap_requests
  drop constraint if exists shift_swap_same_day;
alter table public.shift_swap_requests
  add constraint shift_swap_same_day check (date_from = date_to);

alter table public.shift_swap_requests enable row level security;

create policy "Grup takaslarini okuyabilir"
  on public.shift_swap_requests for select using (
    group_id = public.current_profile_group_id()
  );

create policy "Takas talebi olustur"
  on public.shift_swap_requests for insert with check (
    group_id = public.current_profile_group_id()
    and status = 'awaiting_partner'
    and exists (
      select 1 from public.group_members fm
      where fm.id = from_member_id
        and fm.profile_id = auth.uid()
        and fm.group_id = shift_swap_requests.group_id
        and (
          fm.partner_id = to_member_id
          or exists (
            select 1 from public.group_members tm
            where tm.id = to_member_id
              and tm.partner_id = fm.id
              and tm.group_id = shift_swap_requests.group_id
          )
        )
    )
  );

create policy "Takas partner yaniti"
  on public.shift_swap_requests for update
  using (
    group_id = public.current_profile_group_id()
    and status = 'awaiting_partner'
    and exists (
      select 1 from public.group_members tm
      where tm.id = shift_swap_requests.to_member_id
        and tm.profile_id = auth.uid()
    )
  )
  with check (
    group_id = public.current_profile_group_id()
    and status in ('awaiting_manager', 'rejected_partner')
  );

create policy "Takas mudur onayi"
  on public.shift_swap_requests for update
  using (
    group_id = public.current_profile_group_id()
    and status = 'awaiting_manager'
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = shift_swap_requests.group_id
        and gm.profile_id = auth.uid()
        and gm.rol = 'mudur'
    )
  )
  with check (
    group_id = public.current_profile_group_id()
    and status in ('approved', 'rejected_manager')
  );

create policy "Takas talep iptali"
  on public.shift_swap_requests for update
  using (
    group_id = public.current_profile_group_id()
    and status = 'awaiting_partner'
    and exists (
      select 1 from public.group_members fm
      where fm.id = shift_swap_requests.from_member_id
        and fm.profile_id = auth.uid()
    )
  )
  with check (
    group_id = public.current_profile_group_id()
    and status = 'cancelled'
  );

alter publication supabase_realtime add table public.shift_swap_requests;

create or replace function public.get_push_tokens_for_profiles(
  p_group_id uuid,
  p_profile_ids uuid[]
)
returns table(token text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.group_id = p_group_id
  ) then
    return;
  end if;
  return query
  select p.expo_push_token::text as token
  from public.profiles p
  where p.group_id = p_group_id
    and p.id = any(p_profile_ids)
    and p.expo_push_token is not null
    and btrim(p.expo_push_token) <> '';
end;
$$;

grant execute on function public.get_push_tokens_for_profiles(uuid, uuid[]) to authenticated;

-- Kurulum tamamlandı bilgisi: profiles yerine auth.users.raw_user_meta_data.onboarding_complete (uygulama yazar)
