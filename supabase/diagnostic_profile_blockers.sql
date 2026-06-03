-- Silinmeyen kullanıcı için: Auth → Users’tan UUID’yi kopyalayın (veya e-posta ile bulun).
-- Aşağıdaki 'PROFILE_UUID_BURAYA' değerini değiştirip SQL Editor’de çalıştırın.
-- Sayılar 0’dan büyükse silmeyi kilitleyen satırlar vardır.

/*
\set profile_id 'PROFILE_UUID_BURAYA'
*/

with pid as (
  select 'PROFILE_UUID_BURAYA'::uuid as id  -- ← burayı düzenleyin
)
select 'group_members (bu profile ait)' as kontrol, count(*)::int as adet
from public.group_members gm, pid where gm.profile_id = pid.id
union all
select 'group_members.partner_id -> bu üyenin satırı', count(*)::int
from public.group_members gm, pid
where gm.partner_id in (select id from public.group_members where profile_id = pid.id)
union all
select 'groups.olusturan_id', count(*)::int
from public.groups g, pid where g.olusturan_id = pid.id
union all
select 'shift_overrides.created_by', count(*)::int
from public.shift_overrides s, pid where s.created_by = pid.id
union all
select 'group_messages.profile_id', count(*)::int
from public.group_messages m, pid where m.profile_id = pid.id
union all
select 'group_pinned_messages.pinned_by', count(*)::int
from public.group_pinned_messages p, pid where p.pinned_by = pid.id
union all
select 'group_chat_reads.profile_id', count(*)::int
from public.group_chat_reads r, pid where r.profile_id = pid.id
union all
select 'group_cleaning completed_by', count(*)::int
from public.group_cleaning_completions c, pid where c.completed_by = pid.id
union all
select 'group_cleaning supervisor', count(*)::int
from public.group_cleaning_completions c, pid where c.supervisor_profile_id = pid.id;
