-- Dashboard kullanıcı silme hata veriyorsa: bu fonksiyon ile tam temizlik.
-- Supabase → SQL Editor (postgres) ile ÖNCE dosyayı çalıştırın, SONRA select ile çağırın.
--
--   select public.admin_purge_user('AUTH_KULLANICI_UUID'::uuid);
--
-- Güvenlik: PUBLIC erişimi kapalıdır; yalnızca SQL Editor / service_role ile kullanın.

create or replace function public.admin_purge_user(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mids uuid[];
  v_prof int;
  v_auth int;
begin
  if p_user_id is null then
    return 'hata: uuid null';
  end if;

  perform set_config('row_security', 'off', true);

  -- ::text: storage.owner_id veya eski şemalarda metin tutulan FK'lar ile uyum
  select coalesce(array_agg(id), '{}'::uuid[]) into v_mids
  from public.group_members
  where profile_id::text = p_user_id::text;

  update public.group_members
  set partner_id = null
  where partner_id::text in (select unnest(v_mids)::text);

  if cardinality(v_mids) > 0 then
    delete from public.shift_swap_requests
    where from_member_id::text in (select unnest(v_mids)::text)
       or to_member_id::text in (select unnest(v_mids)::text);

    delete from public.day_offs
    where member_id::text in (select unnest(v_mids)::text);

    delete from public.shift_overrides
    where member_id::text in (select unnest(v_mids)::text);
  end if;

  update public.shift_overrides
  set created_by = null
  where created_by::text = p_user_id::text;

  delete from public.group_members
  where profile_id::text = p_user_id::text;

  update public.groups
  set olusturan_id = null
  where olusturan_id::text = p_user_id::text;

  begin
    delete from public.group_pinned_messages
    where message_id::text in (
      select id::text from public.group_messages where profile_id::text = p_user_id::text
    )
       or pinned_by::text = p_user_id::text;
  exception
    when undefined_table then
      null;
  end;

  begin
    delete from public.group_messages where profile_id::text = p_user_id::text;
  exception
    when undefined_table then
      null;
  end;

  begin
    delete from public.group_chat_reads where profile_id::text = p_user_id::text;
  exception
    when undefined_table then
      null;
  end;

  begin
    delete from public.group_cleaning_completions
    where completed_by::text = p_user_id::text
       or supervisor_profile_id::text = p_user_id::text;
  exception
    when undefined_table then
      null;
  end;

  begin
    delete from storage.objects
    where owner_id = p_user_id::text
       or (owner is not null and owner::text = p_user_id::text);
  exception
    when others then
      null;
  end;

  delete from public.profiles where id::text = p_user_id::text;
  get diagnostics v_prof = row_count;

  begin
    delete from auth.sessions where user_id::text = p_user_id::text;
  exception
    when undefined_table then
      null;
  end;

  begin
    delete from auth.refresh_tokens where user_id::text = p_user_id::text;
  exception
    when undefined_table then
      null;
  end;

  begin
    delete from auth.mfa_factors where user_id::text = p_user_id::text;
    delete from auth.one_time_tokens where user_id::text = p_user_id::text;
  exception
    when others then
      null;
  end;

  delete from auth.identities where user_id::text = p_user_id::text;

  delete from auth.users where id::text = p_user_id::text;
  get diagnostics v_auth = row_count;

  if v_auth = 0 then
    return format(
      'kısmen: profiles silinen satır=%s, auth.users bulunamadı (zaten silinmiş olabilir)',
      v_prof
    );
  end if;

  return format('tamam: auth.users silindi, profiles satır=%s', v_prof);
exception
  when others then
    return format('hata: %s', sqlerrm);
end;
$$;

revoke all on function public.admin_purge_user(uuid) from public;

-- İsteğe bağlı: sunucu tarafı cron / edge yoksa açmayın
-- grant execute on function public.admin_purge_user(uuid) to service_role;
