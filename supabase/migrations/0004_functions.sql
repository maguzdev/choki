-- Registrar una venta completa.
create or replace function public.sale_commit(p jsonb) returns void
language plpgsql as $$
begin
  insert into sales           select * from jsonb_populate_recordset(null::sales,               p->'sale');
  insert into sale_items      select * from jsonb_populate_recordset(null::sale_items,          p->'items');
  insert into inventory_movements select * from jsonb_populate_recordset(null::inventory_movements, p->'inventory');
  insert into earning_allocations select * from jsonb_populate_recordset(null::earning_allocations, p->'allocations');
  insert into money_movements select * from jsonb_populate_recordset(null::money_movements,     p->'money');
  insert into xp_movements    select * from jsonb_populate_recordset(null::xp_movements,        p->'xp');
  insert into point_movements select * from jsonb_populate_recordset(null::point_movements,     p->'points');
  insert into achievement_unlocks select * from jsonb_populate_recordset(null::achievement_unlocks, p->'unlocks')
    on conflict do nothing;
  insert into notifications   select * from jsonb_populate_recordset(null::notifications,       p->'notifications');

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

-- Anular una venta.
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
    set current_value = excluded.current_value, updated_at = now();

  perform public.streak_sync(p->'streaks');
end $$;

-- Registrar una compra.
create or replace function public.purchase_commit(p jsonb) returns void
language plpgsql as $$
begin
  insert into purchases select * from jsonb_populate_recordset(null::purchases, p->'purchase');
  insert into inventory_movements select * from jsonb_populate_recordset(null::inventory_movements, p->'inventory');
  update products set stock = (p->>'new_stock')::int,
                      avg_cost = (p->>'new_avg_cost')::numeric,
                      updated_at = now()
  where id = (p->>'product_id')::uuid;
end $$;

-- Sincronizar la racha reconstruida.
create or replace function public.streak_sync(p jsonb) returns void
language plpgsql as $$
declare v_child uuid := (p->>'child_id')::uuid;
begin
  if v_child is null then return; end if;
  delete from streak_days where child_id = v_child;
  insert into streak_days select * from jsonb_populate_recordset(null::streak_days, p->'days');
  insert into child_streaks select * from jsonb_populate_recordset(null::child_streaks, p->'state')
    on conflict (child_id) do update
    set current_streak = excluded.current_streak,
        best_streak = excluded.best_streak,
        protectors_available = excluded.protectors_available,
        last_activity_date = excluded.last_activity_date,
        last_evaluated_date = excluded.last_evaluated_date,
        updated_at = now();
end $$;
