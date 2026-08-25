# PLAN.md — Choki

**Plan de implementación del MVP — Emprendimiento familiar gamificado**

> Documento de ejecución para un agente implementador (Codex en modo Objetivo).
> Todo lo que aparece aquí es una decisión ya tomada. No hay preguntas abiertas.
> Ejecutar las fases del apartado **H** en orden. No ampliar el alcance.

---

## A. Resumen del proyecto

### A.1 Qué se construye

**Choki** es una aplicación web (Next.js + Supabase) para administrar el emprendimiento familiar de productos comestibles de dos niños: barquillos, galletas tipo New York, brownies y lo que se añada después.

Es una sola aplicación, una sola base de datos, un solo repositorio, para **una sola familia** (4 perfiles iniciales: 2 niños, 2 padres). No es un SaaS, no hay multi-tenancy, no hay organizaciones.

### A.2 Propósito

El objetivo no es solo vender. Es que los niños entiendan el ciclo:

**Esfuerzo → Venta → Ganancia → Progreso → Meta → Recompensa**

Por eso la app mezcla, en un mismo producto: POS móvil, inventario, finanzas personales del niño (disponible / ahorro / metas), y una capa de gamificación (XP, puntos, niveles, logros, retos, rachas, protectores, recompensas).

### A.3 Los tres principios que gobiernan todas las decisiones

1. **Mobile first extremo.** El caso de uso real es un niño de pie en el colegio, con una mano, en 15 segundos. Diseñar para 360–430 px y adaptar hacia arriba. Nada crítico depende de hover.
2. **Motor ahora, contenido después.** Niveles, XP, puntos, logros, retos, recompensas y distribución de ganancias son **datos configurables desde la app**, no constantes en el código. Los valores de este plan son semillas de prueba.
3. **Anti-sobreingeniería.** Ante dos alternativas válidas, gana la de menos piezas. Sin microservicios, colas, Redis, ORM adicional, event sourcing, CQRS ni CI/CD elaborado.

### A.4 Nombre, identidad y marca

- Nombre de la app: **Choki**.
- Identidad visual: chocolate + crema + caramelo.
- Icono/favicon: **galleta tipo New York** 🍪 (SVG propio, definido en §F.7).

---

## B. Decisiones técnicas

### B.1 Stack definitivo

| Capa | Elección | Nota |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | Server Components + Server Actions |
| UI | **React 19** | |
| Lenguaje | **TypeScript 5** (`strict: true`) | |
| Estilos | **Tailwind CSS v4** | Tokens en `@theme`, sin `tailwind.config.js` salvo necesidad |
| Componentes | **shadcn/ui**, solo los que aportan | `button`, `dialog`, `sheet`, `input`, `tabs`, `select`, `sonner` |
| Iconos | **lucide-react** | |
| Backend / BD | **Supabase** (PostgreSQL + Auth) | Sin ORM adicional. `@supabase/supabase-js` + `@supabase/ssr` |
| Validación | **zod** | Esquemas compartidos cliente/servidor |
| Tests | **vitest** | Solo lógica de dominio pura |
| Celebración | **canvas-confetti** | Única dependencia "decorativa"; ~5 KB, justificada por §35 del requerimiento |
| Gestor de paquetes | **npm** | Compatibilidad directa con Vercel por defecto |
| Node | **>= 20.11** | |

**Dependencias que NO se instalan** (decisión explícita): ningún ORM (Prisma/Drizzle), ninguna librería de estado global (Redux/Zustand/Jotai), ninguna librería de fechas (`date-fns`, `dayjs`, `luxon`) — la zona horaria se resuelve con `Intl.DateTimeFormat`, ver §D.1 —, ni `react-hook-form`, ni `next-pwa`, ni librería de charts (los gráficos del MVP son barras/anillos en SVG o divs; ver §G.4).

> Si el CLI de shadcn/ui falla o reporta incompatibilidad con la versión instalada de Tailwind/React, **no bloquear la ejecución**: escribir a mano esos 7 primitivos en `src/components/ui/` con Tailwind y Radix mínimo, o sin Radix. shadcn es una comodidad, no un requisito.

### B.2 Arquitectura

```
Navegador (React, mayormente Server Components)
   │   formularios / botones
   ▼
Server Actions de Next.js  ──►  Capa de dominio (TypeScript puro, testeada)
   │                                    │
   │  lecturas: cliente Supabase        │  cálculo determinista
   │  con sesión del usuario (RLS)      │  (utilidad, splits, XP, rachas…)
   │                                    ▼
   └─ escrituras: cliente Supabase con service role
        └──►  RPC Postgres atómica (sale_commit / sale_void / …)
                  ▼
             PostgreSQL (Supabase)
```

Reglas de la arquitectura:

1. **El navegador nunca habla directamente con Supabase.** No se crea cliente de navegador. Todas las lecturas ocurren en Server Components; todas las escrituras en Server Actions.
2. **Las lecturas usan el cliente con la sesión del usuario** ⇒ las políticas RLS son la autorización real de lectura.
3. **Las escrituras usan el cliente `service role`** (solo servidor), *después* de una comprobación explícita en TypeScript (`requireParent()`, `requireChildSelf(childId)`). No existen políticas de `insert/update/delete` para el rol `authenticated`: **RLS gobierna lectura; el código de servidor gobierna escritura.** Esto elimina la duplicación de reglas en SQL y evita RLS de escritura frágiles.
4. **El cálculo vive en TypeScript puro** (`src/lib/domain/**`), sin acceso a red ni a BD ⇒ es testeable con Vitest sin infraestructura. Las Server Actions leen estado, llaman al dominio, y persisten el resultado.
5. **La persistencia multi-tabla es atómica vía RPC.** Registrar una venta toca 8–10 tablas. Se ejecuta en **una** función plpgsql que recibe un `jsonb` con las filas ya calculadas y las inserta. Es la única lógica que vive en SQL, y es lógica de *escritura*, no de negocio. Justificación (§44 permite una capa adicional si se justifica): sin transacción, un fallo de red a mitad de una venta deja inventario, dinero y XP inconsistentes, y no hay forma sencilla de repararlo desde una app familiar.

### B.3 Estructura de carpetas

```
choki/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # html/body, fuentes, tema, Toaster
│   │   ├── globals.css                # Tailwind v4 + @theme (tokens)
│   │   ├── manifest.ts                # PWA manifest (route handler de Next)
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx         # selector de perfiles
│   │   │   ├── login/nino/[id]/page.tsx
│   │   │   └── login/padre/page.tsx
│   │   ├── (child)/
│   │   │   ├── layout.tsx             # BottomNav niño + guard CHILD
│   │   │   ├── page.tsx               # Dashboard niño
│   │   │   ├── vender/page.tsx        # POS
│   │   │   ├── progreso/page.tsx
│   │   │   ├── racha/page.tsx
│   │   │   ├── premios/page.tsx
│   │   │   ├── mas/page.tsx
│   │   │   ├── metas/page.tsx
│   │   │   ├── dinero/page.tsx
│   │   │   ├── mis-ventas/page.tsx
│   │   │   ├── inventario/page.tsx
│   │   │   ├── estadisticas/page.tsx
│   │   │   └── notificaciones/page.tsx
│   │   └── (admin)/admin/
│   │       ├── layout.tsx             # Sidebar desktop / BottomNav móvil + guard PARENT
│   │       ├── page.tsx               # Dashboard administrativo
│   │       ├── vender/page.tsx        # POS (vendedor = padre)
│   │       ├── ventas/page.tsx  ventas/[id]/page.tsx
│   │       ├── productos/page.tsx
│   │       ├── inventario/page.tsx
│   │       ├── compras/page.tsx
│   │       ├── perfiles/page.tsx
│   │       ├── gamificacion/page.tsx  # niveles, reglas, logros, retos, protectores
│   │       ├── recompensas/page.tsx   # recompensas + canjes
│   │       └── configuracion/page.tsx
│   ├── components/
│   │   ├── ui/            # primitivos (shadcn)
│   │   ├── shared/        # Money, StatCard, ProgressBar, EmptyState, PeriodFilter…
│   │   ├── pos/           # ProductRow, QtyStepper, CartBar, CashPad, SaleResultSheet…
│   │   ├── child/         # LevelCard, StreakFlame, WeekStrip, ActivityCalendar, GoalCard…
│   │   └── admin/         # KpiGrid, SalesTable, ProductForm…
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts   # cliente con cookies (sesión del usuario) — lecturas
│   │   │   ├── admin.ts    # cliente service role — 'server-only'
│   │   │   └── middleware.ts
│   │   ├── auth/
│   │   │   ├── session.ts  # getSession(), getCurrentProfile()
│   │   │   ├── guards.ts   # requireChild(), requireParent(), requireChildSelf()
│   │   │   └── pin.ts      # derivación de contraseña desde PIN
│   │   ├── domain/         # ★ TypeScript puro y testeado
│   │   │   ├── money.ts        # redondeos, formato, reparto por mayor resto
│   │   │   ├── dates.ts        # local date con timezone familiar
│   │   │   ├── inventory.ts    # costo promedio ponderado
│   │   │   ├── sale.ts         # totales, cambio, propina, utilidad
│   │   │   ├── earnings.ts     # atribución y distribución padres→niños
│   │   │   ├── savings.ts      # ahorro automático, movimientos de billetera
│   │   │   ├── gamification.ts # XP, puntos, nivel, logros, retos
│   │   │   ├── streak.ts       # replay de racha y protectores
│   │   │   └── __tests__/
│   │   ├── data/           # queries de lectura (por entidad), 'server-only'
│   │   ├── actions/        # Server Actions (una por caso de uso)
│   │   ├── schemas/        # zod
│   │   └── constants.ts
│   ├── types/database.ts   # generado por supabase gen types
│   └── middleware.ts       # refresco de sesión
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 0001_schema.sql
│       ├── 0002_views.sql
│       ├── 0003_rls.sql
│       ├── 0004_functions.sql
│       ├── 0005_prevent_negative_sale_stock.sql
│       └── 0006_wallet_commit.sql
├── scripts/
│   ├── seed.ts             # crea usuarios de auth + datos semilla
│   └── generate-icons.ts   # SVG galleta → PNG (sharp)
├── public/
│   ├── icons/…  sw.js  favicon.ico
├── .env.local.example
├── README.md
└── vitest.config.ts
```

### B.4 Estrategia Supabase

- **Un proyecto local** con Supabase CLI (`supabase start`, Docker) para desarrollo. Fallback documentado: un proyecto cloud gratuito de desarrollo si Docker no está disponible (§L.6).
- **Migraciones**: archivos SQL numerados en `supabase/migrations/`. Se aplican con `supabase db reset` (local) o `supabase db push` (remoto). Nunca editar una migración ya aplicada en remoto; añadir una nueva.
- **Tipos**: `npm run types` ⇒ `supabase gen types typescript --local > src/types/database.ts`.
- **Enums**: se modelan como `text` + `CHECK`. Motivo: añadir un valor a un enum de Postgres exige migración y bloquea; un `CHECK` es igual de seguro y más fácil de evolucionar.
- **Dinero**: todos los importes en **pesos colombianos enteros** (`integer`), sin decimales. Única excepción: costos unitarios y promedios, `numeric(12,2)`, porque el promedio ponderado los produce. Reglas de redondeo en §D.2.
- **Claves**: `uuid` con `gen_random_uuid()` por defecto; los ids de venta se generan en TypeScript (`crypto.randomUUID()` o UUID v4 con `crypto.getRandomValues()` cuando el navegador no expone ese método bajo HTTP local) para poder construir todas las filas hijas antes del insert atómico.
- **Storage**: **no se usa en el MVP.** Productos, metas, recompensas y logros usan **emoji** (`text`) como imagen. Hay una columna `image_url` opcional para pegar una URL externa más adelante; no se construye subida de archivos.

### B.5 Autenticación y perfiles

**Modelo:** cada perfil (niño o padre) es un usuario real de Supabase Auth. `profiles.id` = `auth.users.id`. `profiles.type ∈ {CHILD, PARENT}`.

**Padres** → email + contraseña estándar de Supabase Auth.

**Niños** → PIN de 4 dígitos, sin email visible ni contraseña que recordar:

1. `/login` muestra tarjetas grandes con avatar y nombre de cada perfil (la lista se obtiene en el Server Component con el cliente `service role`; **no se expone ninguna tabla al rol `anon`**).
2. Al tocar un niño, se abre un teclado numérico grande (`PinPad`).
3. La Server Action `loginWithPin(profileId, pin)`:
   - verifica bloqueo (`profiles.pin_locked_until`);
   - calcula `password = HMAC_SHA256(CHILD_PIN_PEPPER, profileId + ':' + pin)` en hex (64 caracteres);
   - llama a `signInWithPassword({ email: profiles.auth_email, password })` con el cliente de servidor (escribe las cookies de sesión);
   - si falla: `pin_failed_attempts += 1`; a los 5 intentos, `pin_locked_until = now() + 5 min`. Si acierta, se resetea el contador.
4. Cambiar el PIN (acción de padre, o del propio niño desde ajustes) = recalcular la contraseña derivada y actualizarla con `auth.admin.updateUserById`.

Ventajas: no se almacena ningún hash de PIN propio (lo guarda Supabase Auth), la contraseña efectiva es fuerte, y la sesión es una sesión Supabase normal ⇒ RLS funciona sin trucos.

`auth_email` de un niño: `nino-<slug>@choki.local` (nunca se envía correo; confirmación de email desactivada en `config.toml`).

**Sesión:** JWT de 1 hora con refresh automático vía `middleware.ts`; refresh token de larga duración para que los niños no vuelvan a entrar el PIN cada día. Botón "Cambiar de perfil" siempre disponible.

**Guards:** `src/app/(child)/layout.tsx` llama a `requireChild()`; `src/app/(admin)/admin/layout.tsx` llama a `requireParent()`. Además **cada Server Action vuelve a comprobar el rol**; el layout es UX, no seguridad.

### B.6 Manejo de estado

- **Sin librería de estado global.** Estado de servidor = Server Components + `revalidatePath()` tras cada mutación.
- **Carrito del POS**: `useReducer` local en el cliente. Se persiste en `sessionStorage` con la clave `choki:cart` para sobrevivir a un bloqueo de pantalla en mitad de una venta; se limpia al registrar. (Detalle relevante en móvil: el navegador puede descartar la pestaña.)
- **Formularios**: `<form action={serverAction}>` + `useActionState` para errores, `useFormStatus` para el estado de envío. Sin `react-hook-form`.
- **Feedback**: `sonner` para toasts; hojas (`Sheet`) para flujos móviles.

### B.7 PWA

