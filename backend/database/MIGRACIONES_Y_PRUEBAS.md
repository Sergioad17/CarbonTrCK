# Migraciones y Pruebas

## 1. Estrategia de migraciones

El archivo `database.sql` debe considerarse la migracion inicial base.

Reglas:

1. Nunca modificar produccion manualmente.
2. Cada cambio nuevo debe crear una migracion incremental.
3. Cada migracion debe incluir:
   - objetivo;
   - cambio de esquema;
   - posible backfill;
   - validacion posterior;
   - rollback cuando aplique.

Convencion sugerida:

- `001_init_postgresql.sql`
- `002_add_x_feature.sql`
- `003_fix_constraint_y.sql`

## 2. Casos minimos de prueba

### Integridad

- insertar `record` con `area_id` de otro `campus` debe fallar;
- insertar `asset` fijo sin `area_id` debe fallar;
- insertar `emission_factor` con periodos traslapados debe fallar;
- insertar `record` con `approved_by` sin `approved_at` debe fallar;
- insertar `target` por `area` sin `campus` debe fallar;
- insertar `ml_model` con `target_metric_id` y `target_unit_id` incompatibles debe fallar.

### Duplicidad

- duplicar `users.email` dentro de la misma organizacion debe fallar;
- duplicar `record_files` para el mismo par debe fallar;
- duplicar `serial_number` en el mismo `campus` debe fallar;
- duplicar forecast mensual por misma combinacion logica debe fallar.

### Negocio

- `reduction_percent` sin `baseline_value` debe fallar;
- `monthly_forecasts` con limites invertidos debe fallar;
- `ml_predictions` sin cantidad ni CO2e debe fallar;
- `notifications.read_at` anterior a `created_at` debe fallar.

### Rendimiento basico

- consulta por rango de fechas en `records`;
- agregados por `scope`, `category`, `campus`, `area`;
- busqueda de `audit_events` por `entity_id`;
- obtencion de `monthly_forecasts` por `model_id` y mes.

## 3. Concurrencia

Simular al menos:

- dos usuarios editando el mismo `record`;
- un usuario aprobando mientras otro intenta actualizar;
- ejecucion de export mientras se agregan nuevos registros;
- corrida ML concurrente con insercion operativa.

## 4. Restauracion

Validar en ambiente de prueba:

- restauracion completa desde backup;
- restauracion a punto en el tiempo si se usa WAL;
- consistencia de conteos por tabla;
- validez de llaves foraneas;
- lectura de evidencia y auditoria despues de restaurar.

## 5. Benchmarks minimos

- tiempo promedio de insercion de `records`;
- tiempo de consulta agregada mensual;
- crecimiento esperado anual de `records`, `audit_events`, `files` y `monthly_forecasts`;
- costo de indices mas pesados;
- necesidad real de particionamiento.

## 6. Checklist final de liberacion

- modelo conceptual, logico y fisico documentado;
- esquema PostgreSQL ejecutable;
- catalogos iniciales definidos;
- roles y privilegios definidos;
- backups y restore probados;
- migracion versionada;
- pruebas de integridad aprobadas;
- pruebas de concurrencia revisadas;
- metricas de rendimiento base registradas.
