# Base de Datos CarbonTrCK

Este directorio contiene la version base del modelo de datos en PostgreSQL para CarbonTrCK, incluyendo:

- `database.sql`: esquema inicial completo en PostgreSQL.
- `seed_catalogs.sql`: catalogos base recomendados.
- `MODELO_BD.md`: modelo conceptual, logico y fisico.
- `OPERACION_Y_SEGURIDAD.md`: reglas de seguridad, transacciones, respaldo y operacion.
- `MIGRACIONES_Y_PRUEBAS.md`: control de cambios, pruebas funcionales y validacion tecnica.

## Alcance del modelo

La base esta disenada para:

- captura operativa de consumos, actividades y emisiones;
- calculo y trazabilidad de CO2e por scope, categoria, campus y area;
- gestion de usuarios, roles, permisos, evidencias y auditoria;
- metas institucionales y exportacion de reportes;
- analitica con modelos de ML:
  - `XGBoost` como predictor principal;
  - `Isolation Forest` para deteccion de anomalias;
  - `Prophet` para tendencias y proyecciones mensuales.

## Motor objetivo

- PostgreSQL 15+ recomendado.
- Extensiones requeridas:
  - `pgcrypto`
  - `citext`
  - `btree_gist`

## Orden recomendado de uso

1. Revisar `MODELO_BD.md`.
2. Ejecutar `database.sql` en una base vacia.
3. Ejecutar `seed_catalogs.sql`.
4. Aplicar roles y politicas operativas descritas en `OPERACION_Y_SEGURIDAD.md`.
5. Adoptar el flujo de cambios definido en `MIGRACIONES_Y_PRUEBAS.md`.
