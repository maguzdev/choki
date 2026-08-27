# Contexto funcional de gamificación (implementación actual)

> Documento de referencia para configurar Choki. Describe lo que el código, la base de datos y la UI permiten **hoy**; no define valores recomendados ni añade alcance.
>
> Alcance verificado: acciones de servidor, lógica de dominio, migraciones de Supabase, esquema de validación, componentes administrativos e interfaces infantiles. Cuando un documento histórico discrepa, prevalece esta implementación.

## Lectura rápida

- La gamificación se aplica únicamente a ventas **completadas por un niño**. Las ventas registradas por un adulto reparten dinero entre niños, pero no generan XP, puntos, logros, retos ni racha.
- XP y puntos son dos saldos independientes, calculados como suma de movimientos. La XP sirve para niveles y ranking; los puntos sirven para canjear premios y protectores.
- Las únicas reglas base por venta configurables son: una por venta completada y otra por cada unidad vendida. No hay reglas configurables por monto, producto, método de pago, propina, margen, hora u otros eventos.
- Logros y retos pueden conceder XP y puntos adicionales al completarse. Se evalúan durante el registro de una venta infantil.
- Los protectores de racha tienen capacidad máxima de 3. Todo niño recibe tres gratuitos al crearse; los protectores comprados solo reponen espacios libres, nunca aumentan esa capacidad.
- En la puesta en producción se usó la semilla `--access-only`: crea perfiles y configuración técnica mínima, **no** crea reglas, niveles, logros, retos ni premios. Por tanto, esos elementos deben configurarse por el administrador antes de usarlos. La UI muestra dos filas de reglas vacías/inactivas para poder crearlas, pero eso no significa que existan en la base de datos hasta guardar.

## 1. Reglas de ventas, dinero, XP y puntos

### Venta que entra en gamificación

Una venta debe tener al menos una línea, productos activos y stock suficiente. La aplicación bloquea tanto en servidor como en la operación transaccional el registro de una venta que deje inventario negativo. Solo se procesa gamificación si el vendedor es el mismo niño autenticado y la venta queda `COMPLETED`.

Las ventas de padre/adulto no crean movimientos de XP ni puntos, ni evalúan niveles, logros, retos o racha. Sí distribuyen la ganancia entre los niños activos según el reparto familiar configurado.

Al anular una venta, se revierten inventario y dinero. También se crean movimientos negativos para los movimientos de XP y puntos que tengan como referencia esa venta. La racha y el progreso de retos se reconstruyen usando las ventas restantes. Los logros ya desbloqueados no se eliminan automáticamente: el reconocimiento y su premio permanecen.

### Reglas configurables existentes

La tabla `gamification_rules` y la pantalla **Administración > Gamificación > Reglas por venta** solo admiten estas dos reglas, una de cada una:

| Evento interno | Nombre visible | Cálculo si está activa |
|---|---|---|
| `SALE_COMPLETED` | Venta completada | Otorga el XP y los puntos configurados una sola vez por venta. |
| `UNIT_SOLD` | Cada unidad vendida | Otorga el XP y los puntos configurados multiplicados por el total de unidades de toda la venta. |

Cada regla tiene tres parámetros: `xp_amount`, `points_amount` y `active`. XP y puntos son enteros entre 0 y 1.000.000. Desactivar la regla evita que genere ambos movimientos; dejarla activa con valor 0 no concede saldo.

No existe multiplicador automático por precio, costo, ganancia, categoría, producto, método de pago, propina, racha, nivel, logro previo ni día de la semana. Tampoco hay tope diario, semanal o por venta, ni límite de veces que se puede aplicar una regla más allá de una vez por evento dentro de la venta.

Los cambios a estas reglas solo influyen en ventas futuras. El sistema guarda movimientos inmutables por venta y no recalcula el historial cuando se modifica una regla.

### Fórmula real de XP y puntos

Para una venta infantil nueva:

```text
XP = Σ(regla activa de venta completada)
   + Σ(regla activa por unidad × unidades totales)
   + Σ(recompensas de logros desbloqueados con esa venta)
   + Σ(recompensas de retos completados por primera vez con esa venta)

Puntos = misma estructura, usando los valores de puntos
```