- `src/app/manifest.ts` (route handler tipado de Next) con `name: "Choki"`, `short_name: "Choki"`, `display: "standalone"`, `background_color: "#FFF7E8"`, `theme_color: "#3B241C"`, `start_url: "/"`, orientación `portrait`, iconos 192/512 + 512 `maskable`.
- `public/sw.js`: service worker mínimo (~25 líneas) con un handler `fetch` de tipo *network-first sin caché persistente*. Existe **solo** porque Chrome exige un service worker con handler `fetch` para ofrecer la instalación. **No** se implementa offline ni sincronización.
- Registro del SW en un componente cliente `<RegisterSW />` montado en el layout raíz.
- `apple-touch-icon` 180×180, `favicon.ico` multi-tamaño, `icon.svg`, y `metadata` de Next con `appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Choki' }`.

### B.8 Componentes principales

Ver §G. Resumen: `MoneyText`, `QtyStepper`, `CartBar`, `CashPad`, `SaleResultSheet`, `LevelCard`, `StreakFlame`, `WeekStrip`, `ActivityCalendar`, `GoalCard`, `RewardCard`, `PinPad`, `BottomNav`, `StatCard`, `PeriodFilter`.

---

## B.9 Ambigüedades detectadas y cómo se resuelven

El requerimiento pide (§58) analizar el sistema como un todo y resolver inconsistencias. Estas son las que existen, con la decisión tomada. **Son vinculantes.**

| # | Tensión detectada | Decisión |
|---|---|---|
| 1 | §5.1 dice que las propinas de las ventas *propias* del niño le pertenecen, pero no dice qué pasa con la propina de una venta de un **padre**. | La propina de una venta de padre **se distribuye igual que el margen**, con los mismos porcentajes. Un solo concepto ("ganancia económica" = margen + propina) evita dos reglas de reparto. |
| 2 | §3.1 prohíbe a los niños "administrar" costos, pero §33 exige mostrarles su ganancia — y precio + ganancia revela el costo. | Frontera **dura** = escritura: un niño nunca puede crear/editar productos, precios, costos ni compras (RLS + guards). Frontera **blanda** = lectura: los niños leen el catálogo por la vista `products_public`, que no expone `cost` ni `avg_cost`, pero sí ven su utilidad. Se documenta que es una barrera de higiene, no criptográfica. |
| 3 | §6 (ahorro automático) no dice si aplica también a la participación recibida de ventas de padres. | **Sí aplica.** Toda ganancia que entra a la billetera del niño pasa por la regla de ahorro vigente en ese momento. Es una sola ruta de entrada de dinero. |
| 4 | §26 exige consumir un protector "cuando el día termina" — pero el plan prohíbe colas, crons e infraestructura. | **Evaluación perezosa por replay.** La racha nunca se guarda como estado incremental: se **reconstruye** con una función pura a partir de (días con venta) + (protectores adquiridos), cada vez que se registra una venta, se compra un protector, se anula una venta o se abre el dashboard/página de racha con `last_evaluated_date < hoy`. Resultado idéntico a un cron, cero infraestructura, y las anulaciones quedan correctas gratis. Detalle en §D.8. |
| 5 | §15 exige que una anulación revierta ganancias, pero el dinero pudo haberse gastado o aportado a una meta. | La reversión **espeja exactamente** los movimientos originales (mismo reparto disponible/ahorro). El saldo disponible **puede quedar negativo**; no se bloquea la anulación ni se toca el ahorro ni las metas. El dashboard administrativo muestra una alerta "saldo negativo" hasta que se regularice. Igual criterio para puntos ya gastados. |
| 6 | §15 exige revertir XP y puntos, pero §23 define los logros como reconocimientos históricos. | Se revierten XP y puntos con movimientos negativos. **Los logros ya desbloqueados no se revocan** y sus recompensas no se retiran (desmotivador y de valor nulo en una app familiar). El progreso de retos sí se recalcula. Se documenta en la UI de anulación. |
| 7 | El POS debe evitar errores (§52) y mantener un inventario físicamente coherente. | **Nunca se permite vender más unidades que el stock disponible.** El POS bloquea el incremento al alcanzar la existencia registrada; la Server Action vuelve a validar el stock actual y `sale_commit` lo comprueba atómicamente para cubrir ventas simultáneas. Si el stock cambió, no se persiste ningún efecto de la venta y se pide actualizar el carrito. |
| 8 | §7 distingue ahorro de metas, pero no dice de dónde sale el dinero que se aporta a una meta. | Tres bolsillos explícitos: **Disponible**, **Ahorro**, **Metas**. Un aporte a meta puede salir de Disponible o de Ahorro (el niño elige). Cada movimiento registra los tres deltas. Total del niño = disponible + ahorro + Σ metas. |
| 9 | §25 no aclara si un día protegido incrementa la racha. | Un día protegido **conserva** la racha, no la incrementa. Solo un día con venta propia suma. |
| 10 | §4.2 dice "50/50 inicial" pero no qué pasa si los porcentajes no suman 100, o si hay 1 o 3 niños. | La configuración se valida en servidor: la suma debe ser exactamente 100. El reparto de pesos usa **mayor resto** (§D.5) para que la suma de las partes sea exactamente el total, sin céntimos perdidos. |
| 11 | §28 pide "meta principal" en el dashboard pero no define cuál. | Campo `is_primary` (máximo una por niño). Si no hay ninguna marcada, se muestra la meta `ACTIVE` de mayor prioridad y, a igualdad, la más antigua. |
| 12 | §21 define el protector de racha como un *tipo de recompensa*, y §27 pide configurar "precio de protectores" por separado. | Una sola fuente: el protector es una fila de `rewards` con `type = 'STREAK_PROTECTOR'`. Su `cost_points` **es** el precio. El máximo simultáneo vive en `app_settings.protector_max`. No hay precio duplicado. |
| 13 | El requerimiento no fija zona horaria en el cálculo de día pero §43 la exige. | `sales.local_date` se calcula **en el servidor** con la zona horaria de `app_settings.timezone` en el momento del commit y se **almacena**. Nunca se recalcula desde `timestamptz` en consultas. Cambiar la zona horaria más adelante no reescribe el pasado (correcto y deliberado). |
| 14 | §12 pide pagos en efectivo con cambio y §14 prohíbe pagos divididos. | En transferencia no hay `cash_received` ni cambio, pero **sí puede haber propina** (el cliente transfiere de más). Se soporta con un campo de propina explícito en el paso de pago. |
| 15 | La capacidad inicial de protectores no estaba explicitada. | Cada niño recibe **3 protectores gratuitos al crear su perfil**, registrados como un `protector_events.type = 'GRANT'`. Se consumen al proteger días fallidos y pueden reponerse por canje sin superar `protector_max`, cuyo valor predeterminado y techo permitido es 3. |
---

## C. Modelo de datos

27 tablas y 7 vistas. Convención: identificadores en **inglés y snake_case**; los textos de la interfaz en español. Todos los importes son `integer` (pesos colombianos) salvo los costos unitarios, `numeric(12,2)`.

### C.1 Mapa de entidades

```
auth.users ──1:1── profiles ──┬── child_settings        (config de ahorro por niño)
                              ├── profit_split_rules    (% que recibe de ventas de padres)
                              ├── goals                 (metas personales)
                              ├── money_movements       (billetera: disponible/ahorro/metas)
                              ├── earning_allocations   (qué venta le dio cuánto)
                              ├── xp_movements / point_movements
                              ├── child_streaks / streak_days / protector_events
                              ├── achievement_unlocks / challenge_progress
                              ├── redemptions
                              └── notifications

categories ──1:N── products ──┬── purchases
                              ├── inventory_movements
                              └── sale_items ──N:1── sales ──N:1── profiles (vendedor)

levels · gamification_rules · achievements · challenges · rewards · app_settings   (configuración)
```

### C.2 DDL — `supabase/migrations/0001_schema.sql`

```sql
create extension if not exists pgcrypto;

-- ─────────────────────────── Configuración global ───────────────────────────
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

-- ─────────────────────────── Perfiles ───────────────────────────
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

-- Config de ahorro voluntario (solo niños)
create table child_settings (
  child_id             uuid primary key references profiles(id) on delete cascade,
  auto_saving_enabled  boolean not null default false,
  saving_percent       integer not null default 0 check (saving_percent between 0 and 100),
  updated_at           timestamptz not null default now()
);

-- Distribución de la ganancia de ventas hechas por padres
create table profit_split_rules (
  child_id   uuid primary key references profiles(id) on delete cascade,
  percent    numeric(5,2) not null check (percent >= 0 and percent <= 100),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────── Catálogo ───────────────────────────
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
  price       integer not null check (price >= 0),          -- precio de venta
  cost        integer not null default 0 check (cost >= 0), -- costo de referencia manual
  avg_cost    numeric(12,2) not null default 0,             -- costo promedio ponderado
  stock       integer not null default 0,                   -- las escrituras impiden que quede negativo
  min_stock   integer not null default 0 check (min_stock >= 0),
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on products (active, sort_order);

-- ─────────────────────────── Compras e inventario ───────────────────────────
create table purchases (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete restrict,
  quantity    integer not null check (quantity > 0),
  total_cost  integer not null check (total_cost >= 0),
  unit_cost   numeric(12,2) not null,        -- total_cost / quantity
  purchased_at timestamptz not null default now(),
  local_date  date not null,
  note        text,
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now()
);
create index on purchases (product_id, purchased_at desc);

create table inventory_movements (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references products(id) on delete restrict,
  type           text not null check (type in ('PURCHASE','SALE','SALE_VOID','ADJUSTMENT')),
  quantity_delta integer not null,           -- con signo
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

-- ─────────────────────────── Ventas ───────────────────────────
create table sales (
  id              uuid primary key,               -- generado en TypeScript
  seller_id       uuid not null references profiles(id) on delete restrict,
  seller_type     text not null check (seller_type in ('CHILD','PARENT')),  -- snapshot
  sold_at         timestamptz not null default now(),
  local_date      date not null,                  -- calculado con app_settings.timezone
  payment_method  text not null check (payment_method in ('CASH','TRANSFER')),
  items_total     integer not null check (items_total >= 0),
  cost_total      numeric(12,2) not null default 0,
  margin_total    integer not null,               -- items_total - round(cost_total)
  cash_received   integer,                        -- null en transferencia
  change_given    integer,                        -- null en transferencia
  tip_total       integer not null default 0 check (tip_total >= 0),
  earnings_total  integer not null,               -- margin_total + tip_total
  units_total     integer not null check (units_total > 0),
  status          text not null default 'COMPLETED' check (status in ('COMPLETED','VOIDED')),
  note            text,
  voided_at       timestamptz,
  voided_by       uuid references profiles(id),
  void_reason     text,
  created_at      timestamptz not null default now()
);
create index on sales (local_date desc);
create index on sales (seller_id, local_date desc);
create index on sales (status, sold_at desc);

create table sale_items (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references sales(id) on delete cascade,
  product_id   uuid not null references products(id) on delete restrict,
  product_name text    not null,                  -- snapshot
  product_emoji text   not null default '🍪',     -- snapshot
  quantity     integer not null check (quantity > 0),
  unit_price   integer not null check (unit_price >= 0),
  unit_cost    numeric(12,2) not null,            -- snapshot del avg_cost al vender
  line_total   integer not null,
  line_cost    numeric(12,2) not null,
  line_margin  integer not null
);
create index on sale_items (sale_id);
create index on sale_items (product_id);

-- Qué parte de una venta le corresponde económicamente a cada niño
create table earning_allocations (
  id             uuid primary key default gen_random_uuid(),
  sale_id        uuid not null references sales(id) on delete cascade,
  child_id       uuid not null references profiles(id) on delete cascade,
  source         text not null check (source in ('OWN_SALE','FAMILY_SHARE')),
  share_percent  numeric(5,2),                    -- null cuando source = OWN_SALE
  margin_amount  integer not null,
  tip_amount     integer not null default 0,
  total_amount   integer not null,                -- margin_amount + tip_amount
  reversed       boolean not null default false,
  created_at     timestamptz not null default now()
);
create index on earning_allocations (child_id, created_at desc);
create index on earning_allocations (sale_id);

-- ─────────────────────────── Billetera del niño ───────────────────────────
-- Un movimiento = un cambio explícito en uno o varios de los tres bolsillos.
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
  earning_amount  integer not null default 0,  -- >0 solo en EARNING; <0 en EARNING_REVERSAL
  reference_type  text check (reference_type in ('SALE','GOAL','MANUAL')),
  reference_id    uuid,
  description     text not null,
  created_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  local_date      date not null
);
create index on money_movements (child_id, created_at desc);
-- integridad conceptual: goal_delta ≠ 0 exige goal_id
alter table money_movements
  add constraint money_movements_goal_ck check (goal_delta = 0 or goal_id is not null);

create table goals (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references profiles(id) on delete cascade,
  name          text    not null,
  emoji         text    not null default '🎯',
  image_url     text,
  description   text,
  target_amount integer not null check (target_amount > 0),
  target_date   date,
  priority      integer not null default 2 check (priority between 1 and 3), -- 1 alta
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
```

> **Nota de orden**: `money_movements` referencia `goals`. En el archivo real, crear `goals` **antes** que `money_movements` (aquí se muestran juntas por afinidad temática).

```sql
-- ─────────────────────────── Gamificación: configuración ───────────────────────────
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

-- Reglas de XP/puntos por evento base (las de retos y logros viven en sus tablas)
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
  product_id     uuid references products(id) on delete cascade, -- solo PRODUCT_UNITS
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

-- ─────────────────────────── Gamificación: movimientos ───────────────────────────
create table xp_movements (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references profiles(id) on delete cascade,
  amount         integer not null,          -- con signo
  reason         text not null check (reason in
                   ('SALE','UNITS','CHALLENGE','ACHIEVEMENT','STREAK_MILESTONE',
                    'SALE_VOID','ADJUSTMENT')),
  reference_type text check (reference_type in ('SALE','CHALLENGE','ACHIEVEMENT','MANUAL')),
  reference_id   uuid,
  description    text not null,             -- "Venta #132", "4 productos vendidos"…
  created_at     timestamptz not null default now()
);
create index on xp_movements (child_id, created_at desc);

create table point_movements (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references profiles(id) on delete cascade,
  amount         integer not null,          -- con signo
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

-- ─────────────────────────── Rachas ───────────────────────────
-- Caché derivada. La verdad se reconstruye siempre con streak.ts (§D.8).
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

-- Solo ALTAS de protectores: grant inicial, regalos y compras.
-- El consumo es derivado (streak_days.status='PROTECTED').
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

-- ─────────────────────────── Recompensas ───────────────────────────
create table rewards (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  icon        text not null default '🎁',
  image_url   text,
  cost_points integer not null check (cost_points >= 0),
  type        text not null default 'NORMAL' check (type in ('NORMAL','STREAK_PROTECTOR')),
  stock       integer,                       -- null = ilimitado
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table redemptions (
  id           uuid primary key default gen_random_uuid(),
  reward_id    uuid not null references rewards(id) on delete restrict,
  child_id     uuid not null references profiles(id) on delete cascade,
  reward_name  text not null,                -- snapshot
  points_spent integer not null,
  status       text not null default 'PENDING'
                 check (status in ('PENDING','DELIVERED','CANCELLED')),
  redeemed_at  timestamptz not null default now(),
  delivered_at timestamptz,
  note         text
);
create index on redemptions (child_id, redeemed_at desc);

-- ─────────────────────────── Notificaciones internas ───────────────────────────
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
```

