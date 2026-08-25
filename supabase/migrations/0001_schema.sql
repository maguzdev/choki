create extension if not exists pgcrypto;

-- Configuración global
create table app_settings (
  id                 smallint primary key default 1 check (id = 1),
  family_name        text        not null default 'Familia',
  timezone           text        not null default 'America/Bogota',
  currency           text        not null default 'COP',
  protector_max      integer     not null default 3 check (protector_max between 0 and 3),
  low_stock_alerts   boolean     not null default true,
  celebrations       boolean     not null default true,
  updated_at         timestamptz not null default now()
);

insert into app_settings (id) values (1) on conflict do nothing;

-- Perfiles
create table profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  name                text    not null,
  type                text    not null check (type in ('CHILD','PARENT')),
  auth_email          text    not null unique,
  avatar_emoji        text    not null default '🙂',
  color               text    not null default '#D98C3F',
  active              boolean not null default true,
  sort_order          integer not null default 0,
  pin_failed_attempts integer not null default 0,
  pin_locked_until    timestamptz,
  created_at          timestamptz not null default now()
);
create index on profiles (type, active, sort_order);

create table child_settings (
  child_id            uuid primary key references profiles(id) on delete cascade,
  auto_saving_enabled boolean not null default false,
  saving_percent      integer not null default 0 check (saving_percent between 0 and 100),
  updated_at          timestamptz not null default now()
);

create table profit_split_rules (
  child_id   uuid primary key references profiles(id) on delete cascade,
  percent    numeric(5,2) not null check (percent >= 0 and percent <= 100),
  updated_at timestamptz not null default now()
);