Cada fuente genera un movimiento separado en `xp_movements` o `point_movements`, con su razón y referencia. Los saldos mostrados son la suma de todos los movimientos, por lo que una anulación o la devolución de un canje puede restar o devolver saldo.

Los movimientos posibles ya definidos internamente son:

| Recurso | Razones actualmente generadas por los flujos | Otras razones permitidas por el modelo |
|---|---|---|
| XP | `SALE`, `UNITS`, `ACHIEVEMENT`, `CHALLENGE`, `SALE_VOID` | `STREAK_MILESTONE`, `ADJUSTMENT` |
| Puntos | `SALE`, `UNITS`, `ACHIEVEMENT`, `CHALLENGE`, `REDEMPTION`, `PROTECTOR_PURCHASE`, `SALE_VOID`, `ADJUSTMENT` | Ninguna adicional a esas. |

`STREAK_MILESTONE` (XP) y `ADJUSTMENT` (XP/puntos) existen como valores permitidos de base de datos, pero no hay UI ni acción administrativa actual que los cree. Tampoco hay una recompensa automática de hitos de racha implementada.

### Utilidad, reparto y propinas

Estos cálculos son funcionalmente independientes de XP y puntos, salvo que `TOTAL_PROFIT` y `PROFIT_AMOUNT` los usan como métrica de logro/reto.

1. Para cada producto se toma `avg_cost` si es mayor que cero; si no, `cost`. Ese costo queda copiado como `unit_cost` en el detalle de venta.
2. `items_total` = suma de cantidad × precio de venta.
3. `cost_total` = suma de cantidad × costo unitario guardado.
4. `margin_total` = `items_total - cost_total`.
5. La propina depende del pago:
   - Efectivo: dinero recibido menos cambio entregado menos total de artículos. No se permite recibir menos que el total ni entregar más cambio del que corresponde.
   - Transferencia: el usuario registra una propina no negativa.
6. `earnings_total` = `margin_total + tip_total`.

No se permite confirmar una venta cuya utilidad final (`margin_total + tip_total`) sea negativa. El costo recuperado no se reparte como ganancia: queda registrado en `cost_total` como capital de reposición. La ganancia repartible es margen más propina.

En venta propia de un niño, el 100 % de esa ganancia se asigna a ese niño (`OWN_SALE`). En venta de adulto, se distribuye entre todos los niños activos con `profit_split_rules`; sus porcentajes deben sumar exactamente 100 %. La distribución redondea a pesos enteros de forma determinista. Cada asignación pasa por la configuración individual de ahorro automático del niño (`child_settings`), que divide su ganancia entre disponible, ahorro y, si aplica, meta. Este reparto no modifica XP ni puntos.

### Configurable desde UI frente a interno

Desde la UI de gamificación el administrador puede cambiar XP, puntos y activación de las dos reglas. Desde Configuración también puede cambiar el reparto de ganancia familiar y cada perfil infantil configura su ahorro automático; ambos afectan dinero, no puntuación.

El catálogo interno admite razones de ajuste y de hito de racha, pero no ofrece interfaz para crear esas transacciones. La fórmula de venta usa automáticamente cantidad total, costo promedio, propina y reparto, pero ninguno de ellos es una condición configurable de una regla de XP/puntos.

## 2. Niveles

Un nivel (`levels`) tiene:

| Campo | Uso |
|---|---|
| `number` | Número entero positivo y único que ordena el camino de niveles. |
| `name` | Nombre visible, de 2 a 80 caracteres. |
| `xp_required` | XP acumulada necesaria para alcanzar el nivel; entero de 0 a 1.000.000. |
| `icon` | Emoji/texto visible, obligatorio, máximo 16 caracteres. |
| `description` | Descripción opcional, máximo 500 caracteres. |
| `benefit` | Texto opcional mostrado al niño como beneficio; no activa una regla ni privilegio técnico. |
| `active` | Define si participa en el cálculo y se muestra al niño. |

