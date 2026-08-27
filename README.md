# Choki

Aplicación web mobile first para que una familia gestione ventas, inventario, ganancias, ahorro, metas y gamificación de un emprendimiento infantil.

## Requisitos

- Node.js 20.11 o superior y npm.
- Docker Desktop en ejecución para Supabase local.

## Variables de entorno

Copia `.env.local.example` como `.env.local` y completa las claves que muestra `npm run db:start`.

| Variable | Uso | Secreta |
|---|---|:---:|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de Supabase local | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sesiones del usuario | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Escrituras del servidor | Sí |
| `CHILD_PIN_PEPPER` | Derivación segura de PIN infantiles | Sí |
| `NEXT_PUBLIC_APP_NAME` | Nombre visible | No |

Las variables secretas nunca llevan el prefijo `NEXT_PUBLIC_`.

## Puesta en marcha

```bash
npm install
npm run db:start
npm run db:reset
npm run types
npm run icons
npm run seed
# Para una base de producción vacía: crea solo los perfiles iniciales y la configuración técnica mínima.
# npm run seed -- --access-only
# npm run seed -- --with-sales
npm run dev
```

Abre `http://localhost:3000`. Para probar desde un celular de la misma red, inicia con `npm run dev -- -H 0.0.0.0` y usa la IP local que muestra Next.js.

Para medir una experiencia similar a producción, sin compilaciones en caliente por ruta:

```bash
npm run build
npm start
```

El modo `npm run dev` usa Turbopack. La primera visita a una ruta puede compilarla y tardar más; las siguientes cargas son mucho más rápidas.

## Credenciales semilla

| Perfil | Acceso |
|---|---|
| Manuel | `manuel@choki.local` / `choki1234` |
| Mamá | `mama@choki.local` / `choki1234` |
| Niño A | PIN `1234` |
| Niño B | PIN `5678` |

Los datos semilla son temporales y se pueden reemplazar desde el administrador.

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Desarrollo con Turbopack |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build de producción |
| `npm run lint` | ESLint |
| `npm test` | Tests de dominio con Vitest |
| `npm run db:start` | Inicia Supabase local |
| `npm run db:reset` | Reaplica migraciones locales |
| `npm run types` | Genera tipos desde Supabase local |
| `npm run seed` | Carga configuración y datos semilla |
| `npm run seed -- --access-only` | Crea solo perfiles iniciales y configuración técnica mínima |
| `npm run seed -- --production --access-only` | Usa `.env.production.local` para inicializar acceso en Supabase producción |
| `npm run icons` | Genera favicon e iconos PWA |

## Estructura y reglas

- `src/app`: rutas, layouts, estados de carga y error.
- `src/components`: interfaz compartida y componentes por área.
- `src/lib/domain`: cálculos puros de dinero, inventario, ventas, ahorro, gamificación y racha; se prueban con Vitest.
- `src/lib/data`: lecturas desde Supabase con la sesión actual.
- `src/lib/actions`: casos de uso de escritura protegidos por guards.
- `supabase/migrations`: esquema, vistas y RPC transaccionales.
- `scripts/seed.ts`: datos de prueba; `scripts/generate-icons.ts`: iconos PWA.

Las ventas se registran y anulan mediante RPC atómicas. La regla de reparto, ahorro, stock, XP, puntos, retos y racha vive en la capa de dominio y Server Actions; el navegador no accede directamente a Supabase.

## Migraciones y datos

Para un cambio de esquema, crea una nueva migración numerada en `supabase/migrations/`, aplica `npm run db:reset` en local y ejecuta `npm run types`. No modifiques migraciones ya aplicadas fuera del entorno local.

`npm run seed` es idempotente. Para reiniciar por completo los datos de desarrollo, usa el flujo de reset local y vuelve a ejecutar el seed.

## PWA y actualización

Choki puede añadirse a la pantalla de inicio en iOS. Android requiere HTTPS para una instalación PWA completa cuando se accede desde una IP local; con HTTP solo puede ofrecer un acceso directo.

El encabezado incluye un botón **Actualizar** para recuperar la información actual. No se implementa un gesto propio de arrastrar para actualizar porque puede interferir con el desplazamiento y el botón ofrece una alternativa accesible.

`PLAN.md` es la fuente de verdad del alcance; `PROJECT_STATUS.md` conserva el checkpoint de implementación.