### C.3 Vistas — `0002_views.sql`

```sql
-- Helper de rol. Se define AQUÍ (antes que las vistas) porque v_child_sales lo usa.
-- SECURITY DEFINER: evita la recursión infinita al consultar profiles dentro de una
-- política sobre profiles.
create or replace function public.is_parent() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p
                 where p.id = (select auth.uid()) and p.type = 'PARENT' and p.active);
$$;

-- Catálogo sin costos (lo que ve un niño). SECURITY DEFINER por defecto: ignora la RLS
-- de products a propósito, exponiendo solo columnas seguras.
create view products_public as
  select id, category_id, name, description, emoji, image_url,
         price, stock, min_stock, active, sort_order
  from products;
grant select on products_public to authenticated;

-- Saldos de la billetera. security_invoker: la RLS de money_movements decide las filas.
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

-- Ventas visibles para niños (sin costos). Filtra por dueño o padre.
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
```

### C.4 RLS — `0003_rls.sql`

`public.is_parent()` ya existe (se creó en `0002_views.sql`). Activar RLS en **todas** las tablas del esquema `public` de una sola pasada (`ALTER TABLE` no acepta lista de tablas):

```sql
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
```

Patrón de políticas (solo `for select`, rol `authenticated`; **no se crea ninguna política de escritura** — las escrituras van por `service_role`, que ignora RLS):

| Tabla | Política de lectura |
|---|---|
| `profiles`, `levels`, `categories`, `achievements`, `challenges`, `rewards`, `gamification_rules`, `app_settings` | `true` (todos los autenticados) |
| `products` | `public.is_parent()` — los niños usan `products_public` |
| `purchases`, `inventory_movements` | `public.is_parent()` |
| `sales`, `sale_items` | `public.is_parent()` — los niños usan `v_child_sales` |
| `child_settings`, `profit_split_rules`, `goals`, `money_movements`, `earning_allocations`, `xp_movements`, `point_movements`, `achievement_unlocks`, `challenge_progress`, `child_streaks`, `streak_days`, `protector_events`, `redemptions` | `child_id = (select auth.uid()) or public.is_parent()` |
| `notifications` | `profile_id = (select auth.uid())` |

Ejemplo canónico (replicar para cada tabla de la última fila):

```sql
create policy money_movements_read on money_movements for select to authenticated
  using (child_id = (select auth.uid()) or public.is_parent());
```

**Excepción de lectura para el ranking entre hermanos** (§33): la vista `v_child_gamification` usa `security_invoker`, así que un niño solo vería su propia fila. Para el ranking se añade una política extra sobre `xp_movements` que permite leer **solo agregados** — como RLS no filtra columnas ni agregados, se resuelve con una vista aparte:

```sql
create view v_xp_ranking as   -- SECURITY DEFINER a propósito: solo expone nombre + XP
  select p.id, p.name, p.avatar_emoji, p.color,
         coalesce(sum(x.amount),0)::int as xp
  from profiles p left join xp_movements x on x.child_id = p.id
  where p.type = 'CHILD' and p.active
  group by p.id;
grant select on v_xp_ranking to authenticated;
```

### C.5 Funciones de escritura atómica — `0004_functions.sql`

Las funciones de escritura reciben un `jsonb` con las filas **ya calculadas** por la capa de dominio y se ejecutan con `service_role` (una función = una transacción).

```sql
-- 1) Registrar una venta completa
create or replace function public.sale_commit(p jsonb) returns void
language plpgsql as $$
declare
  v_expected_updates integer := jsonb_array_length(p->'stock_deltas');
  v_updated_products integer;
begin
  -- El descuento ocurre primero y toma bloqueo de fila. Una venta concurrente
  -- solo continúa si todavía existe stock suficiente para todas sus líneas.
  update products pr set stock = pr.stock + s.delta, updated_at = now()
  from (select (v->>'product_id')::uuid pid, (v->>'delta')::int delta
        from jsonb_array_elements(p->'stock_deltas') v) s
  where pr.id = s.pid and pr.stock + s.delta >= 0;
  get diagnostics v_updated_products = row_count;
  if v_updated_products <> v_expected_updates then
    raise exception using errcode = 'P0001', message = 'INSUFFICIENT_STOCK';
  end if;

  insert into sales           select * from jsonb_populate_recordset(null::sales,               p->'sale');
  insert into sale_items      select * from jsonb_populate_recordset(null::sale_items,          p->'items');
  -- inventory_movements.stock_after se toma del stock ya actualizado, no del
  -- snapshot del cliente, para conservar trazabilidad correcta bajo concurrencia.
  insert into inventory_movements (id, product_id, type, quantity_delta, reason,
    reference_type, reference_id, stock_after, note, created_by, created_at, local_date)
  select i.id, i.product_id, i.type, i.quantity_delta, i.reason, i.reference_type,
    i.reference_id, pr.stock, i.note, i.created_by, i.created_at, i.local_date
  from jsonb_populate_recordset(null::inventory_movements, p->'inventory') i
  join products pr on pr.id = i.product_id;
  insert into earning_allocations select * from jsonb_populate_recordset(null::earning_allocations, p->'allocations');
  insert into money_movements select * from jsonb_populate_recordset(null::money_movements,     p->'money');
  insert into xp_movements    select * from jsonb_populate_recordset(null::xp_movements,        p->'xp');
  insert into point_movements select * from jsonb_populate_recordset(null::point_movements,     p->'points');
  insert into achievement_unlocks select * from jsonb_populate_recordset(null::achievement_unlocks, p->'unlocks')
    on conflict do nothing;
  insert into notifications   select * from jsonb_populate_recordset(null::notifications,       p->'notifications');

  -- progreso de retos
  insert into challenge_progress select * from jsonb_populate_recordset(null::challenge_progress, p->'challenges')
    on conflict (challenge_id, child_id) do update
    set current_value = excluded.current_value,
        completed_at  = excluded.completed_at,
        rewarded      = excluded.rewarded,
        updated_at    = now();

  -- racha
  perform public.streak_sync(p->'streaks');
end $$;

-- 2) Anular una venta
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

-- 3) Registrar una compra (stock + costo promedio + movimiento)
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

-- 4) Sincronizar la racha reconstruida (reemplaza el historial del niño)
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

-- 5) Movimiento de billetera + efecto/notificación de meta
-- `wallet_commit` bloquea la fila del niño, vuelve a sumar disponible/ahorro/meta,
-- rechaza deltas que dejarían un bolsillo negativo (salvo reversión/ajuste), inserta
-- el movimiento y confirma en la misma transacción el autocompletado y las
-- notificaciones GOAL_NEAR/GOAL_COMPLETED que reciba en el payload.
```

> **Contrato del payload (crítico).** `jsonb_populate_recordset(null::tabla, …)` construye filas a partir de las claves del JSON: una clave ausente se convierte en `NULL`, y un `NULL` explícito **anula el `DEFAULT`** de la columna. Por tanto, los constructores de payload de TypeScript deben incluir **todas** las columnas `NOT NULL` de cada tabla, incluidas `id`, `created_at` y las que tienen `default` (`created_at: new Date().toISOString()`). Los tipos `Database['public']['Tables'][T]['Insert']` generados no bastan (marcan esas columnas como opcionales): usar `Row` como tipo del objeto que se envía a la RPC, para que el compilador exija cada campo.

Operaciones **fuera** de RPC (una sola tabla, sin riesgo de inconsistencia): CRUD de productos, categorías, niveles, logros, retos, recompensas, perfiles, ajustes; ajustes manuales de inventario (2 escrituras, aceptable con reintento); movimientos de billetera manuales (ahorro, retiros, aportes a meta: 1 fila); canjes (2 filas → se hace con una RPC ligera opcional o dos inserts, aceptable).
---

## D. Reglas de negocio

Todas las reglas de esta sección viven en `src/lib/domain/**` como **funciones puras** (sin acceso a BD, sin `Date.now()` implícito: la fecha entra por parámetro). Son las que se prueban con Vitest (§J).

### D.1 Fechas, día local y zona horaria

```ts
// src/lib/domain/dates.ts
export type LocalDate = string; // 'YYYY-MM-DD'

export function toLocalDate(instant: Date, timeZone: string): LocalDate;
export function addDays(d: LocalDate, n: number): LocalDate;
export function diffDays(a: LocalDate, b: LocalDate): number;
export function weekDays(d: LocalDate): LocalDate[];   // lunes→domingo de la semana de d
export function monthGrid(d: LocalDate): LocalDate[];  // calendario mensual (rejilla L-D)
```

- `toLocalDate` usa `Intl.DateTimeFormat('en-CA', { timeZone })` que devuelve directamente `YYYY-MM-DD`. Sin dependencias.
- La aritmética de días se hace sobre `Date.UTC(y, m-1, d, 12)` (mediodía UTC) para inmunidad a DST, y se reformatea. Colombia no tiene DST, pero la función debe ser correcta igualmente.
- **La semana empieza el lunes** (etiquetas `L M X J V S D`).
- Todo lo que sea "día", "hoy", "semana", "mes" o "racha" se calcula sobre `local_date`, nunca sobre `timestamptz` en SQL.
- `local_date` se calcula una sola vez, en el servidor, en el momento de escribir, y se persiste (ventas, compras, movimientos).

### D.2 Dinero y redondeo

```ts
// src/lib/domain/money.ts
export const round = (n: number): number => Math.round(n + Number.EPSILON); // half-up
export function formatCOP(n: number): string;      // "$ 20.000"  (es-CO, 0 decimales)
export function distribute(total: number, weights: number[]): number[]; // mayor resto
```

- Toda cantidad mostrada o almacenada como importe es **entera** (pesos). No hay centavos.
- `round` es **half-up** sobre positivos; se aplica al convertir `numeric` de costos a pesos.
- `distribute(total, weights)` (método del **mayor resto**): calcula `exact_i = total * w_i / Σw`, asigna `floor(exact_i)`, y reparte los pesos sobrantes uno a uno a los mayores restos fraccionarios; empate → menor índice (que corresponde al `sort_order` del niño). Garantiza `Σ resultado === total`. Se usa para el reparto padres→niños y para separar ahorro.
- Formato: `new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 })`.

### D.3 Costo promedio ponderado (compras)

```ts
// src/lib/domain/inventory.ts
export function applyPurchase(
  current: { stock: number; avgCost: number },
  purchase: { quantity: number; totalCost: number }
): { stock: number; avgCost: number; unitCost: number }
```

Reglas:

1. `unitCost = totalCost / quantity` (numeric, 2 decimales).
2. `baseStock = max(current.stock, 0)` — defensa para datos heredados o importados; las nuevas escrituras no permiten generar stock negativo.
3. `avgCost = (baseStock * current.avgCost + totalCost) / (baseStock + quantity)`, redondeado a 2 decimales.
4. `stock = current.stock + quantity`.
5. Si el producto nunca tuvo compras (`avgCost = 0`), el nuevo promedio es simplemente `unitCost`.
6. La compra escribe además un `inventory_movements` de tipo `PURCHASE`.

**No** se implementa FIFO, LIFO ni recálculo retroactivo.

### D.4 Venta: totales, costo, cambio y propina

```ts
// src/lib/domain/sale.ts
export type CartLine = { productId: string; name: string; emoji: string;
                         quantity: number; unitPrice: number; unitCost: number };

export function computeSaleTotals(lines: CartLine[]): {
  itemsTotal: number; unitsTotal: number; costTotal: number; marginTotal: number;
  items: SaleItemRow[];
};

export function computeCashOutcome(input: {
  itemsTotal: number; cashReceived: number; changeGiven: number;
}): { changeExpected: number; tip: number };
```

Reglas:

1. `unitCost` de cada línea = `product.avg_cost` en el instante de la venta; si es `0`, se usa `product.cost`. **Se guarda como snapshot** en `sale_items.unit_cost` para que un cambio de costo posterior no altere la utilidad histórica.
2. `line_total = unit_price * quantity` (entero). `line_cost = unit_cost * quantity` (numeric). `line_margin = line_total - round(line_cost)`.
3. `items_total = Σ line_total`; `cost_total = Σ line_cost`; `margin_total = items_total - round(cost_total)`.
4. **Efectivo:** `changeExpected = max(0, cashReceived - itemsTotal)`. El vendedor confirma cuánto devolvió (`changeGiven`, por defecto = `changeExpected`). Entonces `tip = changeExpected - changeGiven`, con `0 ≤ changeGiven ≤ changeExpected`. Esto cubre los tres casos: devolución completa (tip 0), "quédate el cambio" (`changeGiven = 0`), y devolución parcial.
5. **Transferencia:** `cash_received` y `change_given` son `null`. La propina se captura como un importe explícito opcional (`tip_total`), por si el cliente transfiere de más.
6. `earnings_total = margin_total + tip_total`. Esta es la "ganancia económica" del §13 del requerimiento.
7. **La propina nunca modifica el precio de los productos** ni el `items_total`.
8. `units_total = Σ quantity`. Debe ser ≥ 1 para poder registrar.
9. **Stock:** cada línea debe cumplir `quantity <= stock`. La UI impide superar el máximo disponible, la Server Action valida nuevamente contra el stock vigente y `sale_commit` realiza un descuento condicional atómico; si alguna línea no alcanza, toda la transacción falla con `INSUFFICIENT_STOCK`. Se genera un `inventory_movements` tipo `SALE` por línea y, si algún producto queda en `stock <= min_stock`, una notificación `LOW_STOCK` para **todos los padres**.

### D.5 Atribución y distribución de la ganancia

```ts
// src/lib/domain/earnings.ts
export function allocateEarnings(input: {
  saleId: string; sellerId: string; sellerType: 'CHILD'|'PARENT';
  marginTotal: number; tipTotal: number;
  splitRules: { childId: string; percent: number; sortOrder: number }[];
}): EarningAllocationRow[]
```