El nivel actual se determina con los niveles activos ordenados por `number` (en empate, por `xp_required`): se usa el último cuyo `xp_required` sea menor o igual a la XP acumulada. Si la XP está por debajo del primer umbral, se muestra igualmente el primer nivel activo, con progreso 0 %. El siguiente nivel es el siguiente de ese orden. Al llegar al último, el progreso se muestra al 100 % y no hay siguiente nivel.

Al cruzar de un nivel a otro durante una venta infantil, se crea una notificación `LEVEL_UP` y puede activar la celebración visual de resultado de venta. Subir de nivel no otorga puntos, dinero, protectores ni permisos por sí mismo; `benefit` es únicamente texto informativo.

El administrador puede crear, editar, activar/desactivar y eliminar niveles. No puede eliminar el último nivel activo: debe quedar como mínimo uno. La base impone que `number` sea único, pero no obliga a que los umbrales de XP sean crecientes ni a que exista un nivel en 0 XP; esas coherencias deben respetarse al configurar.

## 3. Logros

### Estructura y condiciones

Un logro (`achievements`) tiene código único, nombre, descripción opcional, icono, condición, objetivo, producto opcional, recompensa de XP, recompensa de puntos, secreto, activo y orden. El código se valida como 2–50 caracteres con mayúsculas, números y `_` (`[A-Z0-9_]+`).

Las condiciones que se pueden seleccionar son:

| Valor | Nombre UI | Métrica exacta |
|---|---|---|
| `TOTAL_SALES` | Ventas totales | Número de ventas infantiles `COMPLETED` históricas del niño, incluida la actual. |
| `TOTAL_UNITS` | Unidades totales | Suma histórica de `units_total` de esas ventas, incluida la actual. |
| `TOTAL_PROFIT` | Ganancia propia | Suma histórica de `earnings_total` de ventas propias, incluida la actual: margen + propina. |
| `STREAK_DAYS` | Mejor racha | Mayor racha reconstruida del niño, teniendo en cuenta protectores. |
| `PRODUCT_UNITS` | Unidades de producto | Unidades históricas vendidas del producto elegido en ventas propias. Requiere `product_id`. |
| `GOALS_COMPLETED` | Metas completadas | Cantidad histórica de metas del niño con estado `COMPLETED`. |

El objetivo (`target_value`) es numérico positivo; puede incluir decimales por validación, aunque las métricas de ventas, unidades, días y metas son enteras. Los premios `xp_reward` y `points_reward` son enteros de 0 a 1.000.000.

### Evaluación y desbloqueo

En cada venta propia se reconstruyen las métricas con las ventas completadas previas y la venta que se está registrando. Se evalúan los logros activos no desbloqueados; si `métrica >= target_value`, cada uno se desbloquea una única vez. Se inserta `achievement_unlocks` con combinación única de logro y niño, se generan los movimientos de XP/puntos configurados y una notificación. Un mismo registro de venta puede desbloquear varios logros.

Un logro secreto (`hidden = true`) sí se evalúa normalmente y sí entrega sus premios. Antes de desbloquearse, la UI infantil oculta icono, nombre y descripción y muestra “Logro secreto”; al desbloquearse revela la información.

Los logros se evalúan solo al registrar una venta infantil. Por ello, crear un logro cuya meta ya está cumplida no genera retroactivamente el desbloqueo; deberá ocurrir una venta posterior para que se evalúe. Del mismo modo, cambios de configuración no recalculan premios históricos.

El administrador puede crear, editar, activar/desactivar y borrar. Si un logro ya tiene al menos un desbloqueo, no puede borrarse: debe desactivarse para conservar el reconocimiento histórico. Desactivarlo evita nuevas evaluaciones, pero no borra desbloqueos ni movimientos ya otorgados.

## 4. Retos

Un reto (`challenges`) tiene nombre, descripción opcional, icono, fecha inicial/final, condición, objetivo, producto opcional, premio de XP, premio de puntos y estado.

### Estados y periodo

- `DRAFT`: se puede configurar, no se evalúa ni se muestra al niño.
- `ACTIVE`: se evalúa únicamente si la fecha local de la venta está entre `starts_on` y `ends_on`, inclusivos. Es el único estado mostrado como reto activo al niño.
- `FINISHED`: no se evalúa ni se muestra como activo.