-- Catálogo
create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text    not null unique,
  emoji      text    not null default '🍪',
  sort_order integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table products (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name        text    not null,
  description text,
  emoji       text    not null default '🍪',
  image_url   text,
  price       integer not null check (price >= 0),
  cost        integer not null default 0 check (cost >= 0),
  avg_cost    numeric(12,2) not null default 0,
  stock       integer not null default 0,
  min_stock   integer not null default 0 check (min_stock >= 0),
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on products (active, sort_order);

-- Compras e inventario
create table purchases (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete restrict,
  quantity     integer not null check (quantity > 0),
  total_cost   integer not null check (total_cost >= 0),
  unit_cost    numeric(12,2) not null,
  purchased_at timestamptz not null default now(),
  local_date   date not null,
  note         text,
  created_by   uuid not null references profiles(id),
  created_at   timestamptz not null default now()
);
create index on purchases (product_id, purchased_at desc);

create table inventory_movements (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references products(id) on delete restrict,
  type           text not null check (type in ('PURCHASE','SALE','SALE_VOID','ADJUSTMENT')),
  quantity_delta integer not null,
  reason         text check (reason in ('MERMA','CONSUMO','DANO','CORRECCION','OTRO')),
  reference_type text check (reference_type in ('PURCHASE','SALE')),
  reference_id   uuid,
  stock_after    integer not null,
  note           text,
  created_by     uuid not null references profiles(id),
  created_at     timestamptz not null default now(),
  local_date     date not null
);
create index on inventory_movements (product_id, created_at desc);

-- Ventas
create table sales (
  id             uuid primary key,
  seller_id      uuid not null references profiles(id) on delete restrict,
  seller_type    text not null check (seller_type in ('CHILD','PARENT')),
  sold_at        timestamptz not null default now(),
  local_date     date not null,
  payment_method text not null check (payment_method in ('CASH','TRANSFER')),
  items_total    integer not null check (items_total >= 0),
  cost_total     numeric(12,2) not null default 0,
  margin_total   integer not null,
  cash_received  integer,
  change_given   integer,
  tip_total      integer not null default 0 check (tip_total >= 0),
  earnings_total integer not null,
  units_total    integer not null check (units_total > 0),
  status         text not null default 'COMPLETED' check (status in ('COMPLETED','VOIDED')),
  note           text,
  voided_at      timestamptz,
  voided_by      uuid references profiles(id),
  void_reason    text,
  created_at     timestamptz not null default now()
);
create index on sales (local_date desc);
create index on sales (seller_id, local_date desc);
create index on sales (status, sold_at desc);

create table sale_items (
  id            uuid primary key default gen_random_uuid(),
  sale_id       uuid not null references sales(id) on delete cascade,
  product_id    uuid not null references products(id) on delete restrict,
  product_name  text    not null,
  product_emoji text    not null default '🍪',
  quantity      integer not null check (quantity > 0),
  unit_price    integer not null check (unit_price >= 0),
  unit_cost     numeric(12,2) not null,
  line_total    integer not null,
  line_cost     numeric(12,2) not null,
  line_margin   integer not null
);
create index on sale_items (sale_id);
create index on sale_items (product_id);

create table earning_allocations (
  id            uuid primary key default gen_random_uuid(),
  sale_id       uuid not null references sales(id) on delete cascade,
  child_id      uuid not null references profiles(id) on delete cascade,
  source        text not null check (source in ('OWN_SALE','FAMILY_SHARE')),
  share_percent numeric(5,2),
  margin_amount integer not null,
  tip_amount    integer not null default 0,
  total_amount  integer not null,
  reversed      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index on earning_allocations (child_id, created_at desc);
create index on earning_allocations (sale_id);

-- Billetera y metas. goals debe existir antes de money_movements.
create table goals (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references profiles(id) on delete cascade,
  name          text    not null,
  emoji         text    not null default '🎯',
  image_url     text,
  description   text,
  target_amount integer not null check (target_amount > 0),
  target_date   date,
  priority      integer not null default 2 check (priority between 1 and 3),
  status        text    not null default 'ACTIVE'
                  check (status in ('ACTIVE','PAUSED','COMPLETED','ARCHIVED')),
  is_primary    boolean not null default false,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index goals_one_primary_per_child
  on goals (child_id) where is_primary;
create index on goals (child_id, status);

create table money_movements (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid not null references profiles(id) on delete cascade,
  type            text not null check (type in (
                    'EARNING','EARNING_REVERSAL','SAVING_IN','SAVING_OUT',
                    'GOAL_IN','GOAL_OUT','GOAL_SPEND','WITHDRAWAL','ADJUSTMENT')),
  available_delta integer not null default 0,
  savings_delta   integer not null default 0,
  goal_delta      integer not null default 0,
  goal_id         uuid references goals(id) on delete set null,
  earning_amount  integer not null default 0,
  reference_type  text check (reference_type in ('SALE','GOAL','MANUAL')),
  reference_id    uuid,
  description     text not null,
  created_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  local_date      date not null
);
create index on money_movements (child_id, created_at desc);
alter table money_movements
  add constraint money_movements_goal_ck check (goal_delta = 0 or goal_id is not null);

-- Gamificación: configuración
create table levels (
  id          uuid primary key default gen_random_uuid(),
  number      integer not null unique check (number > 0),
  name        text    not null,
  xp_required integer not null check (xp_required >= 0),
  icon        text    not null default '⭐',
  description text,
  benefit     text,
  active      boolean not null default true
);

create table gamification_rules (
  id            uuid primary key default gen_random_uuid(),
  event         text not null unique check (event in ('SALE_COMPLETED','UNIT_SOLD')),
  xp_amount     integer not null default 0 check (xp_amount >= 0),
  points_amount integer not null default 0 check (points_amount >= 0),
  active        boolean not null default true,
  updated_at    timestamptz not null default now()
);

create table achievements (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  name           text not null,
  description    text,
  icon           text not null default '🏅',
  condition_type text not null check (condition_type in
                   ('TOTAL_SALES','TOTAL_UNITS','TOTAL_PROFIT','STREAK_DAYS',
                    'PRODUCT_UNITS','GOALS_COMPLETED')),
  target_value   numeric(12,2) not null check (target_value > 0),
  product_id     uuid references products(id) on delete cascade,
  xp_reward      integer not null default 0,
  points_reward  integer not null default 0,
  hidden         boolean not null default false,
  active         boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  constraint achievements_product_ck check
    (condition_type <> 'PRODUCT_UNITS' or product_id is not null)
);

create table achievement_unlocks (
  id             uuid primary key default gen_random_uuid(),
  achievement_id uuid not null references achievements(id) on delete cascade,
  child_id       uuid not null references profiles(id) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  unique (achievement_id, child_id)
);

create table challenges (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  icon           text not null default '🎯',
  starts_on      date not null,
  ends_on        date not null,
  condition_type text not null check (condition_type in
                   ('SALES_COUNT','UNITS_SOLD','PROFIT_AMOUNT','ACTIVE_DAYS','PRODUCT_UNITS')),
  target_value   numeric(12,2) not null check (target_value > 0),
  product_id     uuid references products(id) on delete cascade,
  xp_reward      integer not null default 0,
  points_reward  integer not null default 0,
  status         text not null default 'ACTIVE' check (status in ('DRAFT','ACTIVE','FINISHED')),
  created_at     timestamptz not null default now(),
  constraint challenges_dates_ck check (ends_on >= starts_on)
);

create table challenge_progress (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references challenges(id) on delete cascade,
  child_id      uuid not null references profiles(id) on delete cascade,
  current_value numeric(12,2) not null default 0,
  completed_at  timestamptz,
  rewarded      boolean not null default false,
  updated_at    timestamptz not null default now(),
  unique (challenge_id, child_id)
);

-- Gamificación: movimientos
create table xp_movements (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references profiles(id) on delete cascade,
  amount         integer not null,
  reason         text not null check (reason in
                   ('SALE','UNITS','CHALLENGE','ACHIEVEMENT','STREAK_MILESTONE',
                    'SALE_VOID','ADJUSTMENT')),
  reference_type text check (reference_type in ('SALE','CHALLENGE','ACHIEVEMENT','MANUAL')),
  reference_id   uuid,
  description    text not null,
  created_at     timestamptz not null default now()
);
create index on xp_movements (child_id, created_at desc);

create table point_movements (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references profiles(id) on delete cascade,
  amount         integer not null,
  reason         text not null check (reason in
                   ('SALE','UNITS','CHALLENGE','ACHIEVEMENT','REDEMPTION',
                    'PROTECTOR_PURCHASE','SALE_VOID','ADJUSTMENT')),
  reference_type text check (reference_type in
                   ('SALE','CHALLENGE','ACHIEVEMENT','REDEMPTION','PROTECTOR','MANUAL')),
  reference_id   uuid,
  description    text not null,
  created_at     timestamptz not null default now()
);
create index on point_movements (child_id, created_at desc);

-- Rachas
create table child_streaks (
  child_id             uuid primary key references profiles(id) on delete cascade,
  current_streak       integer not null default 0,
  best_streak          integer not null default 0,
  protectors_available integer not null default 3,
  last_activity_date   date,
  last_evaluated_date  date,
  updated_at           timestamptz not null default now()
);

create table streak_days (
  child_id   uuid not null references profiles(id) on delete cascade,
  local_date date not null,
  status     text not null check (status in ('SOLD','PROTECTED','MISSED')),
  sales_count integer not null default 0,
  primary key (child_id, local_date)
);

create table protector_events (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references profiles(id) on delete cascade,
  type         text not null check (type in ('PURCHASE','GRANT')),
  quantity     integer not null default 1 check (quantity > 0),
  points_spent integer not null default 0,
  local_date   date not null,
  note         text,
  created_at   timestamptz not null default now()
);
create index on protector_events (child_id, local_date);

-- Recompensas
create table rewards (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  icon        text not null default '🎁',
  image_url   text,
  cost_points integer not null check (cost_points >= 0),
  type        text not null default 'NORMAL' check (type in ('NORMAL','STREAK_PROTECTOR')),
  stock       integer,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table redemptions (
  id           uuid primary key default gen_random_uuid(),
  reward_id    uuid not null references rewards(id) on delete restrict,
  child_id     uuid not null references profiles(id) on delete cascade,
  reward_name  text not null,
  points_spent integer not null,
  status       text not null default 'PENDING'
                 check (status in ('PENDING','DELIVERED','CANCELLED')),
  redeemed_at  timestamptz not null default now(),
  delivered_at timestamptz,
  note         text
);
create index on redemptions (child_id, redeemed_at desc);

-- Notificaciones internas
create table notifications (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references profiles(id) on delete cascade,
  type           text not null check (type in
                   ('ACHIEVEMENT','LEVEL_UP','PROTECTOR_USED','GOAL_NEAR','GOAL_COMPLETED',
                    'LOW_STOCK','CHALLENGE_COMPLETED','SALE_VOIDED','INFO')),
  title          text not null,
  body           text,
  icon           text not null default '🔔',
  reference_type text,
  reference_id   uuid,
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index on notifications (profile_id, read_at, created_at desc);
