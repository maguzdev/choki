-- Impedir atómicamente que una venta consuma más unidades de las disponibles.
create or replace function public.sale_commit(p jsonb) returns void
language plpgsql as $$
declare
  v_expected_updates integer := jsonb_array_length(p->'stock_deltas');
  v_updated_products integer;
begin
  if exists (
    select 1
    from jsonb_array_elements(p->'stock_deltas') value
    where (value->>'delta')::integer >= 0
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_SALE_STOCK_DELTA';
  end if;

  update products pr
  set stock = pr.stock + stock_change.delta,
      updated_at = now()
  from (
    select (value->>'product_id')::uuid as product_id,
           (value->>'delta')::integer as delta
    from jsonb_array_elements(p->'stock_deltas') value
  ) stock_change
  where pr.id = stock_change.product_id
    and pr.stock + stock_change.delta >= 0;

  get diagnostics v_updated_products = row_count;
  if v_updated_products <> v_expected_updates then
    raise exception using errcode = 'P0001', message = 'INSUFFICIENT_STOCK';
  end if;

  insert into sales
    select * from jsonb_populate_recordset(null::sales, p->'sale');
  insert into sale_items
    select * from jsonb_populate_recordset(null::sale_items, p->'items');
  insert into inventory_movements (
    id, product_id, type, quantity_delta, reason, reference_type,
    reference_id, stock_after, note, created_by, created_at, local_date
  )
  select movement.id, movement.product_id, movement.type, movement.quantity_delta,
         movement.reason, movement.reference_type, movement.reference_id,
         product.stock, movement.note, movement.created_by, movement.created_at,
         movement.local_date
  from jsonb_populate_recordset(null::inventory_movements, p->'inventory') movement
  join products product on product.id = movement.product_id;
  insert into earning_allocations
    select * from jsonb_populate_recordset(null::earning_allocations, p->'allocations');
  insert into money_movements
    select * from jsonb_populate_recordset(null::money_movements, p->'money');
  insert into xp_movements
    select * from jsonb_populate_recordset(null::xp_movements, p->'xp');
  insert into point_movements
    select * from jsonb_populate_recordset(null::point_movements, p->'points');
  insert into achievement_unlocks
    select * from jsonb_populate_recordset(null::achievement_unlocks, p->'unlocks')
    on conflict do nothing;
  insert into notifications
    select * from jsonb_populate_recordset(null::notifications, p->'notifications');

  insert into challenge_progress
    select * from jsonb_populate_recordset(null::challenge_progress, p->'challenges')
    on conflict (challenge_id, child_id) do update
    set current_value = excluded.current_value,
        completed_at = excluded.completed_at,
        rewarded = excluded.rewarded,
        updated_at = now();

  perform public.streak_sync(p->'streaks');
end $$;
