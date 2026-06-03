-- admin_purge_user / profil silme: groups.olusturan_id = null güncellemesi
-- trg_groups_pin_only tetikleyicisinin engellemesini kaldırır.
-- Supabase SQL Editor'de bir kez çalıştırın.

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
