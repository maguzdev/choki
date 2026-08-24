-- Helper de rol. SECURITY DEFINER evita recursión al consultar profiles desde RLS.
create or replace function public.is_parent() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p
                 where p.id = (select auth.uid()) and p.type = 'PARENT' and p.active);
$$;

-- Catálogo sin costos para niños. SECURITY DEFINER a propósito.
create view products_public as
  select id, category_id, name, description, emoji, image_url,
         price, stock, min_stock, active, sort_order
  from products;
grant select on products_public to authenticated;

create view v_child_balances with (security_invoker = true) as
  select p.id as child_id,
         coalesce(sum(m.available_delta),0)::int as available,
         coalesce(sum(m.savings_delta),0)::int   as savings,
         coalesce(sum(m.goal_delta),0)::int      as in_goals,
         coalesce(sum(m.earning_amount),0)::int  as historic_earnings
  from profiles p left join money_movements m on m.child_id = p.id
  where p.type = 'CHILD'
  group by p.id;

create view v_goal_progress with (security_invoker = true) as
  select g.id as goal_id, g.child_id, g.target_amount,
         coalesce(sum(m.goal_delta),0)::int as saved_amount,
         least(100, round(coalesce(sum(m.goal_delta),0)::numeric * 100
                          / nullif(g.target_amount,0)))::int as percent
  from goals g left join money_movements m on m.goal_id = g.id
  group by g.id;

create view v_child_gamification with (security_invoker = true) as
  select p.id as child_id,
         coalesce((select sum(amount) from xp_movements x where x.child_id = p.id),0)::int as xp,
         coalesce((select sum(amount) from point_movements t where t.child_id = p.id),0)::int as points
  from profiles p where p.type = 'CHILD';

-- Ventas visibles para niños sin costos. SECURITY DEFINER a propósito.
create view v_child_sales as
  select s.id, s.seller_id, s.sold_at, s.local_date, s.payment_method,
         s.items_total, s.tip_total, s.units_total, s.status,
         ea.child_id, ea.source, ea.total_amount as child_earning
  from sales s
  join earning_allocations ea on ea.sale_id = s.id
  where ea.child_id = (select auth.uid()) or public.is_parent();
grant select on v_child_sales to authenticated;

create view v_low_stock with (security_invoker = true) as
  select id, name, emoji, stock, min_stock
  from products
  where active and stock <= min_stock;