**Venta de un niño (`sellerType = 'CHILD'`)**

- Una sola asignación: `source = 'OWN_SALE'`, `child_id = sellerId`, `share_percent = null`,
  `margin_amount = marginTotal`, `tip_amount = tipTotal`, `total_amount = marginTotal + tipTotal`.
- Genera XP, puntos, racha, progreso de retos y logros.

**Venta de un padre (`sellerType = 'PARENT'`)**

- Una asignación por niño activo con regla de reparto, `source = 'FAMILY_SHARE'`, `share_percent` de la configuración.
- `margin_amount = distribute(marginTotal, percents)[i]` y `tip_amount = distribute(tipTotal, percents)[i]` (mayor resto por separado en cada concepto, para que ambas sumas cuadren exactamente).
- **No** genera XP, ni puntos, ni racha, ni progreso de retos, ni logros, ni entra en el ranking.
- Sí afecta inventario, ingresos, utilidad y estadísticas globales y por persona.

**Validación de la configuración de reparto**: `Σ percent = 100` exactamente, con al menos un niño activo. Se valida en la Server Action antes de guardar. Si un niño se desactiva, la interfaz obliga a redistribuir antes de continuar.

**Separación informativa obligatoria** (§4 del requerimiento). El dashboard y las estadísticas del niño deben mostrar por separado:

- *Vendido por mí* → `Σ sales.items_total where seller_id = child and status='COMPLETED'`
- *Ganancia propia* → `Σ earning_allocations.total_amount where source='OWN_SALE' and not reversed`
- *Ganancia familiar* → `Σ earning_allocations.total_amount where source='FAMILY_SHARE' and not reversed`
- *Ganancia total histórica* → suma de las dos anteriores (= `v_child_balances.historic_earnings`)

### D.6 Billetera: disponible, ahorro, metas, retiros

Tres bolsillos, un único libro de movimientos (`money_movements`) con tres deltas.

```
disponible = Σ available_delta
ahorro     = Σ savings_delta
en metas   = Σ goal_delta
ganancia histórica = Σ earning_amount
```

```ts
// src/lib/domain/savings.ts
export function splitEarning(amount: number, cfg: { enabled: boolean; percent: number }):
  { toSavings: number; toAvailable: number }
```

Reglas por tipo de movimiento:

| Tipo | available | savings | goal | earning_amount | Origen |
|---|---|---|---|---|---|
| `EARNING` | +disponible | +ahorro | 0 | +total | venta propia o participación familiar |
| `EARNING_REVERSAL` | −disponible | −ahorro | 0 | −total | anulación de venta |
| `SAVING_IN` | −X | +X | 0 | 0 | el niño mueve dinero a ahorro |
| `SAVING_OUT` | +X | −X | 0 | 0 | el niño saca dinero del ahorro |
| `GOAL_IN` | −X ó 0 | 0 ó −X | +X | 0 | aporte a meta (elige origen) |
| `GOAL_OUT` | +X ó 0 | 0 ó +X | −X | 0 | retirar dinero de una meta |
| `GOAL_SPEND` | 0 | 0 | −X | 0 | la meta se cumplió y se gastó el dinero |
| `WITHDRAWAL` | −X | 0 | 0 | 0 | el niño usó/gastó su dinero disponible |
| `ADJUSTMENT` | ± | ± | ± | ± | corrección manual de un padre |

Reglas adicionales:

