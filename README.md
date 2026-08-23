# Choki

Aplicación web mobile first para administrar un emprendimiento familiar y convertir el ciclo de venta, ganancia y progreso en una experiencia educativa.

## Estado

La Fase 0 deja listo el andamiaje técnico. La base de datos, autenticación y funcionalidades del producto se implementan en las fases siguientes de `PLAN.md`.

## Requisitos

- Node.js 20.11 o superior
- npm
- Docker Desktop (se utilizará desde la Fase 1 para Supabase local)

## Inicio rápido

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). La página inicial permite comprobar el tema chocolate/crema/caramelo y las fuentes Baloo 2 y Nunito.

## Variables de entorno

Copia `.env.local.example` a `.env.local` cuando se implemente la integración con Supabase.

| Variable | Uso | Secreta |
|---|---|:---:|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto local de Supabase | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública para sesiones | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Escrituras privilegiadas desde servidor | Sí |
| `CHILD_PIN_PEPPER` | Derivación segura de los PIN infantiles | Sí |
| `NEXT_PUBLIC_APP_NAME` | Nombre visible de la aplicación | No |

Las variables secretas nunca deben llevar el prefijo `NEXT_PUBLIC_`.

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia Next.js en desarrollo |
| `npm run build` | Genera el build de producción local |
| `npm start` | Sirve un build generado |
| `npm run lint` | Ejecuta ESLint |
| `npm test` | Ejecuta Vitest una vez |
| `npm run test:watch` | Ejecuta Vitest en modo observación |
| `npm run db:start` | Inicia Supabase local |
| `npm run db:reset` | Reaplica las migraciones locales |
| `npm run types` | Genera tipos TypeScript desde Supabase local |
| `npm run seed` | Carga los datos semilla (se implementa más adelante) |
| `npm run icons` | Genera los iconos de la PWA (se implementa en la Fase 11) |

## Estructura

- `src/app`: rutas y layouts de Next.js.
- `src/components`: primitivos UI y componentes por área.
- `src/lib`: autenticación, acceso a datos, acciones y dominio puro.
- `supabase/migrations`: esquema y funciones de PostgreSQL desde la Fase 1.
- `scripts`: semillas e iconos en sus fases correspondientes.

La fuente de verdad del alcance es `PLAN.md`. `PROJECT_STATUS.md` conserva el checkpoint vivo de ejecución.
