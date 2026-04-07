BEGIN;

INSERT INTO emission_scopes (code, name, description)
VALUES
  ('scope1', 'Scope 1', 'Emisiones directas'),
  ('scope2', 'Scope 2', 'Electricidad comprada'),
  ('scope3', 'Scope 3', 'Otras emisiones indirectas')
ON CONFLICT (code) DO NOTHING;

INSERT INTO units (code, name, symbol, dimension, to_base_multiplier)
VALUES
  ('kwh', 'kilowatt-hour', 'kWh', 'energy', 1),
  ('l', 'liter', 'L', 'volume', 1),
  ('kg', 'kilogram', 'kg', 'mass', 1),
  ('km', 'kilometer', 'km', 'distance', 1),
  ('unit', 'unit', 'u', 'count', 1),
  ('kgco2e', 'kilogram CO2 equivalent', 'kgCO2e', 'co2e', 1),
  ('tco2e', 'ton CO2 equivalent', 'tCO2e', 'co2e', 1000)
ON CONFLICT (code) DO NOTHING;

INSERT INTO metrics (code, name, dimension, base_unit_id, description)
SELECT x.code, x.name, x.dimension, u.id, x.description
FROM (
  VALUES
    ('electricity_consumption', 'Electricity consumption', 'energy', 'kwh', 'Consumo electrico'),
    ('fuel_volume', 'Fuel volume', 'volume', 'l', 'Consumo de combustible'),
    ('waste_mass', 'Waste mass', 'mass', 'kg', 'Masa de residuos'),
    ('distance_traveled', 'Distance traveled', 'distance', 'km', 'Distancia recorrida'),
    ('equipment_count', 'Equipment count', 'count', 'unit', 'Cantidad de equipos'),
    ('co2e_emission', 'CO2e emission', 'co2e', 'kgco2e', 'Emision equivalente')
) AS x(code, name, dimension, unit_code, description)
JOIN units u ON u.code = x.unit_code
ON CONFLICT (code) DO NOTHING;

INSERT INTO data_sources (code, name, reliability_rank, description)
VALUES
  ('invoice', 'Invoice', 1, 'Factura o recibo'),
  ('metered', 'Metered', 1, 'Medicion directa'),
  ('survey', 'Survey', 3, 'Encuesta o captura manual'),
  ('inventory', 'Inventory', 2, 'Inventario'),
  ('estimation', 'Estimation', 4, 'Estimacion')
ON CONFLICT (code) DO NOTHING;

INSERT INTO estimation_methods (code, name, description)
VALUES
  ('metered', 'Metered', 'Estimacion basada en medicion'),
  ('invoice', 'Invoice', 'Estimacion basada en recibo'),
  ('survey', 'Survey', 'Estimacion basada en encuesta'),
  ('inventory', 'Inventory', 'Estimacion basada en inventario'),
  ('xgboost', 'XGBoost', 'Prediccion principal'),
  ('prophet', 'Prophet', 'Tendencia y forecast mensual'),
  ('manual_rule', 'Manual rule', 'Regla manual'),
  ('custom', 'Custom', 'Metodo personalizado')
ON CONFLICT (code) DO NOTHING;

INSERT INTO fuel_types (code, name, metadata)
VALUES
  ('diesel', 'Diesel', '{}'::jsonb),
  ('gasoline', 'Gasoline', '{}'::jsonb),
  ('lpg', 'LPG', '{}'::jsonb),
  ('natural_gas', 'Natural gas', '{}'::jsonb)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (code, description)
VALUES
  ('records:create', 'Crear registros'),
  ('records:update', 'Actualizar registros'),
  ('records:approve', 'Aprobar registros'),
  ('records:delete_soft', 'Eliminar logicamente registros'),
  ('exports:run', 'Ejecutar exportaciones'),
  ('targets:manage', 'Gestionar metas'),
  ('catalogs:manage', 'Gestionar catalogos'),
  ('users:manage', 'Gestionar usuarios'),
  ('ml:run', 'Ejecutar procesos analiticos'),
  ('ml:review_anomalies', 'Revisar anomalias')
ON CONFLICT (code) DO NOTHING;

COMMIT;