La fecha final no puede ser anterior a la inicial. Al abrir la sección de administración de gamificación, las reglas activas cuyo fin ya pasó se marcan como `FINISHED`. No hay tarea programada autónoma: este cambio ocurre al entrar a esa página administrativa.

### Condiciones y valor calculado

| Valor | Nombre UI | Valor acumulado dentro del periodo del reto |
|---|---|---|
| `SALES_COUNT` | Cantidad de ventas | Número de ventas propias completadas. |
| `UNITS_SOLD` | Unidades vendidas | Suma de unidades de ventas propias. |
| `PROFIT_AMOUNT` | Ganancia propia | Suma de `earnings_total`: margen + propinas de ventas propias. |
| `ACTIVE_DAYS` | Días activos | Número de fechas locales distintas con al menos una venta propia. |
| `PRODUCT_UNITS` | Unidades de producto | Unidades propias del producto seleccionado. Requiere `product_id`. |

El objetivo es un número positivo; los premios de XP y puntos son enteros entre 0 y 1.000.000. Los retos no permiten elegir por UI un niño, una categoría, método de pago, importe vendido, racha actual u objetivos de metas. Todo reto activo aplica potencialmente a todos los niños.

### Completado, premios y anulación

Durante una venta infantil se calcula el valor acumulado del periodo, incluido el efecto de esa venta. Se completa cuando `current_value >= target_value`. `challenge_progress` guarda un progreso por combinación reto-niño; el premio se concede una sola vez, controlado por `rewarded`.

Cuando se completa por primera vez, se agregan sus movimientos de XP/puntos y una notificación. El progreso continúa guardándose aunque ya esté completado. Al anular una venta, el sistema recalcula el valor y puede quitar `completed_at` si ya no alcanza la meta, pero mantiene `rewarded`: el premio ya dado no se revierte por esa recalculación. La anulación sí revierte los movimientos de XP/puntos directamente asociados a la venta anulada; los premios de reto tienen referencia al reto, no a esa venta, por lo que no se revierten automáticamente.

Un reto con cualquier fila de progreso no puede eliminarse; debe marcarse `FINISHED` para conservar historial. Puede editarse incluso si tiene progreso; el sistema no recalcula recompensas pasadas.

## 5. Recompensas y canjes

El catálogo `rewards` solo usa puntos, nunca XP ni dinero. Cada premio contiene:

| Campo | Comportamiento |
|---|---|
| `name`, `description`, `icon`, `image_url` | Información visible. Nombre 2–100; icono obligatorio hasta 16; imagen opcional debe ser URL válida. |
| `cost_points` | Costo entero de 0 a 1.000.000 puntos. Puede costar 0. |
| `type` | `NORMAL` o `STREAK_PROTECTOR`. |
| `stock` | Entero >= 0 o `null`. Vacío significa ilimitado; 0 significa agotado. |
| `active` | Solo los activos aparecen y se pueden canjear. |
| `sort_order` | Orden de presentación; entero >= 0. |

Al solicitar un canje, se muestra confirmación. La operación se vuelve a validar y bloquear en base de datos para evitar carreras: premio activo, stock, puntos actuales y, para protector, capacidad. Si procede, descuenta inmediatamente `cost_points` mediante un movimiento negativo de puntos.

- **Premio normal:** crea un canje `PENDING`. Un adulto puede añadir una nota y marcarlo `DELIVERED`, o `CANCELLED`. Cancelar devuelve exactamente los puntos gastados y repone una unidad de stock si el stock era limitado.
- **Protector de racha:** crea un canje ya `DELIVERED`, registra compra de protector y agrega uno inmediatamente. No requiere confirmación posterior de adulto. También descuenta puntos y reduce stock si era limitado.

Un premio no se puede eliminar si ya tiene canjes; debe desactivarse para mantener su historial. Los canjes guardan el nombre y los puntos usados al momento de canjear, por lo que el historial no cambia si luego se edita el premio.

## 6. Rachas y protectores

La racha pertenece a cada niño y está ligada a sus ventas propias completadas por fecha local de `app_settings.timezone`.

