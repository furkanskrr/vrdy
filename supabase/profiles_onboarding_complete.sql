-- Kurulum tamam bilgisini profiles'ta tut (personel icin rol DB'de degismedigi icin metadata yarisi kaliyordu)
alter table public.profiles
  add column if not exists onboarding_complete boolean not null default false;

-- Güncelleme: PG/PostgREST bazen yalnızca USING ile 0 satır döndürür; WITH CHECK açıkça tanımlayın
drop policy if exists "Herkes kendi profilini guncelleyebilir" on public.profiles;
create policy "Herkes kendi profilini guncelleyebilir"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
