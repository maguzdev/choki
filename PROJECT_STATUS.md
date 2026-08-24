# Estado del proyecto

- **Fase actual:** Fase 3 — Capa de dominio (TypeScript puro) + tests (completada; QA manual confirmado).
- **Fases completadas:** Fase 0 — Andamiaje; Fase 1 — Base de datos y tipos; Fase 2 — Autenticación, perfiles y guards; Fase 3 — Capa de dominio (TypeScript puro) + tests.
- **Funcionalidades implementadas:** motor puro de fechas locales, dinero y reparto por mayor resto; costo promedio de compras; totales, costos, margen, cambio, propina y opciones rápidas de venta; atribución de ganancias propias y familiares; ahorro automático y constructores de movimientos de billetera; XP, puntos, niveles, logros y retos; replay determinista de rachas y protectores; payloads completos y tipados para registrar y anular ventas en una transacción.
- **Validaciones realizadas:** 47/47 casos obligatorios de §J en verde con Vitest ✅; firmas y reglas críticas contrastadas de nuevo con §D y §J ✅; `npx tsc --noEmit` ✅; `npm run lint` ✅; `npm run build` ✅; ausencia de imports de Supabase/`next/*` y de tiempo implícito en `src/lib/domain/**` ✅; `git diff --check` ✅.
- **Decisiones o desviaciones:** ninguna respecto al alcance. Los constructores reciben fecha e identificadores explícitos para conservar pureza y devuelven filas completas tipadas con los `Row` generados en la Fase 1. Esta fase no añade pantallas ni persistencia nueva.
- **Pendientes conocidos:** ninguno dentro de la Fase 3.
- **Siguiente fase:** Fase 4 — Catálogo: categorías y productos (no iniciada).