1. **Ahorro automático:** al crear un `EARNING` de importe `A`, si `child_settings.auto_saving_enabled`, entonces `toSavings = round(A * percent / 100)` y `toAvailable = A - toSavings`. Si está desactivado, todo va a disponible.
2. **Nunca retroactivo** (§6): cambiar el porcentaje solo afecta a ganancias posteriores. Como el reparto se materializa en el movimiento al momento de crearlo, esto se cumple por construcción.
3. `SAVING_IN` / `GOAL_IN` no pueden dejar `disponible` (o `ahorro`) negativo: se valida contra el saldo actual en la Server Action.
4. `EARNING_REVERSAL` **sí puede** dejar saldos negativos (B.9 #5). No se bloquea.
5. Los retiros (`WITHDRAWAL`) los puede registrar el propio niño ("Usé mi dinero"), con descripción libre opcional. No requieren aprobación (§6: sin bloqueos parentales en el MVP).
6. Todo movimiento guarda `description` legible en español, porque la pantalla "Mi dinero" es un extracto.

### D.7 Metas

1. Pertenecen al niño; solo él las crea, edita, pausa, completa o archiva. Los padres pueden verlas (lectura) desde el perfil del niño.
2. Progreso = `Σ goal_delta` de esa meta (vista `v_goal_progress`).
3. Estados: `ACTIVE → PAUSED → ACTIVE`, `ACTIVE → COMPLETED`, cualquiera `→ ARCHIVED`.
4. Al alcanzar `saved_amount >= target_amount`, la meta se marca `COMPLETED` automáticamente, se crea notificación `GOAL_COMPLETED` y se dispara celebración. Al superar el 80 % se crea `GOAL_NEAR` (una sola vez por meta; se controla comprobando que no exista ya una notificación de ese tipo para esa meta).
5. Al completar, el niño puede "Ya la compré" ⇒ `GOAL_SPEND` por el total acumulado (el dinero sale del sistema) o "Devolver a disponible" ⇒ `GOAL_OUT`.
6. `is_primary`: máximo una activa por niño (índice único parcial). Si ninguna, se elige por prioridad y antigüedad (B.9 #11).
7. El logro `GOALS_COMPLETED` cuenta metas con estado `COMPLETED`.

### D.8 Rachas y protectores (replay determinista)

**Principio:** `child_streaks` y `streak_days` son **caché**. La verdad se reconstruye siempre desde cero con una función pura.

```ts
// src/lib/domain/streak.ts
export type StreakInput = {
  saleDays: { date: LocalDate; count: number }[];   // días con ≥1 venta propia COMPLETED, asc
  protectorGrants: { date: LocalDate; quantity: number }[]; // grant inicial, compras y regalos, asc
  today: LocalDate;
  maxProtectors: number;
};
export type StreakResult = {
  currentStreak: number; bestStreak: number; protectorsAvailable: number;
  lastActivityDate: LocalDate | null;
  days: { date: LocalDate; status: 'SOLD'|'PROTECTED'|'MISSED'; salesCount: number }[];
};
export function replayStreak(input: StreakInput): StreakResult;
```

Algoritmo (iterar día a día desde el primer día con venta —o el primer grant, lo que sea anterior— hasta `today` inclusive):

```
available = 0; current = 0; best = 0; days = []
para D desde inicio hasta today:
    available = min(maxProtectors, available + grants(D))
    si D tiene ventas:
        current += 1; best = max(best, current)
        days.push({D, 'SOLD', count})
        lastActivityDate = D
    sino si D < today:                     # el día ya terminó
        si current > 0 y available > 0:
            available -= 1
            days.push({D, 'PROTECTED'})    # conserva la racha, NO la incrementa
        sino si current > 0:
            days.push({D, 'MISSED'})       # este día rompió la racha
            current = 0
        # si current == 0: día inactivo sin racha que romper → no se registra nada
    sino:
        # D == today y aún no hay venta: el día no ha terminado, no se decide nada
```

Consecuencias y reglas derivadas:

1. Cada niño recibe **3 protectores gratuitos iniciales** mediante un evento `GRANT`; no cuestan puntos y forman parte del replay desde la fecha de creación del perfil.
2. **Nunca se consume un protector antes de que el día termine** (§26). Un niño sin venta *hoy* ve la racha intacta y un aviso "aún puedes vender hoy".
3. Un protector comprado el día D puede proteger el propio día D (al cerrarse).
4. `protectorsAvailable` es **derivado** (`Σ grants − nº de días PROTECTED`); `protector_events` solo registra altas.
5. Los protectores consumidos pueden reponerse mediante canje, pero la compra se bloquea si `protectorsAvailable >= app_settings.protector_max`. El máximo configurable nunca puede superar 3.
6. **Cuándo se ejecuta el replay** (`ensureStreakUpToDate(childId)`): al registrar una venta de niño, al anular una venta de niño, al comprar/canjear un protector, y al renderizar el dashboard del niño, la página de racha o el dashboard admin **si** `child_streaks.last_evaluated_date < hoy`. El resultado se persiste con `streak_sync`.
7. Coste: ≤ ~400 iteraciones al año y por niño. Irrelevante.
8. **Hitos de racha** (opcional, ya soportado por el modelo): si `current` alcanza 7, 14, 30… se puede otorgar XP con `reason='STREAK_MILESTONE'`. En el MVP se dejan **desactivados** (sin filas de configuración); el motor lo admite pero no se siembra ninguna regla, para no inventar contenido.
9. La racha solo la mueven **ventas propias del niño**. Las ventas de padres no la tocan.

### D.9 XP, puntos y niveles

```ts
// src/lib/domain/gamification.ts
export function xpAndPointsForSale(
  sale: { unitsTotal: number },
  rules: { event: 'SALE_COMPLETED'|'UNIT_SOLD'; xp: number; points: number; active: boolean }[]
): { xp: MovementDraft[]; points: MovementDraft[] };

export function levelFor(xp: number, levels: Level[]):
  { current: Level; next: Level | null; xpIntoLevel: number; xpForNext: number | null; percent: number };
```

Reglas:

1. Solo generan XP/puntos las **ventas propias de un niño** con `status='COMPLETED'`.
2. Eventos base configurables en `gamification_rules`:
   - `SALE_COMPLETED` → una vez por venta.
   - `UNIT_SOLD` → multiplicado por `units_total`.
   Semilla de prueba: `SALE_COMPLETED` = 10 XP / 5 puntos; `UNIT_SOLD` = 2 XP / 1 punto.
3. **El XP y los puntos no dependen del dinero.** Las propinas no otorgan XP ni puntos (§13). Al no existir ninguna regla ligada a importes, esto se cumple por construcción.
4. Cada evento produce **una fila** en `xp_movements` / `point_movements` con `description` legible: `"Venta #A1B2"`, `"4 productos vendidos"`, `"Reto: Vender 10 esta semana"`, `"Protector de racha"`. El saldo **nunca** se almacena; se suma (vista `v_child_gamification`). Esto satisface §19 (explicar por qué se tiene ese saldo).
5. Referencia corta de venta para textos: primeros 4 caracteres del uuid en mayúsculas (`#A1B2`). Se calcula en presentación, no se almacena.
6. **Nivel** = el `levels` activo de mayor `number` cuyo `xp_required <= xp`. Si el XP es menor que el nivel 1, el nivel actual es el 1 con 0 %. Progreso = `(xp - current.xp_required) / (next.xp_required - current.xp_required)`.
7. Subir de nivel ⇒ notificación `LEVEL_UP` + celebración. Se detecta comparando el nivel antes y después de aplicar los movimientos de la venta.
8. El XP **nunca se gasta**. Los puntos sí (canjes y protectores) y pueden quedar negativos solo por anulación.

### D.10 Logros

```ts
export function evaluateAchievements(input: {
  stats: ChildStats;               // totales ya recalculados tras la venta
  achievements: Achievement[];
  alreadyUnlocked: Set<string>;
}): { achievementId: string; xp: number; points: number }[]
```

- Se evalúan **después** de aplicar la venta, con los totales actualizados del niño.
- Condiciones soportadas (lista cerrada; §23 prohíbe un lenguaje de reglas genérico):

| `condition_type` | Valor comparado |
|---|---|
| `TOTAL_SALES` | nº de ventas propias COMPLETED |
| `TOTAL_UNITS` | Σ unidades vendidas propias |
| `TOTAL_PROFIT` | Σ `earning_allocations.total_amount` con `source='OWN_SALE'` |
| `STREAK_DAYS` | `best_streak` |
| `PRODUCT_UNITS` | Σ unidades de `product_id` en ventas propias |
| `GOALS_COMPLETED` | nº de metas `COMPLETED` |

- Se desbloquea cuando `valor >= target_value`. Es **irreversible** (B.9 #6).
- Al desbloquear: fila en `achievement_unlocks`, movimientos de XP/puntos con `reason='ACHIEVEMENT'`, notificación `ACHIEVEMENT` y celebración.
- Los logros `hidden` no se listan hasta desbloquearse (se muestra una tarjeta "???").

### D.11 Retos

- Temporales: `starts_on`/`ends_on`, evaluados contra `sales.local_date` del niño.
- Condiciones: `SALES_COUNT`, `UNITS_SOLD`, `PROFIT_AMOUNT`, `ACTIVE_DAYS` (días distintos con venta), `PRODUCT_UNITS`.
- Aplican a **todos los niños activos**; cada uno tiene su fila en `challenge_progress`.
- El progreso se **recalcula** desde las ventas del rango cada vez que se registra o anula una venta del niño (consulta acotada, barata). No es un contador incremental ⇒ las anulaciones lo corrigen solas.
- Al alcanzar el objetivo dentro del rango: `completed_at`, `rewarded = true`, XP/puntos con `reason='CHALLENGE'`, notificación `CHALLENGE_COMPLETED`, celebración. **La recompensa se otorga una sola vez** (`rewarded` evita duplicados aunque el progreso se recalcule).
- Un reto con `ends_on < hoy` pasa a `FINISHED` de forma perezosa al listarlo (o manualmente por un padre). No hay job.

### D.12 Recompensas, canjes y protectores

1. Canjear exige `puntos_disponibles >= reward.cost_points` y `active`, y `stock > 0` si `stock` no es `null`.
2. Efectos del canje: `point_movements` −`cost_points` (`reason='REDEMPTION'`), fila en `redemptions` (`status='PENDING'`), decremento de `rewards.stock` si aplica.
3. Si `reward.type = 'STREAK_PROTECTOR'`: además se inserta `protector_events` (`type='PURCHASE'`, `points_spent`), el canje nace `DELIVERED` (es digital) y se re-ejecuta el replay de racha.
4. Se bloquea la compra de protector si ya se tiene el máximo (`app_settings.protector_max`).
5. Un padre marca los canjes normales como `DELIVERED` o los `CANCELLED` (devolviendo los puntos con un `ADJUSTMENT`). Sin flujo de aprobación previo (§22).

### D.13 Anulación de ventas

Solo **padres**. Solo ventas con `status='COMPLETED'`. Se ejecuta en `sale_void` (una transacción). Pasos:

1. `sales.status = 'VOIDED'` + `voided_at`, `voided_by`, `void_reason` (obligatorio, texto corto).
2. **Inventario:** un `inventory_movements` tipo `SALE_VOID` por línea con `quantity_delta = +quantity`; `products.stock` se incrementa. El `avg_cost` **no** se recalcula (el costo promedio no cambia por devolver unidades a stock con su mismo costo).
3. **Dinero:** por cada `earning_allocations` de la venta, un `EARNING_REVERSAL` que espeja exactamente el reparto disponible/ahorro original (se recuperan los deltas del movimiento `EARNING` original vía `reference_id = sale_id`). Las asignaciones se marcan `reversed = true`.
4. **XP y puntos** (solo si era venta de niño): movimientos negativos con `reason='SALE_VOID'`, por el importe exacto que otorgó esa venta (se leen los movimientos originales con `reference_id = sale_id`).
5. **Retos:** recálculo del progreso; las recompensas ya otorgadas no se retiran.
6. **Logros:** no se revocan (B.9 #6).
7. **Racha:** replay completo tras excluir la venta. Si era la única venta de ese día, el día deja de ser `SOLD` y la cadena se reconstruye (pudiendo consumir un protector si lo había en ese momento, o romper la racha).
8. Notificación `SALE_VOIDED` al vendedor y a los niños afectados.
9. La venta **permanece visible** en el historial, marcada como anulada, y queda excluida de todos los agregados (`status='COMPLETED'` en todas las consultas de estadísticas).

### D.14 Notificaciones internas

Se crean en la misma transacción del hecho que las origina:

| Evento | Tipo | Destinatario |
|---|---|---|
| Logro desbloqueado | `ACHIEVEMENT` | el niño |
| Subida de nivel | `LEVEL_UP` | el niño |
| Reto completado | `CHALLENGE_COMPLETED` | el niño |
| Protector consumido | `PROTECTOR_USED` | el niño (se crea al detectarlo en el replay) |
| Meta al 80 % / completada | `GOAL_NEAR` / `GOAL_COMPLETED` | el niño |
| Stock ≤ mínimo tras una venta | `LOW_STOCK` | todos los padres |
| Venta anulada | `SALE_VOIDED` | vendedor + niños afectados |

Sin push del sistema operativo (§34). Campana con contador en el header; página `/notificaciones` con "marcar todas como leídas".

### D.15 Matriz de permisos

| Acción | Niño | Padre |
|---|:--:|:--:|
| Registrar venta (como sí mismo) | ✅ | ✅ |
| Ver ventas propias | ✅ | ✅ |
| Ver todas las ventas | ❌ | ✅ |
| Anular venta | ❌ | ✅ |
| Ver precios | ✅ | ✅ |
| Ver costos / utilidad del negocio | ❌ | ✅ |
| Ver su propia ganancia | ✅ | ✅ |
| CRUD productos / categorías | ❌ | ✅ |
| Registrar compras | ❌ | ✅ |
| Ajustar inventario | ❌ | ✅ |
| Ver inventario (stock) | ✅ | ✅ |
| Configurar su ahorro | ✅ | ✅ (ver) |
| Registrar retiros propios | ✅ | ✅ |
| Crear/editar sus metas | ✅ | ❌ (solo ver) |
| Canjear recompensas / comprar protector | ✅ | ❌ |
| Configurar gamificación, niveles, logros, retos, recompensas | ❌ | ✅ |
| Configurar reparto de ventas de padres | ❌ | ✅ |
| Administrar perfiles y PIN | ❌ | ✅ |
| Ver estadísticas globales | ❌ | ✅ |
| Ver estadísticas propias y ranking XP | ✅ | ✅ |

Cada Server Action empieza con `requireParent()` o `requireChildSelf(childId)`. La UI oculta lo prohibido, pero **la comprobación de servidor es la que manda**.
---

## E. Navegación

### E.1 Rutas del niño (`(child)`)

| Ruta | Contenido |
|---|---|
| `/` | **Dashboard**: saludo, ganancia total (propia / familiar), disponible, ahorro, nivel + progreso, racha + tira semanal, "Hoy", meta principal, botón **Registrar venta** |
| `/vender` | **POS** (§F) |
| `/progreso` | Nivel actual, XP, barra, lista de niveles, logros, retos activos, ranking XP (secundario), historial de XP/puntos |
| `/racha` | Racha actual, mejor racha, protectores, calendario mensual de actividad, comprar protector |
| `/premios` | Puntos disponibles, catálogo de recompensas, canjear, protectores, historial de canjes |
| `/mas` | Menú: Metas, Mi dinero, Mis ventas, Inventario, Estadísticas, Notificaciones, Ajustes, Cambiar de perfil |
| `/metas` | Lista de metas + crear/editar + aportar dinero |
| `/dinero` | Disponible, ahorro, en metas; configurar ahorro automático; mover a ahorro / sacar del ahorro; registrar retiro; extracto de movimientos |
| `/mis-ventas` | Historial de sus ventas (fecha, total, unidades, ganancia, estado) |
| `/inventario` | Solo lectura: productos disponibles con stock (sin costos) |
| `/estadisticas` | Métricas personales del §33 |
| `/notificaciones` | Bandeja |

Barra inferior fija (5 destinos): **Inicio · Vender · Progreso · Premios · Más**, con *Vender* como botón central elevado y destacado.

### E.2 Rutas del padre (`(admin)`)

| Ruta | Contenido |
|---|---|
| `/admin` | KPIs del negocio, filtros de periodo, ventas por persona, top productos, alertas de inventario y de saldos negativos |
| `/admin/vender` | POS con vendedor = el padre autenticado |
| `/admin/ventas` | Tabla filtrable de todas las ventas; `/admin/ventas/[id]` detalle + **Anular** |
| `/admin/productos` | CRUD de productos y categorías |
| `/admin/inventario` | Stock actual, ajuste manual con motivo, historial de movimientos |
| `/admin/compras` | Registrar compra, historial, costo unitario y promedio resultante |
| `/admin/perfiles` | Alta/edición de perfiles, PIN de niños, orden, activar/desactivar |
| `/admin/gamificacion` | Reglas XP/puntos, niveles, logros, retos, límite de protectores |
| `/admin/recompensas` | CRUD de recompensas (incl. protector y su precio) + canjes pendientes |
| `/admin/configuracion` | Nombre familiar, zona horaria, reparto de ganancias padres→niños, alertas |

Desktop: sidebar fija a la izquierda. Móvil: barra inferior de 5 (`Panel · Vender · Ventas · Productos · Más`) y el resto dentro de "Más".

### E.3 Autenticación

| Ruta | Contenido |
|---|---|
| `/login` | Tarjetas grandes de perfil (avatar + nombre). Niño → PIN; Padre → email/contraseña |
| `/login/nino/[id]` | `PinPad` de 4 dígitos, con bloqueo tras 5 intentos |
| `/login/padre` | Email + contraseña |

Tras entrar: `CHILD` → `/`; `PARENT` → `/admin`. El middleware redirige `/` → `/admin` si el perfil es padre, y protege `(child)` y `(admin)` por tipo.

---

## F. Diseño Mobile First

### F.1 Reglas transversales

- Ancho de diseño base **360 px**; verificar en 360, 390, 430, 768 y 1280.
- Área táctil mínima **44 × 44 px**; separación mínima 8 px entre objetivos.
- **Nada depende de hover**: los estados son `:active` y `:focus-visible`.
- Números importantes grandes (`text-3xl`/`text-4xl`, `tabular-nums`).
- `padding-bottom` seguro para barras fijas: `env(safe-area-inset-bottom)`.
- Teclado numérico propio en el POS (no `<input type="number">`, que abre teclados inconsistentes y permite basura). Donde sí haya input numérico (admin), usar `inputMode="numeric"` + `pattern="[0-9]*"`.
- En móvil, `input`, `select` y `textarea` mantienen al menos 16 px para evitar el zoom automático de iOS al recibir foco; no se restringe el zoom manual del usuario.
- Sin scroll horizontal en ninguna vista. Tablas del admin: contenedor `overflow-x-auto`.
- Listas largas: sin virtualización (el catálogo familiar es de decenas de filas).

### F.2 POS — flujo completo

**Paso 1 · Selección** (`/vender`)

```
┌───────────────────────────────┐
│ Vendiendo como  🧒 Sara       │   header compacto, sticky
│ [Todos][Barquillos][Galletas] │   chips de categoría, scroll-x
├───────────────────────────────┤
│ 🍪 Galleta Choco Negro        │
│    $ 4.000        [−] 2 [+]   │   fila 72 px, botones 44×44
├───────────────────────────────┤
│ 🥨 Barquillo Arequipe         │
│    $ 2.500        [−] 0 [+]   │
├───────────────────────────────┤
│ 🍫 Brownie                    │
│    $ 5.000        [−] 1 [+]   │
└───────────────────────────────┘
┌───────────────────────────────┐
│ 3 productos          $ 13.000 │   barra inferior fija
│      [  Registrar venta  ]    │
└───────────────────────────────┘
```

- Toda la fila (menos los botones) es tocable y suma +1: el camino rápido es tocar el producto.
- El `[−]` desaparece cuando la cantidad es 0. Cantidad en `tabular-nums`.
- Al llegar a `quantity = stock`, la fila y el botón `[+]` dejan de sumar y se muestra "Máximo disponible: 2 unidades". Con stock `0`, el producto indica "Sin existencias" y no puede agregarse.
- La barra inferior está deshabilitada mientras el carrito esté vacío.
- El carrito se guarda en `sessionStorage` (`choki:cart`) y se restaura si la pestaña se recarga.
- Búsqueda solo si hay más de 12 productos activos (evitar teclado innecesario).

**Paso 2 · Pago** (`Sheet` a pantalla completa que sube desde abajo)

```
┌───────────────────────────────┐
│ Total a cobrar                │
│        $ 13.000               │   número enorme
│  [ 💵 Efectivo ][ 📲 Transf. ] │   toggle grande
├───────────────────────────────┤
│ ¿Con cuánto te pagan?         │
│ [$13.000][$15.000][$20.000]   │   chips calculados
│ [$50.000][   Otro   ]         │
│                               │
│        Recibido: $ 20.000     │
│ ┌───────────────────────────┐ │
│ │  Debes devolver           │ │   tarjeta destacada
│ │       $ 7.000             │ │
│ └───────────────────────────┘ │
│ ☐ El cliente no quiere el     │
│   cambio  (propina $ 7.000)   │
│ ○ Devolví otra cantidad …     │
├───────────────────────────────┤
│     [ Confirmar venta ]       │
└───────────────────────────────┘
```

- **Chips de dinero recibido**: `[exacto]` + los primeros 4 valores distintos y mayores al total de la secuencia `redondear_arriba(total, k)` con `k ∈ {1.000, 2.000, 5.000, 10.000, 20.000, 50.000, 100.000}`, más `[Otro]` (abre el `CashPad`). Función pura `quickCashOptions(total)` — testeada.
- **`CashPad`**: teclado numérico propio de 12 teclas (0-9, "000", ⌫) con display grande. Sin teclado del sistema.
- "Debes devolver" es el elemento visualmente dominante del paso (fondo caramelo, `text-4xl`).
- Casilla "no quiere el cambio" ⇒ `changeGiven = 0`, propina = cambio esperado, y el bloque cambia a "Propina 🎉 $7.000".
- "Devolví otra cantidad" ⇒ `CashPad` para `changeGiven`, con `0 ≤ changeGiven ≤ changeExpected`; la propina se muestra en vivo.
- **Transferencia**: se ocultan recibido/cambio; aparece un control opcional "¿Te dieron algo de más?" para la propina.
- El botón de confirmar es `disabled` mientras `cashReceived < itemsTotal` en efectivo.

**Paso 3 · Resultado** (`SaleResultSheet`, con confeti si `app_settings.celebrations`)

```
        🎉  ¡Venta registrada!
        Vendiste $ 13.000
        Ganaste  $ 6.400
        +10 XP   +5 puntos
        🔥 Racha 5 días
        Nivel 2 · faltan 40 XP
   [ Nueva venta ]   [ Ir al inicio ]
```

Solo se muestran las filas que apliquen: un padre no ve XP/puntos/racha, sino "Se repartió: Sara $3.200 · Tomás $3.200". Si hubo propina, aparece como línea propia. Una venta nunca llega a esta hoja si alguna cantidad supera el stock disponible.

### F.3 Dashboard del niño en móvil

Orden vertical (no saturar, §28): saludo → tarjeta de ganancia (total grande + dos sub-líneas propia/familiar) → fila de dos tarjetas (Disponible | Ahorro) → tarjeta de nivel con barra → tarjeta de racha con `WeekStrip` → tarjeta "Hoy" (3 números) → tarjeta de meta principal con barra → botón **Registrar venta** fijo/prominente. Todo lo demás vive en páginas específicas.

### F.4 Página de racha

`ActivityCalendar` mensual (rejilla L-D, 7 columnas), con leyenda: 🔥 vendido, 🛡️ protegido, ⚪ sin actividad, · futuro, ✖️ rompió racha. Cabecera con racha actual, mejor racha y protectores (`🛡️🛡️🤍` = 2 de 3). Navegación mes anterior/siguiente. Botón "Comprar protector · 100 pts" deshabilitado con motivo si no aplica.

### F.5 Sistema visual

`src/app/globals.css` (Tailwind v4):

```css
@import "tailwindcss";

@theme {
  --color-choco-900: #2A1913;
  --color-choco-800: #3B241C;   /* chocolate oscuro */
  --color-choco-600: #68402D;   /* chocolate */
  --color-choco-400: #9A6A4E;
  --color-cream-50:  #FFFDF7;
  --color-cream-100: #FFF7E8;   /* crema */
  --color-cream-200: #F4E7CE;
  --color-caramel-400: #E8A45C;
  --color-caramel-500: #D98C3F; /* caramelo */
  --color-caramel-600: #BE7429;

  --color-xp-500:      #7C5CFF;  /* XP */
  --color-points-500:  #F5B301;  /* puntos */
  --color-streak-500:  #FF6B35;  /* racha */
  --color-goal-500:    #17A398;  /* metas */
  --color-success-500: #2FA84F;
  --color-danger-500:  #D64545;

  --radius-card: 1.25rem;
  --shadow-soft: 0 2px 12px rgba(59,36,28,.08);

  --font-display: "Baloo 2", system-ui, sans-serif;
  --font-sans: "Nunito", system-ui, sans-serif;
}
```

- Fondo de la app: `cream-100`. Tarjetas: `cream-50` con `radius-card` y `shadow-soft`. Texto principal: `choco-800`.
- Acción principal: `caramel-500` con texto `choco-900`; acción secundaria: contorno chocolate.
- Fuentes con `next/font/google`: **Baloo 2** (títulos y números grandes) y **Nunito** (cuerpo). Con `display: 'swap'` y subset `latin`.
- Cada concepto tiene su color fijo y siempre el mismo icono: XP ⚡ violeta, puntos 🪙 dorado, racha 🔥 naranja, meta 🎯 verde azulado, ganancia 💰 caramelo.
- **Sin modo oscuro** en el MVP (decisión: no está pedido y duplica el trabajo de estilos).
- Microanimaciones: transiciones de 150–250 ms en `transform`/`opacity`; barras de progreso animadas; `prefers-reduced-motion` respetado (sin confeti ni animaciones si está activo).
- Confeti solo en: nuevo nivel, meta completada, reto completado, logro desbloqueado y nueva mejor venta. Máximo una vez por evento.

### F.6 Componentes principales (§G)

Ver la lista completa en §G.

### F.7 Favicon, iconos e identidad

`src/assets/cookie.svg` — galleta tipo New York (base para todos los tamaños):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#FFF7E8"/>
  <circle cx="256" cy="262" r="168" fill="#C98A4B"/>
  <circle cx="256" cy="250" r="168" fill="#E0A45E"/>
  <circle cx="196" cy="196" r="30" fill="#3B241C"/>
  <circle cx="316" cy="214" r="26" fill="#3B241C"/>
  <circle cx="240" cy="300" r="34" fill="#3B241C"/>
  <circle cx="330" cy="320" r="22" fill="#3B241C"/>
  <circle cx="168" cy="286" r="20" fill="#3B241C"/>
  <circle cx="272" cy="168" r="14" fill="#5A3624"/>
  <circle cx="200" cy="352" r="16" fill="#5A3624"/>
</svg>
```

`scripts/generate-icons.ts` (usa `sharp`, dependencia **de desarrollo**) genera:

- `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (con 10 % de margen interno)
- `public/apple-touch-icon.png` (180×180)
- `public/favicon.ico` (16/32/48)
- `src/app/icon.svg` (Next lo sirve automáticamente)

`src/app/manifest.ts` y la metadata del layout raíz (`title: 'Choki'`, `description`, `themeColor: '#3B241C'`, `appleWebApp`) completan la identidad.

---

## G. Componentes principales

### G.1 Compartidos (`components/shared/`)

| Componente | Responsabilidad |
|---|---|
| `MoneyText` | Formatea COP; props `size`, `tone` (`neutral`/`positive`/`negative`), `tabular-nums` |
| `StatCard` | Icono + etiqueta + número grande + sub-línea opcional |
| `ProgressBar` | Barra con porcentaje, color por concepto, animada |
| `SectionCard` | Tarjeta base (radio, sombra, título opcional, acción a la derecha) |
| `EmptyState` | Emoji + mensaje + acción |
| `ConfirmDialog` | Confirmación destructiva (anular, archivar) con motivo opcional |
| `PeriodFilter` | Hoy / Semana / Mes / Rango; devuelve `{from,to}` en `LocalDate` |
| `PersonFilter` | Selector de perfil (admin) |
| `NotificationBell` | Contador de no leídas + acceso a la bandeja |
| `Celebrate` | Cliente; dispara `canvas-confetti` según el evento y respeta `prefers-reduced-motion` |

### G.2 POS (`components/pos/`)

`ProductRow`, `QtyStepper`, `CategoryChips`, `CartBar`, `PaymentSheet`, `CashPad`, `QuickCashChips`, `ChangeCard`, `TipToggle`, `SaleResultSheet`.

### G.3 Niño (`components/child/`)

`GreetingHeader`, `EarningsCard` (total + propia + familiar), `WalletCards` (disponible/ahorro), `LevelCard`, `StreakFlame`, `WeekStrip`, `ActivityCalendar`, `GoalCard`, `GoalContributeSheet`, `RewardCard`, `AchievementBadge`, `ChallengeCard`, `XpHistoryList`, `SavingSettingsForm`, `WithdrawSheet`, `RankingList`.

### G.4 Admin (`components/admin/`)

`KpiGrid`, `SalesTable`, `SaleDetail`, `VoidSaleDialog`, `ProductForm`, `CategoryManager`, `PurchaseForm`, `StockAdjustForm`, `InventoryTable`, `ProfileForm`, `PinForm`, `SplitConfigForm`, `RulesForm`, `LevelsEditor`, `AchievementForm`, `ChallengeForm`, `RewardForm`, `RedemptionsList`, `SimpleBarChart`.

`SimpleBarChart`: barras verticales en SVG puro (sin librería), con etiquetas y `aria-label`. Suficiente para "ventas por día/persona/producto". No se instala ninguna librería de gráficos.

### G.5 Navegación

`BottomNav` (niño y admin-móvil, con botón central elevado para *Vender*), `AdminSidebar` (≥1024 px), `MoreMenu`, `ProfileSwitcher`.
---

## H. Fases de implementación

13 fases secuenciales. **Ejecutar en orden.** Cada fase termina con la app compilando (`npm run build`) y los tests en verde (`npm test`). No se usan Issues ni Milestones de GitHub.

Convención de la fase: **Objetivo · Áreas afectadas · Funcionalidades · Dependencias · Validación · Criterio de finalización**.

---

### Fase 0 — Andamiaje del proyecto

**Objetivo.** Proyecto ejecutable con estilos, fuentes, tema y estructura de carpetas definitivos.

**Áreas.** raíz del repo, `package.json`, `src/app/layout.tsx`, `globals.css`, `src/components/ui/`, `vitest.config.ts`, `.env.local.example`, `README.md`.

**Funcionalidades.**
1. `npx create-next-app@latest choki --ts --app --tailwind --eslint --src-dir --import-alias "@/*"` (sin Turbopack obligatorio; si el flag existe, usarlo).
2. Instalar: `@supabase/supabase-js @supabase/ssr zod lucide-react canvas-confetti sonner`; dev: `vitest @types/canvas-confetti sharp tsx supabase`.
3. `npx shadcn@latest init` y añadir `button dialog sheet input tabs select sonner`. Si falla, escribirlos a mano (§B.1).
4. Tokens de `@theme` de §F.5 en `globals.css`; fuentes Baloo 2 + Nunito con `next/font/google`.
5. Crear todas las carpetas de §B.3 con un `index.ts` o placeholder donde haga falta.
6. Scripts en `package.json`: `dev`, `build`, `start`, `lint`, `test`, `test:watch`, `db:start` (`supabase start`), `db:reset` (`supabase db reset`), `types`, `seed` (`tsx scripts/seed.ts`), `icons` (`tsx scripts/generate-icons.ts`).
7. `.env.local.example` con las 5 variables de §L.2.
8. `tsconfig`: `strict: true`, `noUncheckedIndexedAccess: true`.

**Dependencias.** Ninguna.

**Validación.** `npm run dev` sirve una página con los colores y las fuentes correctos; `npm run build` pasa; `npm test` corre (0 tests).

**Criterio de finalización.** Estructura completa creada, build limpio, sin errores de TypeScript.

---

### Fase 1 — Base de datos y tipos

**Objetivo.** Esquema completo, vistas, RLS y funciones aplicadas en Supabase local, con tipos TypeScript generados.

**Áreas.** `supabase/migrations/0001_schema.sql`, `0002_views.sql`, `0003_rls.sql`, `0004_functions.sql`, `supabase/config.toml`, `src/types/database.ts`.

**Funcionalidades.**
1. `supabase init` y `supabase start`.
2. En `config.toml`: `[auth] enable_confirmations = false`, `site_url = "http://localhost:3000"`, JWT expiry 3600, refresh token rotation activado.
3. Escribir las 4 migraciones exactamente como §C.2–§C.5 (ojo al orden `goals` antes de `money_movements`).
4. `supabase db reset` para aplicarlas desde cero.
5. `npm run types`.
6. Insertar la fila única de `app_settings` en la propia migración (`insert into app_settings (id) values (1) on conflict do nothing;`).

**Dependencias.** Fase 0.

**Validación.** `supabase db reset` sin errores; `select * from app_settings;` devuelve 1 fila; `src/types/database.ts` contiene las 27 tablas y las 7 vistas; `select public.is_parent();` no lanza recursión.

**Criterio de finalización.** Migraciones idempotentes desde cero y tipos generados sin `any`.

---

### Fase 2 — Autenticación, perfiles y guards

**Objetivo.** Poder entrar como padre (email/contraseña) y como niño (PIN), con las rutas protegidas por tipo de perfil.

**Áreas.** `src/lib/supabase/{server,admin,middleware}.ts`, `src/middleware.ts`, `src/lib/auth/{session,guards,pin}.ts`, `src/app/(auth)/**`, `(child)/layout.tsx`, `(admin)/admin/layout.tsx`, `src/lib/actions/auth.ts`, `scripts/seed.ts` (parte de usuarios).

**Funcionalidades.**
1. Cliente de servidor con `createServerClient` de `@supabase/ssr` y `cookies()`; cliente admin con `service role` e `import 'server-only'`.
2. `middleware.ts` que refresca la sesión y redirige: sin sesión → `/login`; `CHILD` en `/admin/*` → `/`; `PARENT` en rutas de niño → `/admin`.
3. `getCurrentProfile()` cacheado por request con `React.cache`.
4. `requireChild()`, `requireParent()`, `requireChildSelf(childId)` — lanzan y redirigen.
5. `derivePinPassword(profileId, pin)` con `crypto.createHmac('sha256', CHILD_PIN_PEPPER)`.
6. Acciones: `loginWithPin`, `loginWithPassword`, `logout`, `setChildPin` (padre), `changeMyPin` (niño).
7. Bloqueo por intentos: 5 fallos → 5 minutos, mensaje claro con cuenta atrás.
8. `/login` con tarjetas de perfil (obtenidas con el cliente admin en el Server Component). `PinPad` grande.
9. En `scripts/seed.ts`: crear los 4 usuarios de auth con `auth.admin.createUser({ email_confirm: true })` y sus filas en `profiles`, `child_settings`, `profit_split_rules`, `child_streaks`.

**Dependencias.** Fases 0–1.

**Validación.** Entrar con PIN `1234` como niño y con email/contraseña como padre; un niño que escribe `/admin` es redirigido; tras 5 PIN erróneos aparece el bloqueo; `logout` limpia cookies.

**Criterio de finalización.** Los 4 perfiles semilla entran, las rutas están protegidas y ninguna clave sensible aparece en el bundle del cliente (`grep -r "SERVICE_ROLE" .next/static` sin resultados).

---

### Fase 3 — Capa de dominio (TypeScript puro) + tests

**Objetivo.** Todo el motor de cálculo implementado y probado **antes** de escribir una sola pantalla que dependa de él.

**Áreas.** `src/lib/domain/**`, `src/lib/domain/__tests__/**`.

**Funcionalidades.** Implementar con las firmas exactas de §D:
`dates.ts`, `money.ts`, `inventory.ts` (`applyPurchase`), `sale.ts` (`computeSaleTotals`, `computeCashOutcome`, `quickCashOptions`), `earnings.ts` (`allocateEarnings`), `savings.ts` (`splitEarning`, constructores de `money_movements`), `gamification.ts` (`xpAndPointsForSale`, `levelFor`, `evaluateAchievements`, `evaluateChallenges`), `streak.ts` (`replayStreak`).

Además, los **constructores de payload**: `buildSaleCommitPayload(...)` y `buildSaleVoidPayload(...)`, funciones puras que devuelven el objeto `jsonb` completo que consumirán `sale_commit`/`sale_void`. Son el corazón testeable de la app.

**Dependencias.** Fase 1 (solo por los tipos).

**Validación.** `npm test` con los casos de §J en verde. Ninguna función de esta carpeta importa Supabase, `next/*` ni toca `Date.now()` sin recibirlo por parámetro (regla de ESLint o revisión manual).

**Criterio de finalización.** ≥ 40 tests pasando y cobertura efectiva de las 12 reglas críticas de §J.

---

### Fase 4 — Catálogo: categorías y productos

**Objetivo.** Los padres administran el catálogo; todos pueden consultarlo.

**Áreas.** `src/lib/data/products.ts`, `src/lib/actions/products.ts`, `src/lib/schemas/product.ts`, `app/(admin)/admin/productos/**`, `app/(child)/inventario/page.tsx`, `components/admin/{ProductForm,CategoryManager}`.

**Funcionalidades.** CRUD de categorías (nombre, emoji, orden, activa) y de productos (todos los campos de §C.2 salvo `avg_cost`, que es calculado); activar/desactivar en vez de borrar cuando el producto ya tenga ventas (borrado bloqueado por FK `restrict` → mostrar mensaje claro y ofrecer desactivar); selector de emoji sencillo (lista fija de ~40 emojis de comida); vista de inventario de solo lectura para el niño alimentada por `products_public`.

**Dependencias.** Fases 1–2.

**Validación.** Crear categoría y producto; verificar que el niño ve el producto sin costo (comprobar en la respuesta del servidor que `cost` no viaja); intentar borrar un producto con ventas → mensaje, no error 500.

**Criterio de finalización.** Catálogo administrable end-to-end y visible para el niño sin costos.

---

### Fase 5 — Compras e inventario

**Objetivo.** Entrada de mercancía con costo promedio ponderado y trazabilidad de movimientos.

**Áreas.** `src/lib/data/inventory.ts`, `src/lib/actions/{purchases,inventory}.ts`, `app/(admin)/admin/compras/**`, `app/(admin)/admin/inventario/**`, `components/admin/{PurchaseForm,StockAdjustForm,InventoryTable}`.

**Funcionalidades.**
1. Registrar compra: producto, cantidad, costo total → muestra en vivo el costo unitario y el **nuevo costo promedio** antes de guardar; persiste con `purchase_commit`.
2. Historial de compras con costo unitario y promedio resultante.
3. Ajuste manual de inventario con motivo (`MERMA`, `CONSUMO`, `DANO`, `CORRECCION`, `OTRO`) y nota; escribe `inventory_movements` tipo `ADJUSTMENT` y actualiza `stock`.
4. Tabla de inventario: stock actual, mínimo, marca de bajo stock, y acceso al historial por producto.

**Dependencias.** Fases 3–4.

**Validación.** Caso del requerimiento §9: 20 unidades por $64.000 ⇒ unitario $3.200, promedio actualizado, stock +20, un movimiento registrado. Segunda compra con otro precio ⇒ promedio ponderado correcto (comparar con el test unitario).

**Criterio de finalización.** Compras y ajustes escriben inventario + movimientos de forma consistente, y el promedio coincide con `applyPurchase`.

---

### Fase 6 — POS y registro de venta (camino completo)

**Objetivo.** El caso de uso central, escribiendo **todos** sus efectos en una transacción: venta, líneas, inventario, asignaciones, billetera, XP, puntos, racha, retos, logros y notificaciones.

**Áreas.** `app/(child)/vender/page.tsx`, `app/(admin)/admin/vender/page.tsx`, `components/pos/**`, `src/lib/actions/sales.ts`, `src/lib/data/pos.ts`.

**Funcionalidades.**
1. Pantalla de selección (§F.2 paso 1) con carrito en `useReducer` + `sessionStorage`.
2. Hoja de pago (§F.2 paso 2): efectivo/transferencia, chips rápidos, `CashPad`, cambio, propina total o parcial.
3. Server Action `registerSale(input)`:
   - `requireChildSelf` o `requireParent` según quién vende;
   - lee productos (precio, `avg_cost`), `app_settings`, `child_settings`, `profit_split_rules`, `gamification_rules`, `levels`, `achievements` + desbloqueos, retos activos, días de venta y protectores del niño;
   - llama a `buildSaleCommitPayload(...)` (dominio puro);
   - ejecuta `sale_commit(payload)` con el cliente `service role`;
   - `revalidatePath` de las rutas afectadas y devuelve el resumen para la hoja de resultado.
4. Hoja de resultado (§F.2 paso 3) con celebraciones.
5. Idempotencia básica: el `sale_id` se genera en el cliente al abrir la hoja de pago y viaja con la petición; `sales.id` es PK ⇒ un doble envío falla con conflicto y se trata como "ya registrada" en vez de duplicar.
6. Control de stock en tres capas: límite visible en el carrito, validación con datos vigentes en `registerSale` y descuento condicional atómico en `sale_commit`; nunca se persiste una venta que deje stock negativo.

**Dependencias.** Fases 3–5.

**Validación.** Venta de niño: stock baja, aparece `earning_allocations` OWN_SALE, dos movimientos de XP y dos de puntos, `money_movements` con el reparto de ahorro correcto, racha +1. Venta de padre: se crean 2 asignaciones FAMILY_SHARE que suman exactamente la ganancia, sin XP ni puntos ni racha. Caso propina y caso transferencia. Intentar superar el stock desde la UI o con una petición desactualizada ⇒ se rechaza sin escribir ningún efecto. Cortar la red a mitad ⇒ no queda nada escrito a medias.

**Criterio de finalización.** Los 3 escenarios (niño/padre, efectivo/transferencia, con/sin propina) producen datos íntegros y coincidentes con los tests de dominio.

---

### Fase 7 — Billetera, ahorro y metas

**Objetivo.** El niño entiende y administra su dinero.

**Áreas.** `app/(child)/dinero/page.tsx`, `app/(child)/metas/**`, `app/(admin)/admin/perfiles/page.tsx` (solo lectura), `src/lib/actions/{wallet,goals}.ts`, `src/lib/data/wallet.ts`, `components/child/{WalletCards,SavingSettingsForm,WithdrawSheet,GoalCard,GoalContributeSheet}`, `supabase/migrations/0006_wallet_commit.sql`.

**Funcionalidades.**
1. Pantalla "Mi dinero": disponible, ahorro, en metas, ganancia histórica (con desglose propia/familiar) y extracto cronológico legible, filtrable por mes y agrupado por día.
2. Configurar ahorro automático: interruptor + porcentaje (chips 0/5/10/20/30 % + personalizado), con el aviso "solo afecta a lo que ganes desde ahora".
3. Mover a ahorro / sacar del ahorro / registrar retiro ("Usé mi dinero"), todos con validación de saldo (salvo reversiones).
4. Metas: crear, editar, pausar, completar, archivar; aportar desde disponible o desde ahorro; sacar dinero de una meta; marcar "ya la compré".
5. Autocompletado de meta al alcanzar el objetivo + notificación + celebración.
6. Vista de solo lectura de metas y billetera de cada niño en `/admin/perfiles`.
7. `wallet_commit` confirma atómicamente movimientos, autocompletado y notificaciones, y vuelve a validar los saldos para impedir dobles retiros concurrentes.

**Dependencias.** Fases 3, 6.

**Validación.** Ganancia de $20.000 con ahorro 10 % ⇒ +$2.000 ahorro y +$18.000 disponible. Cambiar a 20 % no altera lo anterior. Aportar a meta desde ahorro reduce ahorro y sube la meta. Retirar más de lo disponible se rechaza con mensaje.

**Criterio de finalización.** Los tres bolsillos siempre cuadran: `disponible + ahorro + metas = ganancia histórica − retiros − gastos de meta`.

---

### Fase 8 — Gamificación: progreso, racha, premios

**Objetivo.** Todas las pantallas de gamificación del niño y su configuración administrativa.

**Áreas.** `app/(child)/{progreso,racha,premios}/page.tsx`, `app/(admin)/admin/{gamificacion,recompensas}/**`, `src/lib/actions/{gamification,rewards,streak}.ts`, `components/child/**`, `components/admin/{RulesForm,LevelsEditor,AchievementForm,ChallengeForm,RewardForm,RedemptionsList}`.

**Funcionalidades.**
1. `/progreso`: nivel + barra, lista de niveles con estado, logros (desbloqueados / pendientes / ocultos), retos activos con progreso, ranking XP entre hermanos (discreto, al final), historial de XP y puntos con su descripción.
2. `/racha`: cabecera, `ActivityCalendar` mensual, 3 protectores gratuitos iniciales, consumo y reposición por compra sin superar 3; `ensureStreakUpToDate` al entrar.
3. `/premios`: puntos, catálogo, canje, compra de protector, historial de canjes.
4. Admin: editar reglas de XP/puntos, CRUD de niveles, logros (con selector de condición y, si es `PRODUCT_UNITS`, de producto), retos, recompensas (incluido el protector y su precio) y `protector_max`; lista de canjes con marcar entregado / cancelar (devolviendo puntos).

**Dependencias.** Fases 3, 6.

**Validación.** Un niño nuevo inicia con 3 protectores gratuitos; tras consumirlos puede reponerlos por canje hasta volver a 3; canjear con puntos insuficientes se rechaza; comprar protector con el máximo alcanzado se rechaza; el calendario refleja 🔥/🛡️/✖️ según el replay; cambiar `SALE_COMPLETED` a 20 XP afecta solo a ventas futuras.

**Criterio de finalización.** Toda la gamificación es configurable desde la app y ninguna cifra de XP/puntos/nivel/precio está codificada en el frontend.

---

### Fase 9 — Dashboards y estadísticas

**Objetivo.** Responder "¿cómo voy?" al niño y "¿cómo va el negocio?" al padre.

**Áreas.** `app/(child)/page.tsx`, `app/(child)/estadisticas/page.tsx`, `app/(child)/mis-ventas/page.tsx`, `app/(admin)/admin/page.tsx`, `app/(admin)/admin/ventas/**`, `src/lib/data/stats.ts`, `components/admin/{KpiGrid,SalesTable,SimpleBarChart}`.

**Funcionalidades.**
1. Dashboard del niño exactamente con los bloques de §F.3.
2. Estadísticas personales: los 16 indicadores de §33 del requerimiento.
3. Dashboard admin: ventas totales, ganancia, unidades, valor de inventario, ventas por periodo, utilidad por periodo, ventas por persona (niños vs padres), ganancia propia de cada niño, ganancia familiar distribuida, top productos, alertas de bajo stock y de saldos negativos.
4. `PeriodFilter` (hoy/semana/mes/rango) y `PersonFilter`, aplicados en las consultas (no en el cliente).
5. Historial de ventas con detalle (líneas, pago, cambio, propina, costo, utilidad, reparto).

**Dependencias.** Fases 6–8.

**Validación.** Los totales del dashboard coinciden con la suma manual de las ventas semilla; las ventas `VOIDED` no aparecen en ningún agregado; los filtros de periodo respetan `local_date` y la zona horaria.

**Criterio de finalización.** Ambos dashboards cargan en < 1 s con los datos semilla y sus cifras son verificables a mano.

---

### Fase 10 — Anulación de ventas y configuración

**Objetivo.** Cerrar el ciclo de corrección y dejar la configuración global editable.

**Áreas.** `src/lib/actions/{sales,settings,profiles}.ts`, `app/(admin)/admin/ventas/[id]/page.tsx`, `app/(admin)/admin/configuracion/page.tsx`, `app/(admin)/admin/perfiles/**`, `components/admin/{VoidSaleDialog,SplitConfigForm,ProfileForm,PinForm}`.

**Funcionalidades.**
1. `voidSale(saleId, reason)` según §D.13, vía `sale_void`, con vista previa de lo que se va a revertir antes de confirmar.
2. Configuración: nombre familiar, zona horaria, alertas, celebraciones, `protector_max`, y el reparto padres→niños con validación de suma = 100.
3. Perfiles: crear/editar niño o padre (creación del usuario de auth incluida), reordenar, activar/desactivar, fijar PIN.
4. Alertas del dashboard admin para saldos negativos tras anulaciones.

**Dependencias.** Fases 6–9.

**Validación.** Anular una venta de niño con propina y ahorro activo: stock vuelve, saldos y XP/puntos vuelven al valor previo (comprobar antes/después), racha recalculada, venta visible como anulada, logros conservados. Anular una venta de padre revierte las dos participaciones.

**Criterio de finalización.** Tras anular todas las ventas semilla de un niño, sus saldos, XP y puntos vuelven exactamente a cero (salvo lo que hubiera gastado, que queda en negativo y se muestra la alerta).

---

### Fase 11 — PWA, identidad e iconos

**Objetivo.** Instalable en el celular, con la galleta como icono.

**Áreas.** `src/assets/cookie.svg`, `scripts/generate-icons.ts`, `public/**`, `src/app/manifest.ts`, `src/app/layout.tsx`, `components/RegisterSW.tsx`, `public/sw.js`.

**Funcionalidades.** SVG de §F.7; generación de PNG/ICO; manifest; service worker mínimo con handler `fetch`; registro del SW; metadata y `apple-touch-icon`; `viewport` con `viewportFit: 'cover'` y `themeColor`.

**Dependencias.** Fase 0 (se puede adelantar, pero se cierra aquí).

**Validación.** Lighthouse → *Installable* ✅; en Chrome Android aparece "Añadir a pantalla de inicio"; el icono se ve correcto en la pantalla de inicio y en la pestaña; abrir desde el icono lanza en modo `standalone`.

**Criterio de finalización.** App instalable con iconos de galleta en todos los tamaños.

---

### Fase 12 — Pulido móvil, accesibilidad y QA final

**Objetivo.** Que la experiencia en celular sea excelente y el MVP esté verificado punto por punto.

**Áreas.** transversal.

**Funcionalidades.**
1. Revisión a 360 / 390 / 430 / 768 / 1280 px de todas las pantallas: sin scroll horizontal, objetivos ≥ 44 px, barras fijas con `safe-area`.
2. Estados vacíos, de carga (`loading.tsx` por segmento) y de error (`error.tsx`) en todas las rutas.
3. `prefers-reduced-motion`, contraste AA en texto sobre crema y sobre caramelo, `aria-label` en los controles del POS, foco visible.
4. Recorrer el **checklist §K** completo con los datos semilla.
5. `README.md` final con §L.

**Dependencias.** Todas.

**Validación.** Checklist §K al 100 %.

**Criterio de finalización.** Los 35 resultados esperados del §57 del requerimiento se pueden demostrar en local.

---

## I. Seeds — `scripts/seed.ts`

Script idempotente (`--reset` borra y recrea) ejecutado con `tsx`, usando el cliente `service role`. Crea:

**Configuración**

- `app_settings`: `family_name = 'Familia Guzmán'`, `timezone = 'America/Bogota'`, `currency = 'COP'`, `protector_max = 3`.

**Perfiles** (usuarios de auth + `profiles`)

| Nombre | Tipo | Acceso | Emoji |
|---|---|---|---|
| Manuel | PARENT | `manuel@choki.local` / `choki1234` | 👨 |
| Mamá | PARENT | `mama@choki.local` / `choki1234` | 👩 |
| Niño A | CHILD | PIN `1234` | 🧒 |
| Niño B | CHILD | PIN `5678` | 👦 |

> Los nombres de los niños son marcadores: se cambian desde `/admin/perfiles`.

- `child_settings`: Niño A → ahorro automático **activo al 10 %**; Niño B → desactivado (para probar ambos caminos).
- `profit_split_rules`: Niño A 50 %, Niño B 50 %.
- `child_streaks`: fila inicial en cero para cada niño.

**Categorías**: Barquillos 🥨, Galletas 🍪, Brownies 🍫, Chocolates 🍬, Otros ✨.

**Productos** (5, según §47)

| Producto | Cat. | Precio | Stock inicial | Mín. |
|---|---|---|---|---|
| Barquillo Arequipe 🥨 | Barquillos | 2.500 | 0 | 10 |
| Barquillo Chocolate 🥨 | Barquillos | 2.500 | 0 | 10 |
| Galleta Chocolate Negro 🍪 | Galletas | 4.000 | 0 | 6 |
| Galleta Chips 🍪 | Galletas | 4.000 | 0 | 6 |
| Brownie 🍫 | Brownies | 5.000 | 0 | 4 |

**Compras semilla** (para que exista `avg_cost` real; se registran vía la misma lógica de dominio)

- Galleta Chocolate Negro: 20 uds por $64.000 ⇒ unitario $3.200 (caso literal del requerimiento).
- Galleta Chips: 20 uds por $60.000 ⇒ $3.000.
- Barquillo Arequipe: 30 uds por $45.000 ⇒ $1.500.
- Barquillo Chocolate: 30 uds por $45.000 ⇒ $1.500.
- Brownie: 12 uds por $36.000 ⇒ $3.000.

**Gamificación**

- `gamification_rules`: `SALE_COMPLETED` 10 XP / 5 pts; `UNIT_SOLD` 2 XP / 1 pt.
- `levels` (3): 1 "Aprendiz" 🐣 0 XP · 2 "Vendedor" 🚀 100 XP · 3 "Experto" 🏆 300 XP.
- `achievements` (3): `FIRST_SALE` "Primera venta" 🥇 `TOTAL_SALES ≥ 1` (+20 XP, +10 pts); `TEN_UNITS` "10 productos" 📦 `TOTAL_UNITS ≥ 10` (+30 XP, +15 pts); `STREAK_3` "3 días seguidos" 🔥 `STREAK_DAYS ≥ 3` (+50 XP, +25 pts).
- `challenges` (1): "Vender 10 unidades esta semana" `UNITS_SOLD ≥ 10`, lunes→domingo de la semana en curso, +50 XP / +25 pts.
- `rewards` (2): "Protector de racha" 🛡️ 100 pts, `type='STREAK_PROTECTOR'`, stock ilimitado; "30 min extra de pantalla" 📺 200 pts, `type='NORMAL'`.

**Metas** (1 por niño, para poblar el dashboard): Niño A → "Audífonos" 🎧 $350.000; Niño B → "Patineta" 🛹 $200.000. Ambas `ACTIVE` y `is_primary`.

**Ventas semilla** (opcional pero recomendado, flag `--with-sales`): 6 ventas repartidas en los últimos 5 días — 4 de niños (una con propina, una por transferencia) y 2 de padres — para que dashboards, rachas y estadísticas tengan datos visibles desde el primer arranque. Se registran llamando a la **misma** función `registerSale` para garantizar que la semilla es consistente con la lógica real.

Todos estos datos son temporales y no representan la configuración final del negocio.

---

## J. Testing

`vitest`, solo sobre `src/lib/domain/**`. Sin tests de UI, sin e2e, sin cobertura objetivo. Prioridad: reglas que mueven dinero o progreso.

### J.1 Casos obligatorios

**`money.test.ts`**
1. `round` es half-up en `.5`.
2. `distribute(7000, [50,50])` ⇒ `[3500,3500]`.
3. `distribute(7001, [50,50])` ⇒ `[3501,3500]` y suma exacta.
4. `distribute(100, [33.33,33.33,33.34])` suma 100.
5. `formatCOP(20000)` sin decimales y con separador de miles.

**`dates.test.ts`**
6. `toLocalDate` de `2026-01-01T02:30:00Z` con `America/Bogota` ⇒ `2025-12-31`.
7. `addDays` cruzando fin de mes y fin de año.
8. `weekDays` empieza en lunes.

**`inventory.test.ts`**
9. Primera compra: 20 uds / $64.000 ⇒ `unitCost = avgCost = 3200`, stock 20.
10. Segunda compra a otro precio ⇒ promedio ponderado correcto a 2 decimales.
11. Compra con stock negativo previo ⇒ pondera con base 0.

**`sale.test.ts`**
12. Totales, costo y margen de un carrito de 3 líneas con `unitCost` decimal.
13. Cambio: total 17.000, recibido 20.000, devuelto 3.000 ⇒ cambio 3.000, propina 0.
14. Propina total: devuelto 0 ⇒ propina 3.000, `earnings_total = margen + 3.000`.
15. Propina parcial: devuelto 1.000 ⇒ propina 2.000.
16. Transferencia: sin cambio, con propina explícita.
17. La propina no altera `items_total` ni el costo.
18. `quickCashOptions(17000)` devuelve valores crecientes, todos ≥ total, sin duplicados.
18 bis. Construir una venta con cantidad superior al stock ⇒ error antes de generar el payload.

**`earnings.test.ts`**
19. Venta de niño ⇒ 1 asignación `OWN_SALE` con el 100 % de margen y propina.
20. Venta de padre 50/50 ⇒ 2 asignaciones que suman exactamente margen y propina.
21. Reparto 70/30 con importe impar ⇒ suma exacta (mayor resto).
22. Venta de padre no genera XP ni puntos ni racha.

**`savings.test.ts`**
23. Ganancia 20.000 con 10 % ⇒ 2.000 ahorro / 18.000 disponible.
24. Ahorro desactivado ⇒ todo a disponible.
25. Cambiar de 10 % a 20 % no modifica movimientos previos.
26. Aporte a meta desde ahorro: deltas correctos en los tres bolsillos.
27. Retiro mayor al disponible ⇒ error de validación.

**`gamification.test.ts`**
28. Venta con 4 unidades ⇒ 10+8 XP y 5+4 puntos, en 2 movimientos cada uno.
29. `levelFor` en el límite exacto de XP requerido.
30. `levelFor` con XP superior al último nivel ⇒ `next = null`, 100 %.
31. Logro `TOTAL_UNITS ≥ 10` se desbloquea una sola vez.
32. Logro oculto no se lista hasta desbloquearse.
33. Reto completado otorga recompensa una sola vez aunque se recalcule el progreso.

**`streak.test.ts`**
34. 3 días consecutivos de venta ⇒ racha 3, mejor 3.
35. Hueco de 1 día sin protector ⇒ racha 0 y día `MISSED`.
36. Hueco de 1 día con protector ⇒ racha conservada, día `PROTECTED`, protector consumido.
37. El día en curso sin venta **no** consume protector ni rompe la racha.
38. Protector comprado hoy protege hoy al cerrar el día.
39. Dos huecos con un solo protector ⇒ el segundo rompe.
40. `bestStreak` se conserva tras romperse la racha actual.
41. Replay tras eliminar el único día de venta ⇒ la cadena se reconstruye correctamente.
42. Los protectores no exceden `maxProtectors`.

**`void.test.ts`** (sobre `buildSaleVoidPayload`)
43. Reversión de una venta de niño: deltas de dinero espejo exacto (incluido el reparto de ahorro).
44. Reversión de XP y puntos por el importe exacto que otorgó la venta.
45. Reversión de una venta de padre ⇒ dos `EARNING_REVERSAL`.
46. La reversión puede dejar el disponible negativo sin lanzar error.
47. Los logros desbloqueados no aparecen en el payload de reversión.

### J.2 Comando

`npm test` en cada fase. Si un test falla, la fase no está terminada.
---

## K. Checklist final del MVP

Recorrer con los datos semilla, en un celular real o en el emulador de dispositivos de Chrome a 390 px. Cada línea corresponde a los resultados esperados del §57 del requerimiento.

**Acceso y perfiles**

- [ ] 1. Entrar como padre con email/contraseña y como niño con PIN; "Cambiar de perfil" funciona.
- [ ] 2. Un niño no puede abrir ninguna ruta `/admin` (redirección) ni ejecutar una acción de padre (error del servidor).

**Catálogo, compras e inventario**

- [ ] 3. Crear, editar, desactivar una categoría y un producto.
- [ ] 4. Registrar una compra: costo unitario y nuevo costo promedio correctos; stock actualizado; movimiento registrado.
- [ ] 5. Ajustar inventario con motivo; queda trazado en el historial.
- [ ] 6. El niño ve el inventario sin costos.

**Ventas**

- [ ] 7. Registrar una venta desde el POS móvil con ≤ 5 toques desde el inicio.
- [ ] 8. Pago en efectivo: "Debes devolver" correcto y visible.
- [ ] 9. Propina total ("quédate el cambio"): cambio 0, propina registrada aparte, precios intactos.
- [ ] 10. Propina parcial correcta.
- [ ] 11. Pago por transferencia sin cálculo de cambio.
- [ ] 12. Costo y utilidad calculados con el costo del momento; cambiar el costo del producto después **no** altera la utilidad histórica.
- [ ] 13. Venta de padre: se distribuye 50/50, sin XP ni puntos ni racha para los niños.
- [ ] 14. El dashboard del niño separa ganancia propia, familiar y total.
- [ ] 15. Al alcanzar el stock disponible, el POS bloquea más unidades; una petición desactualizada también se rechaza sin efectos parciales.

**Dinero del niño**

- [ ] 16. Disponible, ahorro y metas cuadran con el extracto.
- [ ] 17. Ahorro automático al 10 % reparte correctamente una ganancia nueva.
- [ ] 18. Cambiar el porcentaje no afecta al pasado.
- [ ] 19. Mover a ahorro, sacar del ahorro y registrar un retiro.
- [ ] 20. Crear una meta desde el perfil del niño, aportarle dinero y completarla.

**Gamificación**

- [ ] 21. Ganar XP y puntos por una venta propia, con historial explicativo ("+10 XP — Venta #A1B2").
- [ ] 22. Subir de nivel dispara notificación y celebración.
- [ ] 23. La racha sube con ventas de días distintos y la tira semanal lo refleja.
- [ ] 24. Un día sin venta ya cerrado consume un protector y el calendario lo marca 🛡️.
- [ ] 25. Sin protectores, la racha se rompe y el día se marca como roto.
- [ ] 26. Comprar un protector con puntos; se bloquea al llegar al máximo.
- [ ] 26a. Un niño nuevo recibe 3 protectores gratuitos; después de consumir uno puede comprar uno y volver a 3, nunca a 4.
- [ ] 27. Canjear una recompensa descuenta puntos y aparece en el historial.
- [ ] 28. Configurar niveles, reglas de XP/puntos, logros, retos y recompensas desde el admin, y que el cambio se refleje.

**Corrección y paneles**

- [ ] 29. Anular una venta: inventario, dinero, ahorro, distribución, XP, puntos, racha y estadísticas revertidos; la venta sigue visible como anulada.
- [ ] 30. Dashboard admin con KPIs, filtros por periodo y persona, top de productos y alertas de inventario.
- [ ] 31. Estadísticas personales del niño completas.

**Experiencia y entrega**

- [ ] 32. Todas las pantallas se ven bien a 360 px, sin scroll horizontal y con objetivos táctiles cómodos.
- [ ] 33. La app se instala como PWA y abre en modo standalone.
- [ ] 34. Favicon, icono PWA y apple-touch-icon muestran la galleta.
- [ ] 35. `README.md` permite a alguien más levantar el proyecto de cero en local siguiendo solo el documento.

**Técnico**

- [ ] 36. `npm run build` sin errores ni warnings de TypeScript.
- [ ] 37. `npm test` en verde.
- [ ] 38. `SUPABASE_SERVICE_ROLE_KEY` y `CHILD_PIN_PEPPER` no aparecen en el bundle del cliente.
- [ ] 39. RLS activo en las 27 tablas; una consulta con la clave anónima y sin sesión no devuelve datos.

---

## L. Ejecución local

### L.1 Requisitos

- Node.js ≥ 20.11 y npm
- Docker Desktop en marcha (para el stack local de Supabase)
- Supabase CLI (se instala como dependencia de desarrollo: `npx supabase …`)

### L.2 Variables de entorno — `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key que imprime `supabase start`>
SUPABASE_SERVICE_ROLE_KEY=<service_role key que imprime `supabase start`>
CHILD_PIN_PEPPER=<cadena aleatoria larga: `openssl rand -hex 32`>
NEXT_PUBLIC_APP_NAME=Choki
```

`SUPABASE_SERVICE_ROLE_KEY` y `CHILD_PIN_PEPPER` **nunca** llevan el prefijo `NEXT_PUBLIC_`. `.env.local` está en `.gitignore`; se versiona solo `.env.local.example`.

### L.3 Puesta en marcha

```bash
npm install
npm run db:start        # supabase start  (imprime las claves; cópialas al .env.local)
npm run db:reset        # aplica las migraciones desde cero
npm run types           # genera src/types/database.ts
npm run icons           # genera favicon e iconos PWA desde el SVG
npm run seed            # crea usuarios, catálogo, compras y configuración
# npm run seed -- --with-sales   # añade ventas de ejemplo
npm run dev             # http://localhost:3000
```

### L.4 Cómo probarla

1. Abrir `http://localhost:3000` → `/login`.
2. Entrar como **Niño A** con PIN `1234`: dashboard, registrar una venta en efectivo con propina, ver XP/puntos/racha, crear una meta, aportarle dinero.
3. Cerrar sesión y entrar como **Manuel** (`manuel@choki.local` / `choki1234`): revisar el dashboard, registrar una compra, registrar una venta como padre y comprobar el reparto, anular una venta.
4. Probar desde el celular en la misma red: `npm run dev -- -H 0.0.0.0` y abrir `http://<ip-del-pc>:3000`. Para instalar la PWA en Android hace falta HTTPS o `localhost`; para la prueba de instalación, usar el emulador de dispositivos de Chrome en el propio equipo.

### L.5 Migraciones y schema

- Nueva migración: crear `supabase/migrations/000N_descripcion.sql` y `npm run db:reset` (local) — el reset reaplica todo desde cero, que es lo correcto mientras no haya datos de producción.
- Tras cualquier cambio de esquema: `npm run types`.

### L.6 Fallback sin Docker

Si Docker no está disponible: crear un proyecto gratuito en supabase.com, apuntar `NEXT_PUBLIC_SUPABASE_URL` y las claves a ese proyecto, aplicar las migraciones con `npx supabase db push --linked` (o pegando todo el SQL en el editor en orden numérico) y ejecutar `npm run seed`. `npm run types` pasa a ser `supabase gen types typescript --linked`.

### L.7 Documentación que debe quedar en el `README.md`

Requisitos, variables (tabla con descripción y si es secreta), puesta en marcha, comandos disponibles, credenciales semilla, estructura de carpetas, dónde vive cada regla de negocio, cómo añadir una migración y cómo cargar seeds.

---

## M. Preparación para producción (documentar, **no** ejecutar ahora)

Queda pendiente para una fase posterior, fuera de este plan:

1. **Supabase**: crear el proyecto definitivo, elegir región (`us-east` es la más cercana para Colombia entre las habituales), guardar las claves.
2. **Migraciones**: `supabase link --project-ref <ref>` y `supabase db push`. Ejecutar el seed **sin** `--with-sales` y con los nombres y precios reales.
3. **Variables en Vercel**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CHILD_PIN_PEPPER`, `NEXT_PUBLIC_APP_NAME` (las dos secretas, solo como *Environment Variable* de servidor).
4. **Repositorio**: subir a GitHub y conectar el repo a Vercel (framework detectado: Next.js; sin configuración especial de build).
5. **Auth**: en Supabase, fijar `Site URL` y `Redirect URLs` al dominio de Vercel; mantener las confirmaciones de email desactivadas.
6. **Build**: `npm run build` corre en Vercel automáticamente en cada push a `main`.
7. **Después del primer despliegue**: cambiar los PIN y las contraseñas semilla, ajustar precios, costos y reparto reales, y revisar que `protector_max` y los precios de recompensas sean los que la familia quiere.

No se implementa despliegue, CI/CD, observabilidad ni entornos de staging en esta iteración.

---

## N. Fuera de alcance (recordatorio para el implementador)

No construir, ni siquiera "por si acaso": pagos online, pasarelas, facturación, impuestos, contabilidad de doble partida, CRM, proveedores, órdenes de compra, multi-familia, multi-tenancy, RBAC configurable, microservicios, Redis, colas, Kubernetes, observabilidad enterprise, CI/CD elaborado, apps nativas, offline real, push notifications, integraciones bancarias, IA, recomendaciones, BI avanzado, marketplace ni funciones sociales.

Ante cualquier duda de alcance, la respuesta por defecto es **no incluirlo**.

---

## O. Instrucción de ejecución

Ejecutar las fases 0 → 12 en orden. Al terminar cada fase: `npm run build` y `npm test`. No pasar a la siguiente fase con el build roto o tests en rojo. No crear Issues ni Milestones. No desplegar.
