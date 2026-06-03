-- Bazı kullanıcılar Dashboard'dan silinirken diğerleri gibi silinmiyorsa: FK / CASCADE sırası sorunları.
-- Bu tetikleyici auth.users silindiğinde CASCADE ile profiles silinmeden HEMEN ÖNCE çalışır.
-- Supabase SQL Editor'de bir kez çalıştırın.

create or replace function public.predelete_profile_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);

  -- 1) Partner bu profilin group_members satırına işaret ediyorsa (en sık kilit)
  update public.group_members gm
  set partner_id = null
  where partner_id::text in (
    select id::text from public.group_members where profile_id::text = old.id::text
  );

  -- 2) Grup oluşturan
  update public.groups
  set olusturan_id = null
  where olusturan_id::text = old.id::text;

  -- 3) Vardiya override "oluşturan"
  update public.shift_overrides
  set created_by = null
  where created_by::text = old.id::text;

  -- 4) Temizlik denetimi (tablo yoksa atla)
  begin
    update public.group_cleaning_completions
    set supervisor_profile_id = null,
        supervisor_approved_at = null
    where supervisor_profile_id::text = old.id::text;
  exception
    when undefined_table then
      null;
  end;

  -- 5) Sabitlemede bu kişi "pinleyen" ise
  begin
    delete from public.group_pinned_messages where pinned_by::text = old.id::text;
  exception
    when undefined_table then
      null;
  end;

  return old;
end;
$$;

drop trigger if exists tr_predelete_profile_cleanup on public.profiles;

create trigger tr_predelete_profile_cleanup
  before delete on public.profiles
  for each row
  execute procedure public.predelete_profile_cleanup();