1. Un día con una o más ventas propias es `SOLD` y aumenta la racha actual en un día. La cantidad de ventas no multiplica la racha.
2. Para un día pasado sin venta, si ya había una racha en curso y hay protector disponible, el día se marca `PROTECTED`, consume un protector y la racha no se corta.
3. Si no hay protector, se marca `MISSED` y la racha actual pasa a 0.
4. El día actual sin venta no se marca todavía como perdido: puede venderse durante el resto del día. La evaluación al día siguiente decide su estado.
5. `best_streak` guarda el mayor valor histórico reconstruido. `last_activity_date` se actualiza solo en días vendidos.

La aplicación reconstruye la racha desde las ventas y eventos de protectores al registrar venta, abrir Progreso/Racha/Premios o intentar canjear un premio. No depende únicamente de un contador incremental.

### Protectores

- Todo perfil infantil nuevo recibe un evento `GRANT` de 3 protectores gratuitos, una sola vez, y comienza con hasta tres disponibles. La migración también aseguró este regalo para niños existentes.
- `protector_max` está en configuración global, permite solo 0–3 y por defecto es 3. Se muestra en **Configuración familiar** y de forma duplicada en **Gamificación > Protectores**; ambas actualizan el mismo campo `app_settings.protector_max`.
- No se permite bajar el máximo por debajo de los protectores que tenga cualquier niño en ese momento.
- Un premio tipo `STREAK_PROTECTOR` repone exactamente uno y solo puede canjearse cuando el niño tiene menos protectores que el máximo. Por tanto, no compra capacidad adicional.
- Un protector comprado crea `protector_events` tipo `PURCHASE`, con cantidad 1 y puntos gastados. La reconstrucción limita siempre el saldo al máximo configurado.
- El modelo permite eventos `GRANT` de cantidad positiva, pero la UI no permite conceder protectores manualmente ni configurar otros regalos iniciales.

Racha, logros y retos se relacionan de forma limitada: la mejor racha es una condición de logro; no existe una condición de reto por racha ni reglas base de XP/puntos por racha. Los protectores pueden comprarse con puntos y se obtienen desde el catálogo de recompensas.

## 7. Inventario de configuración administrativa

Las opciones se encuentran en **Administración > Configuración**, **Gamificación** y **Recompensas**. Todas requieren perfil de padre/adulto. Los formularios se presentan colapsados por defecto, incluida la creación de registros nuevos.

