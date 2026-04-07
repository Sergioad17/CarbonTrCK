# Operacion y Seguridad

## 1. Roles minimos en PostgreSQL

Separar cuentas tecnicas. La aplicacion no debe conectarse como superusuario.

- `ct_owner`: dueno del esquema y migraciones.
- `ct_app_rw`: lectura y escritura operativa.
- `ct_app_ro`: lectura para reportes o BI.
- `ct_backup`: solo respaldo.
- `ct_analyst`: lectura analitica controlada.

## 2. Politica de privilegios

- solo `ct_owner` crea, altera o elimina objetos;
- `ct_app_rw` usa `SELECT`, `INSERT`, `UPDATE` sobre tablas operativas;
- `ct_app_ro` solo `SELECT`;
- `ct_backup` solo permisos necesarios para backup;
- revocar privilegios por defecto a `PUBLIC`.

## 3. Lineamientos de aplicacion

- usar siempre consultas parametrizadas;
- no interpolar SQL;
- validar datos antes de persistir;
- no exponer cadenas de conexion;
- guardar secretos en un gestor de secretos o variables de entorno seguras;
- rotar credenciales periodicamente;
- registrar eventos de acceso y acciones criticas.

## 4. Transacciones criticas

Estas operaciones deben ejecutarse en una sola transaccion:

- alta de `record` + enlace de `files` + insercion de `record_revisions` + `audit_events`;
- aprobacion o rechazo de `record` + actualizacion de estado + `audit_events`;
- generacion de `exports` + asociacion de `files` + actualizacion de estado;
- ejecucion de `ml_model_runs` + salida en `ml_predictions` o `monthly_forecasts`;
- revision humana de `anomaly_detections`.

## 5. Aislamiento recomendado

- `READ COMMITTED` para operacion comun;
- `REPEATABLE READ` para procesos de cierre o consolidacion de reportes;
- `SERIALIZABLE` solo en operaciones excepcionales de alta criticidad.

## 6. Respaldo y recuperacion

Minimo operativo recomendado:

- respaldo logico diario con `pg_dump`;
- respaldo fisico programado si la instalacion crece;
- WAL archivado para recuperacion a punto en el tiempo;
- prueba de restauracion al menos mensual;
- verificacion de integridad posterior a restauracion;
- retencion definida por politica institucional.

## 7. Particionamiento

No se activa por defecto. Solo considerar si `records`, `audit_events` o `monthly_forecasts` alcanzan volumen alto sostenido.

Estrategia sugerida si se requiere:

- particion por rango mensual o anual sobre `record_date` en `records`;
- particion por `created_at` en `audit_events`;
- validar antes impacto sobre llaves, mantenimiento e indices.

## 8. Borrado y retencion

- `records` usa borrado logico con `deleted_at`;
- la evidencia y auditoria no deben eliminarse sin politica formal;
- si se requiere depuracion, hacerla con procedimientos controlados y bitacora.

## 9. Ejemplo de bootstrap de seguridad

```sql
REVOKE ALL ON SCHEMA public FROM PUBLIC;

CREATE ROLE ct_owner LOGIN;
CREATE ROLE ct_app_rw LOGIN;
CREATE ROLE ct_app_ro LOGIN;
CREATE ROLE ct_backup LOGIN;
CREATE ROLE ct_analyst LOGIN;

GRANT USAGE ON SCHEMA public TO ct_app_rw, ct_app_ro, ct_backup, ct_analyst;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO ct_app_rw;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ct_app_ro, ct_analyst, ct_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO ct_app_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO ct_app_ro, ct_analyst, ct_backup;
```

## 10. Reglas operativas

- no editar la base manualmente en produccion;
- todo cambio de esquema debe entrar por migracion;
- toda version nueva debe pasar pruebas de integridad y restauracion;
- monitorear crecimiento, tiempos de consulta y bloqueos;
- documentar cada cambio relevante del modelo.
