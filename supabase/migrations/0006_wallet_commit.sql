-- Confirma movimientos de billetera y efectos de meta en una sola transacción.
create or replace function public.wallet_commit(p jsonb) returns void
language plpgsql as $$
declare
  v_movement money_movements%rowtype;
  v_child_id uuid;
  v_available integer;
  v_savings integer;
  v_goal_balance integer;
begin
  if p ? 'movement' then
    select * into v_movement
    from jsonb_populate_record(null::money_movements, p->'movement');
    v_child_id := v_movement.child_id;
  elsif p ? 'goal_update' then
    v_child_id := (p->'goal_update'->>'child_id')::uuid;
  else
    raise exception using errcode = 'P0001', message = 'EMPTY_WALLET_COMMIT';
  end if;

  perform 1 from profiles where id = v_child_id and type = 'CHILD' for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'CHILD_NOT_FOUND';
  end if;

  if p ? 'movement' then
    select coalesce(sum(available_delta), 0)::integer,
           coalesce(sum(savings_delta), 0)::integer
      into v_available, v_savings
    from money_movements
    where child_id = v_child_id;

    if v_movement.type not in ('EARNING_REVERSAL', 'ADJUSTMENT')
       and v_available + v_movement.available_delta < 0 then
      raise exception using errcode = 'P0001', message = 'INSUFFICIENT_AVAILABLE';
    end if;
    if v_movement.type not in ('EARNING_REVERSAL', 'ADJUSTMENT')
       and v_savings + v_movement.savings_delta < 0 then
      raise exception using errcode = 'P0001', message = 'INSUFFICIENT_SAVINGS';
    end if;

    if v_movement.goal_delta <> 0 then
      perform 1 from goals
      where id = v_movement.goal_id and child_id = v_child_id
      for update;
      if not found then
        raise exception using errcode = 'P0001', message = 'GOAL_NOT_FOUND';
      end if;

      select coalesce(sum(goal_delta), 0)::integer into v_goal_balance
      from money_movements where goal_id = v_movement.goal_id;
      if v_goal_balance + v_movement.goal_delta < 0 then
        raise exception using errcode = 'P0001', message = 'INSUFFICIENT_GOAL_BALANCE';
      end if;
    end if;

    insert into money_movements values (v_movement.*);
  end if;

  if p ? 'goal_update' then
    update goals
    set status = coalesce(p->'goal_update'->>'status', status),
        completed_at = case
          when p->'goal_update' ? 'completed_at'
            then (p->'goal_update'->>'completed_at')::timestamptz
          else completed_at
        end,
        is_primary = coalesce((p->'goal_update'->>'is_primary')::boolean, is_primary),
        updated_at = now()
    where id = (p->'goal_update'->>'id')::uuid
      and child_id = v_child_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'GOAL_NOT_FOUND';
    end if;
  end if;

  insert into notifications
    select * from jsonb_populate_recordset(null::notifications, coalesce(p->'notifications', '[]'::jsonb));
end $$;
