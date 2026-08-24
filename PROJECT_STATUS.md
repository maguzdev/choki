# Estado del proyecto

- **Fase actual:** Fase 1 — Base de datos y tipos (completada; ejecución detenida).
- **Fases completadas:** Fase 0 — Andamiaje; Fase 1 — Base de datos y tipos.
- **Funcionalidades implementadas:** Supabase local configurado; 27 tablas; 7 vistas; RLS en todas las tablas; 27 políticas exclusivamente de lectura; RPC `sale_commit`, `sale_void`, `purchase_commit` y `streak_sync`; helper `is_parent`; fila única de `app_settings`; tipos TypeScript generados.
- **Validaciones realizadas:** `supabase db reset` ✅; `supabase db lint` ✅; 27 tablas/7 vistas/27 tablas con RLS/0 políticas de escritura ✅; `app_settings` con 1 fila ✅; `is_parent()` sin recursión ✅; privilegios efectivos (`authenticated` solo lectura, `service_role` escritura, `anon` sin lectura) ✅; tipos con 27 tablas, 7 vistas y 0 usos de `any` ✅; `npm run lint` ✅; `npm test` ✅ (0 pruebas, esperado hasta la Fase 3); `npm run build` ✅; `git diff --check` ✅.
- **Decisiones o desviaciones:** El plan llegó como `PLAN_1.md` y se renombró a `PLAN.md` sin cambiar contenido. Se añadieron grants explícitos en `0003_rls.sql` porque Supabase CLI actual ya no expone entidades nuevas por defecto; preservan el modelo previsto: RLS gobierna lectura y `service_role` escritura. El seed SQL local queda desactivado porque el plan usa `scripts/seed.ts` en fases posteriores.
- **Pendientes conocidos:** Ninguno dentro de la Fase 1. No se implementó autenticación, perfiles ni seeds, que pertenecen a la Fase 2.
- **Siguiente fase:** Fase 2 — Autenticación, perfiles y guards.
