-- Al anular, el progreso y el estado de finalización del reto se recalculan.
-- La recompensa ya entregada se conserva mediante `rewarded`.
create or replace function public.sale_void(p jsonb) returns void
language plpgsql as $$
begin
  update sales set status='VOIDED',
                   voided_at = (p->'sale'->>'voided_at')::timestamptz,
                   voided_by = (p->'sale'->>'voided_by')::uuid,
                   void_reason = p->'sale'->>'void_reason'
  where id = (p->'sale'->>'id')::uuid and status = 'COMPLETED';
  if not found then raise exception 'SALE_NOT_VOIDABLE'; end if;

  update earning_allocations set reversed = true where sale_id = (p->'sale'->>'id')::uuid;

  insert into inventory_movements select * from jsonb_populate_recordset(null::inventory_movements, p->'inventory');
  insert into money_movements select * from jsonb_populate_recordset(null::money_movements, p->'money');
  insert into xp_movements    select * from jsonb_populate_recordset(null::xp_movements,    p->'xp');
  insert into point_movements select * from jsonb_populate_recordset(null::point_movements, p->'points');
  insert into notifications   select * from jsonb_populate_recordset(null::notifications,   p->'notifications');

  update products pr set stock = pr.stock + s.delta, updated_at = now()
  from (select (v->>'product_id')::uuid pid, (v->>'delta')::int delta
        from jsonb_array_elements(p->'stock_deltas') v) s
  where pr.id = s.pid;

  insert into challenge_progress select * from jsonb_populate_recordset(null::challenge_progress, p->'challenges')
    on conflict (challenge_id, child_id) do update
    set current_value = excluded.current_value,
        completed_at  = excluded.completed_at,
        rewarded      = excluded.rewarded,
        updated_at    = now();

  perform public.streak_sync(p->'streaks');
end $$;
