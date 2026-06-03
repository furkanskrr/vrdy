-- Aylık mağaza temizlik takvimi: personel onayı + müdür/müdür yrd. denetim onayı
-- Supabase SQL Editor'de bir kez çalıştırın.

create table if not exists public.group_cleaning_completions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  gun_tarihi date not null,
  slot_index smallint not null check (slot_index between 1 and 30),
  completed_by uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  supervisor_profile_id uuid references public.profiles(id) on delete set null,
  supervisor_approved_at timestamptz,
  unique (group_id, gun_tarihi)
);

alter table public.group_cleaning_completions
  add column if not exists supervisor_profile_id uuid references public.profiles(id) on delete set null;
alter table public.group_cleaning_completions
  add column if not exists supervisor_approved_at timestamptz;

create index if not exists group_cleaning_completions_group_gun_idx
  on public.group_cleaning_completions (group_id, gun_tarihi);

alter table public.group_cleaning_completions enable row level security;

drop policy if exists "Grup uyesi temizlik tamamlamalarini okuyabilir" on public.group_cleaning_completions;
drop policy if exists "Grup uyesi temizlik tamamlamasi ekleyebilir" on public.group_cleaning_completions;
drop policy if exists "Personel temizlik personel onayi ekleyebilir" on public.group_cleaning_completions;
drop policy if exists "Mudur temizlik tamamlamasini silebilir" on public.group_cleaning_completions;

create policy "Grup uyesi temizlik tamamlamalarini okuyabilir"
  on public.group_cleaning_completions for select using (
    group_id = public.current_profile_group_id()
  );

-- Yalnızca personel rolü «yaptım» onayı ekler (müdür yrd. burada yetkisiz)
create policy "Personel temizlik personel onayi ekleyebilir"
  on public.group_cleaning_completions for insert with check (
    group_id = public.current_profile_group_id()
    and completed_by = auth.uid()
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = group_cleaning_completions.group_id
        and gm.profile_id = auth.uid()
        and gm.rol = 'personel'
    )
  );

create policy "Mudur temizlik tamamlamasini silebilir"
  on public.group_cleaning_completions for delete using (
    group_id = public.current_profile_group_id()
    and exists (
      select 1 from public.group_members
      where group_id = group_cleaning_completions.group_id
        and profile_id = auth.uid()
        and rol = 'mudur'
    )
  );

-- Denetim satır güncellemesi yalnızca RPC ile (policy yok)

create or replace function public.temizlik_denetime_onayla(p_completion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
begin
  select c.group_id into gid
  from public.group_cleaning_completions c
  where c.id = p_completion_id;

  if gid is null then
    raise exception 'Kayıt bulunamadı';
  end if;

  if gid is distinct from public.current_profile_group_id() then
    raise exception 'Yetkisiz';
  end if;

  if not exists (
    select 1 from public.group_members gm
    where gm.group_id = gid
      and gm.profile_id = auth.uid()
      and gm.rol in ('mudur', 'yardimci')
  ) then
    raise exception 'Yalnızca müdür veya müdür yardımcısı denetim onayı verebilir';
  end if;

  update public.group_cleaning_completions c
  set
    supervisor_profile_id = auth.uid(),
    supervisor_approved_at = now()
  where c.id = p_completion_id
    and c.group_id = gid
    and c.supervisor_approved_at is null
    and c.completed_at is not null;

  if not found then
    raise exception 'Onay verilemedi (zaten denetlenmiş veya personel onayı yok)';
  end if;
end;
$$;

grant execute on function public.temizlik_denetime_onayla(uuid) to authenticated;
