-- Canjes y cambios de estado de premios en una sola transaccion.
-- La capa TypeScript autoriza al perfil y construye las filas; esta funcion
-- vuelve a validar puntos, stock y limite de protectores bajo bloqueos de fila.
create or replace function public.reward_redeem(p jsonb) returns void
language plpgsql as $$
declare
  v_child uuid := (p->'redemption'->>'child_id')::uuid;
  v_reward_id uuid := (p->'redemption'->>'reward_id')::uuid;
  v_reward rewards%rowtype;
  v_points integer;
  v_protectors integer;
  v_protector_max integer;
begin
  insert into child_streaks (child_id) values (v_child)
  on conflict (child_id) do nothing;

  perform 1 from child_streaks where child_id = v_child for update;
  select * into v_reward from rewards where id = v_reward_id for update;

  if not found or not v_reward.active then
    raise exception using errcode = 'P0001', message = 'REWARD_UNAVAILABLE';
  end if;
  if v_reward.stock is not null and v_reward.stock <= 0 then
    raise exception using errcode = 'P0001', message = 'REWARD_OUT_OF_STOCK';
  end if;

  select coalesce(sum(amount), 0)::integer into v_points
  from point_movements where child_id = v_child;
  if v_points < v_reward.cost_points then
    raise exception using errcode = 'P0001', message = 'INSUFFICIENT_POINTS';
  end if;

  if v_reward.type = 'STREAK_PROTECTOR' then
    select protectors_available into v_protectors
    from child_streaks where child_id = v_child;
    select protector_max into v_protector_max from app_settings where id = 1;
    if v_protectors >= v_protector_max then
      raise exception using errcode = 'P0001', message = 'PROTECTOR_LIMIT_REACHED';
    end if;
  end if;

  insert into point_movements
    select * from jsonb_populate_record(null::point_movements, p->'point');
  insert into redemptions
    select * from jsonb_populate_record(null::redemptions, p->'redemption');

  if v_reward.type = 'STREAK_PROTECTOR' then
    insert into protector_events
      select * from jsonb_populate_record(null::protector_events, p->'protector');
    update child_streaks
      set protectors_available = protectors_available + 1,
          updated_at = now()
      where child_id = v_child;
  end if;

  if v_reward.stock is not null then
    update rewards set stock = stock - 1 where id = v_reward_id;
  end if;
end $$;

create or replace function public.redemption_update(p jsonb) returns void
language plpgsql as $$
declare
  v_redemption redemptions%rowtype;
  v_reward rewards%rowtype;
  v_status text := p->>'status';
begin
  select * into v_redemption from redemptions
  where id = (p->>'redemption_id')::uuid for update;

  if not found or v_redemption.status <> 'PENDING' then
    raise exception using errcode = 'P0001', message = 'REDEMPTION_NOT_PENDING';
  end if;
  if v_status not in ('DELIVERED', 'CANCELLED') then
    raise exception using errcode = 'P0001', message = 'INVALID_REDEMPTION_STATUS';
  end if;

  select * into v_reward from rewards where id = v_redemption.reward_id for update;
  update redemptions
    set status = v_status,
        delivered_at = case when v_status = 'DELIVERED'
                            then (p->>'changed_at')::timestamptz else null end,
        note = nullif(p->>'note', '')
    where id = v_redemption.id;

  if v_status = 'CANCELLED' then
    insert into point_movements
      select * from jsonb_populate_record(null::point_movements, p->'refund');
    if v_reward.stock is not null then
      update rewards set stock = stock + 1 where id = v_reward.id;
    end if;
  end if;
end $$;

-- Replay de racha y avisos derivados confirmados juntos.
create or replace function public.streak_refresh(p jsonb) returns void
language plpgsql as $$
begin
  perform public.streak_sync(p->'streak');
  insert into notifications
    select * from jsonb_populate_recordset(null::notifications, p->'notifications');
end $$;

revoke all on function public.reward_redeem(jsonb) from public, anon, authenticated;
revoke all on function public.redemption_update(jsonb) from public, anon, authenticated;
revoke all on function public.streak_refresh(jsonb) from public, anon, authenticated;
grant execute on function public.reward_redeem(jsonb) to service_role;
grant execute on function public.redemption_update(jsonb) to service_role;
grant execute on function public.streak_refresh(jsonb) to service_role;