| Nombre visible | Campo/modelo interno | Tipo y valores permitidos | Predeterminado técnico | Comportamiento que modifica | Dependencias |
|---|---|---|---|---|---|
| Venta completada | `gamification_rules.event = SALE_COMPLETED`; `xp_amount`, `points_amount`, `active` | Enteros 0–1.000.000 y booleano | Base de datos: 0/0/activa si se crea; producción actual sin fila hasta guardar | XP/puntos una vez por venta propia infantil | Solo ventas `COMPLETED` de niño |
| Cada unidad vendida | `gamification_rules.event = UNIT_SOLD`; mismos campos | Enteros 0–1.000.000 y booleano | Igual al anterior | XP/puntos por unidad total de venta propia infantil | Solo ventas `COMPLETED` de niño |
| Límite por niño / Capacidad máxima de protectores | `app_settings.protector_max` | Entero 0–3 | 3 | Capacidad de protectores, consumo y compras | No puede ser menor que el saldo actual máximo de los niños; aparece en dos pantallas |
| Nivel | `levels` | Número positivo único; nombre 2–80; XP 0–1.000.000; icono 1–16; descripción/beneficio opcionales <=500; activo | Fila nueva: icono ⭐, activo; no hay niveles en semilla de producción | Camino y nivel visible del niño | Debe existir al menos un nivel activo; `number` único; umbrales no se validan entre sí |
| Logro | `achievements` | Código único 2–50 `[A-Z0-9_]+`; nombre 2–100; condición enumerada; objetivo >0; producto solo para `PRODUCT_UNITS`; XP/puntos 0–1.000.000; secreto/activo; orden >=0 | Nuevo: icono 🏅, no secreto, activo, orden 0 | Evaluación y premio único por niño | Producto debe estar seleccionado para unidades de producto; no se borra si hay desbloqueos |
| Reto | `challenges` | Nombre 2–100; fechas válidas y ordenadas; condición enumerada; objetivo >0; producto solo para `PRODUCT_UNITS`; XP/puntos 0–1.000.000; `DRAFT`/`ACTIVE`/`FINISHED` | Nuevo: icono 🎯, fechas de hoy, `DRAFT` | Progreso y premio único por niño dentro de fechas | Solo activos y vigentes se evalúan; no se borra si existe progreso |
| Premio | `rewards` | Nombre 2–100; icono 1–16; URL opcional; costo 0–1.000.000; `NORMAL`/`STREAK_PROTECTOR`; stock entero >=0 o vacío; activo; orden >=0 | Nuevo: icono 🎁, tipo normal, stock ilimitado, activo, orden 0 | Catálogo y canjes con puntos | Protector respeta `protector_max`; no se borra si ya fue canjeado |
| Entregado / Cancelar y devolver | `redemptions.status`, `note` | Solo canje `PENDING` a `DELIVERED` o `CANCELLED`; nota opcional hasta 300 | Pendiente para normal; entregado para protector | Entrega o devolución de puntos/stock de premio normal | Solo adultos; un canje ya atendido no cambia |
| Reparto familiar | `profit_split_rules.percent` por niño activo | Número 0–100; total exacto 100 | La semilla de acceso asigna 50/50 a los dos niños iniciales | Distribuye margen + propina de ventas de adulto | Requiere al menos un niño activo; no afecta XP/puntos |
| Ahorro automático infantil | `child_settings.auto_saving_enabled`, `saving_percent` | Booleano y porcentaje 0–100 | En semilla acceso: Niño A 10 %, Niño B 0 % | Divide la ganancia monetaria asignada al niño | No afecta XP, puntos, niveles, retos ni rachas |
| Zona horaria | `app_settings.timezone` | Zona IANA válida | `America/Bogota` | Fecha local de ventas, retos, rachas, historial y caducidad | Afecta toda evaluación basada en fecha |
| Celebraciones | `app_settings.celebrations` | Booleano | `true` | Permite o evita la celebración visual de resultado | No cambia cálculo o saldos |

También están `family_name`, `low_stock_alerts` y `currency` (COP, mostrado deshabilitado). Son configuración general/inventario y no modifican mecánicas de gamificación; se incluyen para dejar claro que no son parámetros de reglas.

## 8. Modelo actual relevante

### Entidades persistentes

| Área | Tablas y relación funcional |
|---|---|
| Ventas | `sales` es cabecera con vendedor, fecha local, pago, totales, costo, margen, propina, utilidad, unidades y estado. `sale_items` preserva producto/precio/costo de cada línea. `inventory_movements` registra salida o reversión. |
| Dinero | `earning_allocations` guarda distribución de utilidad por niño. `money_movements` conserva disponible, ahorro y meta. `profit_split_rules` y `child_settings` determinan el reparto monetario. |
| Reglas y niveles | `gamification_rules` tiene solo los dos eventos fijos. `levels` define umbrales de XP. |
| XP y puntos | `xp_movements` y `point_movements` son el libro mayor de cada saldo, con razón, referencia y descripción. El saldo no se almacena como campo independiente. |
| Logros | `achievements` define condición y premio; `achievement_unlocks` registra una concesión única por niño. |
| Retos | `challenges` define periodo/condición/premios; `challenge_progress` guarda valor, fecha de terminación y si ya entregó premio, único por reto-niño. |
| Recompensas | `rewards` define catálogo; `redemptions` registra petición, costo pagado, estado y nota. |
| Rachas | `child_streaks` es estado reconstruido; `streak_days` guarda día vendido/protegido/perdido; `protector_events` es el historial de regalos y compras. |
| Configuración global | `app_settings` contiene zona horaria, protector máximo y celebraciones, entre otros. |

### Tipos/enums de negocio efectivos

