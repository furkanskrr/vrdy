-- Müdür yardımcısı da vardiya atayabilsin (uygulama vardiyaDuzenleyebilir ile uyumlu)
-- Supabase Dashboard → SQL Editor → bir kez çalıştırın

drop policy if exists "Mudur vardiya atayabilir" on public.shift_overrides;
create policy "Mudur vardiya atayabilir"
  on public.shift_overrides for insert with check (
    exists (
      select 1 from public.group_members
      where group_id = shift_overrides.group_id
        and profile_id = auth.uid()
        and rol in ('mudur', 'yardimci')
    )
  );

drop policy if exists "Mudur vardiya guncelleyebilir" on public.shift_overrides;
create policy "Mudur vardiya guncelleyebilir"
  on public.shift_overrides for update using (
    exists (
      select 1 from public.group_members
      where group_id = shift_overrides.group_id
        and profile_id = auth.uid()
        and rol in ('mudur', 'yardimci')
    )
  );

drop policy if exists "Mudur vardiya silebilir" on public.shift_overrides;
create policy "Mudur vardiya silebilir"
  on public.shift_overrides for delete using (
    exists (
      select 1 from public.group_members
      where group_id = shift_overrides.group_id
        and profile_id = auth.uid()
        and rol in ('mudur', 'yardimci')
    )
  );
