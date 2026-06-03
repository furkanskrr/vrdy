-- Personel / yardimci grup kodu ile katilirken INSERT reddi:
-- "Mudur uye ekleyebilir" sadece group_id = current_profile_group_id() ile calisir;
-- katilan kullanicinin profilinde henuz group_id olmadigi icin kosul saglanmaz.
-- Supabase SQL Editor'de TEK SEFER calistirin.

drop policy if exists "Davet ile kendini gruba ekle" on public.group_members;

create policy "Davet ile kendini gruba ekle"
  on public.group_members for insert with check (
    profile_id = auth.uid()
    and public.current_profile_group_id() is null
  );
