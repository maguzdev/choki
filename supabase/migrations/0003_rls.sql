-- RLS activo en todas las tablas del esquema público.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Supabase ya no expone entidades nuevas automáticamente. Los privilegios se
-- declaran para que RLS gobierne la lectura y service_role pueda persistir.
grant usage on schema public to authenticated, service_role;
grant select on all tables in schema public to authenticated;
grant all privileges on all tables in schema public to service_role;

-- Configuración y catálogos visibles para cualquier usuario autenticado.
create policy profiles_read on profiles for select to authenticated using (true);
create policy levels_read on levels for select to authenticated using (true);
create policy categories_read on categories for select to authenticated using (true);
create policy achievements_read on achievements for select to authenticated using (true);
create policy challenges_read on challenges for select to authenticated using (true);
create policy rewards_read on rewards for select to authenticated using (true);
create policy gamification_rules_read on gamification_rules for select to authenticated using (true);
create policy app_settings_read on app_settings for select to authenticated using (true);

-- Datos administrativos: solo padres.
create policy products_read on products for select to authenticated
  using (public.is_parent());
create policy purchases_read on purchases for select to authenticated
  using (public.is_parent());
create policy inventory_movements_read on inventory_movements for select to authenticated
  using (public.is_parent());
create policy sales_read on sales for select to authenticated
  using (public.is_parent());
create policy sale_items_read on sale_items for select to authenticated
  using (public.is_parent());

-- Datos del niño: propio perfil o cualquier padre.
create policy child_settings_read on child_settings for select to authenticated
  using (child_id = (select auth.uid()) or public.is_parent());
create policy profit_split_rules_read on profit_split_rules for select to authenticated
  using (child_id = (select auth.uid()) or public.is_parent());
create policy goals_read on goals for select to authenticated
  using (child_id = (select auth.uid()) or public.is_parent());
create policy money_movements_read on money_movements for select to authenticated
  using (child_id = (select auth.uid()) or public.is_parent());
create policy earning_allocations_read on earning_allocations for select to authenticated
  using (child_id = (select auth.uid()) or public.is_parent());
create policy xp_movements_read on xp_movements for select to authenticated
  using (child_id = (select auth.uid()) or public.is_parent());
create policy point_movements_read on point_movements for select to authenticated
  using (child_id = (select auth.uid()) or public.is_parent());
create policy achievement_unlocks_read on achievement_unlocks for select to authenticated
  using (child_id = (select auth.uid()) or public.is_parent());
create policy challenge_progress_read on challenge_progress for select to authenticated
  using (child_id = (select auth.uid()) or public.is_parent());
create policy child_streaks_read on child_streaks for select to authenticated
  using (child_id = (select auth.uid()) or public.is_parent());
create policy streak_days_read on streak_days for select to authenticated
  using (child_id = (select auth.uid()) or public.is_parent());
create policy protector_events_read on protector_events for select to authenticated
  using (child_id = (select auth.uid()) or public.is_parent());
create policy redemptions_read on redemptions for select to authenticated
  using (child_id = (select auth.uid()) or public.is_parent());

create policy notifications_read on notifications for select to authenticated
  using (profile_id = (select auth.uid()));

-- Ranking entre hermanos. SECURITY DEFINER expone solo nombre, avatar, color y XP agregado.
create view v_xp_ranking as
  select p.id, p.name, p.avatar_emoji, p.color,
         coalesce(sum(x.amount),0)::int as xp
  from profiles p left join xp_movements x on x.child_id = p.id
  where p.type = 'CHILD' and p.active
  group by p.id;
grant select on v_xp_ranking to authenticated;
