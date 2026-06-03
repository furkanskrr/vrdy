-- Mevcut Supabase projesine vardiya takası eklemek için (bir kez çalıştırın).
-- publication satırı "already member" hatası verirse yok sayın.

-- Tablo
create table if not exists public.shift_swap_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  from_member_id uuid not null references public.group_members(id) on delete cascade,
  to_member_id uuid not null references public.group_members(id) on delete cascade,
  date_from date not null,
  date_to date not null,
  shift_kind_from text not null check (shift_kind_from in (
    'sabah', 'ogle', 'tamgun', 'izin', 'antre', 'aksam',
    'envanter', 'envanter_izni', 'envanter_full'
  )),
  shift_kind_to text not null check (shift_kind_to in (
    'sabah', 'ogle', 'tamgun', 'izin', 'antre', 'aksam',
    'envanter', 'envanter_izni', 'envanter_full'
  )),
  status text not null default 'awaiting_partner' check (status in (
    'awaiting_partner', 'awaiting_manager', 'approved', 'rejected_partner', 'rejected_manager', 'cancelled'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shift_swap_requests_group_id_idx on public.shift_swap_requests(group_id);

-- Eski farkli gunluk kayitlar varsa once temizleyin veya bu iki satiri yorumlayin
alter table public.shift_swap_requests
  drop constraint if exists shift_swap_same_day;
alter table public.shift_swap_requests
  add constraint shift_swap_same_day check (date_from = date_to);

alter table public.shift_swap_requests enable row level security;

drop policy if exists "Grup takaslarini okuyabilir" on public.shift_swap_requests;
drop policy if exists "Takas talebi olustur" on public.shift_swap_requests;
drop policy if exists "Takas partner yaniti" on public.shift_swap_requests;
drop policy if exists "Takas mudur onayi" on public.shift_swap_requests;
drop policy if exists "Takas talep iptali" on public.shift_swap_requests;

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
