-- Cada niño recibe tres protectores gratuitos una sola vez.
-- El evento GRANT mantiene el saldo reconstruible mediante replay.

alter table public.child_streaks
  alter column protectors_available set default 3;

alter table public.app_settings
  drop constraint if exists app_settings_protector_max_check;
alter table public.app_settings
  add constraint app_settings_protector_max_check check (protector_max between 0 and 3);

create unique index if not exists protector_events_initial_grant_unique
  on public.protector_events (child_id)
  where type = 'GRANT' and note = 'INITIAL_FREE_PROTECTORS';

insert into public.protector_events
  (child_id, type, quantity, points_spent, local_date, note, created_at)
select
  profile.id,
  'GRANT',
  3,
  0,
  (profile.created_at at time zone coalesce(settings.timezone, 'America/Bogota'))::date,
  'INITIAL_FREE_PROTECTORS',
  profile.created_at
from public.profiles profile
left join public.app_settings settings on settings.id = 1
where profile.type = 'CHILD'
  and not exists (
    select 1
    from public.protector_events event
    where event.child_id = profile.id
      and event.type = 'GRANT'
      and event.note = 'INITIAL_FREE_PROTECTORS'
  );

insert into public.child_streaks
  (child_id, current_streak, best_streak, protectors_available, last_activity_date, last_evaluated_date)
select profile.id, 0, 0, least(3, coalesce(settings.protector_max, 3)), null, null
from public.profiles profile
left join public.app_settings settings on settings.id = 1
where profile.type = 'CHILD'
on conflict (child_id) do update
set protectors_available = least(3, coalesce((select protector_max from public.app_settings where id = 1), 3)),
    last_evaluated_date = null,
    updated_at = now();

create or replace function public.grant_initial_streak_protectors()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text := coalesce((select timezone from public.app_settings where id = 1), 'America/Bogota');
  v_max integer := coalesce((select protector_max from public.app_settings where id = 1), 3);
begin
  if new.type <> 'CHILD' then
    return new;
  end if;

  insert into public.protector_events
    (child_id, type, quantity, points_spent, local_date, note, created_at)
  values
    (new.id, 'GRANT', 3, 0, (new.created_at at time zone v_timezone)::date, 'INITIAL_FREE_PROTECTORS', new.created_at)
  on conflict do nothing;

  insert into public.child_streaks
    (child_id, current_streak, best_streak, protectors_available, last_activity_date, last_evaluated_date)
  values
    (new.id, 0, 0, least(3, v_max), null, null)
  on conflict (child_id) do nothing;

  return new;
end;
$$;

drop trigger if exists profiles_initial_streak_protectors on public.profiles;
create trigger profiles_initial_streak_protectors
after insert on public.profiles
for each row execute function public.grant_initial_streak_protectors();

update public.rewards
set description = 'Repone uno de los 3 protectores gratuitos después de usarlo.'
where type = 'STREAK_PROTECTOR'
  and name = 'Protector de racha';