- Vendedor: `CHILD` o `PARENT`.
- Venta: `COMPLETED` o `VOIDED`; pago `CASH` o `TRANSFER`.
- Regla: `SALE_COMPLETED` o `UNIT_SOLD`.
- Condición de logro: `TOTAL_SALES`, `TOTAL_UNITS`, `TOTAL_PROFIT`, `STREAK_DAYS`, `PRODUCT_UNITS`, `GOALS_COMPLETED`.
- Condición de reto: `SALES_COUNT`, `UNITS_SOLD`, `PROFIT_AMOUNT`, `ACTIVE_DAYS`, `PRODUCT_UNITS`.
- Reto: `DRAFT`, `ACTIVE`, `FINISHED`.
- Premio: `NORMAL`, `STREAK_PROTECTOR`; canje `PENDING`, `DELIVERED`, `CANCELLED`.
- Día de racha: `SOLD`, `PROTECTED`, `MISSED`; evento protector: `PURCHASE`, `GRANT`.

Las funciones de dominio que implementan estas reglas son `xpAndPointsForSale`, `levelFor`, `evaluateAchievements`, `evaluateChallenges`, `replayStreak`, `computeSaleTotals` y `allocateEarnings`. Los commits críticos se ejecutan mediante RPCs de Supabase (`sale_commit`, `sale_void`, `reward_redeem`, `redemption_update`, `streak_refresh`) para guardar sus efectos relacionados de forma transaccional.

### Diferencia relevante con semilla/documentación histórica

El script de semilla completo contiene valores de demostración (por ejemplo, reglas 10/5 y 2/1, tres niveles, tres logros, un reto y dos premios). Esos valores **no son valores obligatorios del sistema ni la configuración actual de producción**, porque el despliegue se hizo con `--access-only`, que termina antes de insertar esa configuración funcional. La única configuración de gamificación inicial garantizada para cada niño es el estado técnico de racha y tres protectores gratuitos.

## 9. Matriz final de capacidades

| Área | Capacidad | Implementada | Configurable desde UI | Parámetros disponibles | Restricciones |
|---|---|---:|---:|---|---|
| Ventas | Registrar venta, calcular costo/margen/propina, repartir utilidad y anular | Sí | Parcial | Reparto familiar, ahorro automático, zona horaria | Stock no negativo; utilidad final no negativa; reparto de adulto suma 100 %; venta adulta no gamifica |
| XP | Otorgar por reglas, logros y retos; revertir por anulación; niveles/ranking | Sí | Sí, para importes de reglas/logros/retos | Dos reglas, premios de logro/reto, niveles | Solo niños; enteros 0–1.000.000; sin topes, multiplicadores ni condiciones adicionales configurables |
| Puntos | Otorgar por reglas/logros/retos y gastar/devolver en canjes | Sí | Sí, para importes y costos | Dos reglas, premios de logro/reto, costo de premio | Solo niños; saldo debe alcanzar para canjear; sin topes o multiplicadores configurables |
| Niveles | Determinar nivel por XP acumulada y avisar al subir | Sí | Sí | Número, nombre, umbral XP, icono, descripción, beneficio, activo | Al menos un nivel activo; número único; no se validan umbrales crecientes |
| Logros | Evaluar hitos históricos y conceder una vez | Sí | Sí | Seis condiciones, objetivo, producto cuando aplica, XP, puntos, secreto, activo, orden | Se evalúan solo al vender; no retroactivos; no se borran con desbloqueos |
| Retos | Acumular actividad en periodo y premiar una vez | Sí | Sí | Cinco condiciones, fechas, objetivo, producto cuando aplica, XP, puntos, estado | Solo activos/vigentes; globales para todos los niños; no se borran con progreso |
| Recompensas | Canjear puntos por premio normal o protector | Sí | Sí | Nombre, descripción, icono/imagen, costo, tipo, stock, activo, orden; entrega/cancelación | Puntos suficientes; stock; premio normal pendiente de adulto; no se borra con canjes |
| Rachas | Contar días vendidos, consumir/reponer protectores y medir mejor racha | Sí | Parcial | Máximo 0–3 y premios de tipo protector | Solo ventas propias infantiles; tres gratuitos iniciales; compra repone uno sin superar máximo; sin retos/reglas base por racha |
