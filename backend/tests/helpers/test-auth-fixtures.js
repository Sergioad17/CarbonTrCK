export const TEST_ORGANIZATION_NAME = "CarbonTrack Test Org";
export const TEST_CAMPUS_CODE = "CAMPUS-CT";

const TEST_USERS = [
  {
    numericId: "TST-ADM",
    firstName: "Admin",
    paternalLastName: "CarbonTrack",
    maternalLastName: "Test",
    email: "admin@itsmante.edu.mx",
    password: "admin123A",
    fullName: "Admin CarbonTrack Test",
    notes: "Usuario administrador de prueba",
    role: "Admin",
  },
  {
    numericId: "TST-ANA",
    firstName: "Ana",
    paternalLastName: "Operativa",
    maternalLastName: "Test",
    email: "ana@itsmante.edu.mx",
    password: "captura1A",
    fullName: "Ana Operativa Test",
    notes: "Usuario operativo de prueba",
    role: "Operativo",
  },
  {
    numericId: "TST-DIR",
    firstName: "Directora",
    paternalLastName: "Academica",
    maternalLastName: "Test",
    email: "director@itsmante.edu.mx",
    password: "consulta1A",
    fullName: "Directora Academica Test",
    notes: "Usuario directivo de prueba",
    role: "Directivo",
  },
];

async function ensureCatalogFixtures(query) {
  await query(`
    INSERT INTO emission_scopes (code, name, description)
    VALUES
      ('scope1', 'Scope 1', 'Emisiones directas'),
      ('scope2', 'Scope 2', 'Electricidad comprada'),
      ('scope3', 'Scope 3', 'Otras emisiones indirectas')
    ON CONFLICT (code) DO NOTHING
  `);

  await query(`
    INSERT INTO units (code, name, symbol, dimension, to_base_multiplier)
    VALUES
      ('kwh', 'kilowatt-hour', 'kWh', 'energy', 1),
      ('l', 'liter', 'L', 'volume', 1),
      ('kg', 'kilogram', 'kg', 'mass', 1),
      ('km', 'kilometer', 'km', 'distance', 1),
      ('unit', 'unit', 'u', 'count', 1),
      ('kgco2e', 'kilogram CO2 equivalent', 'kgCO2e', 'co2e', 1),
      ('tco2e', 'ton CO2 equivalent', 'tCO2e', 'co2e', 1000)
    ON CONFLICT (code) DO NOTHING
  `);

  await query(`
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
    ON CONFLICT (code) DO NOTHING
  `);

  await query(`
    INSERT INTO data_sources (code, name, reliability_rank, description)
    VALUES
      ('invoice', 'Invoice', 1, 'Factura o recibo'),
      ('metered', 'Metered', 1, 'Medicion directa'),
      ('survey', 'Survey', 3, 'Encuesta o captura manual'),
      ('inventory', 'Inventory', 2, 'Inventario'),
      ('estimation', 'Estimation', 4, 'Estimacion')
    ON CONFLICT (code) DO NOTHING
  `);

  await query(`
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
    ON CONFLICT (code) DO NOTHING
  `);

  await query(`
    INSERT INTO fuel_types (code, name, metadata)
    VALUES
      ('diesel', 'Diesel', '{}'::jsonb),
      ('gasoline', 'Gasoline', '{}'::jsonb),
      ('lpg', 'LPG', '{}'::jsonb),
      ('natural_gas', 'Natural gas', '{}'::jsonb)
    ON CONFLICT (code) DO NOTHING
  `);

  await query(`
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
    ON CONFLICT (code) DO NOTHING
  `);

  await query(`
    INSERT INTO emission_categories (scope_id, code, name, default_metric_id, default_unit_id)
    SELECT es.id, x.code, x.name, m.id, u.id
    FROM (
      VALUES
        ('scope1', 'combustible', 'Combustible', 'fuel_volume', 'l'),
        ('scope2', 'electricidad', 'Electricidad', 'electricity_consumption', 'kwh')
    ) AS x(scope_code, code, name, metric_code, unit_code)
    JOIN emission_scopes es ON es.code = x.scope_code::scope_code
    JOIN metrics m ON m.code = x.metric_code
    JOIN units u ON u.code = x.unit_code
    ON CONFLICT DO NOTHING
  `);

  await query(`
    INSERT INTO emission_factors (
      scope_id, category_id, metric_id, numerator_unit_id, denominator_unit_id,
      value, region, provider, valid_from, is_default
    )
    SELECT es.id, ec.id, m.id, nu.id, du.id, x.value, x.region, x.provider, x.valid_from::date, true
    FROM (
      VALUES
        ('scope1', 'combustible', 'fuel_volume', 'kgco2e', 'l', 2.689, 'MX', 'SEMARNAT-diesel', '2024-01-01'),
        ('scope2', 'electricidad', 'electricity_consumption', 'kgco2e', 'kwh', 0.444, 'MX', 'CFE', '2024-01-01')
    ) AS x(scope_code, category_code, metric_code, num_unit, den_unit, value, region, provider, valid_from)
    JOIN emission_scopes es ON es.code = x.scope_code::scope_code
    JOIN emission_categories ec ON ec.scope_id = es.id AND ec.code = x.category_code
    JOIN metrics m ON m.code = x.metric_code
    JOIN units nu ON nu.code = x.num_unit
    JOIN units du ON du.code = x.den_unit
    ON CONFLICT DO NOTHING
  `);
}

export async function cleanupTestAuthFixtures(query) {
  const orgs = await query(`SELECT id FROM organizations WHERE name = $1`, [TEST_ORGANIZATION_NAME]);
  const orgIds = orgs.rows.map((row) => row.id);

  for (const organizationId of orgIds) {
    await query(`DELETE FROM profile_change_request_events WHERE request_id IN (SELECT id FROM profile_change_requests WHERE organization_id = $1) OR actor_organization_id = $1`, [organizationId]);
    await query(`DELETE FROM device_readings WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM device_last_totals WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM device_bindings WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM anomaly_detections WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM monthly_forecasts WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM ml_predictions WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM ml_model_runs WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM record_files WHERE file_id IN (SELECT id FROM files WHERE organization_id = $1) OR record_id IN (SELECT id FROM records WHERE organization_id = $1)`, [organizationId]);
    await query(`DELETE FROM record_revisions WHERE record_id IN (SELECT id FROM records WHERE organization_id = $1)`, [organizationId]);
    await query(`DELETE FROM exports WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM files WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM target_actions WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM targets WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM equipment_inventory WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM records WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM anomaly_detections WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM monthly_forecasts WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM ml_predictions WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM ml_model_runs WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM ml_models WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM iot_devices WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM dashboard_activity_feeds WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM organization_admin_settings WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM notifications WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM user_settings WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM profile_change_requests WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM password_reset_tokens WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM auth_sessions WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM user_area_access WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM audit_events WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM user_roles WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM users WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE organization_id = $1)`, [organizationId]);
    await query(`DELETE FROM roles WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM assets WHERE campus_id IN (SELECT id FROM campuses WHERE organization_id = $1)`, [organizationId]);
    await query(`DELETE FROM areas WHERE campus_id IN (SELECT id FROM campuses WHERE organization_id = $1)`, [organizationId]);
    await query(`DELETE FROM buildings WHERE campus_id IN (SELECT id FROM campuses WHERE organization_id = $1)`, [organizationId]);
    await query(`DELETE FROM campuses WHERE organization_id = $1`, [organizationId]);
    await query(`DELETE FROM organizations WHERE id = $1`, [organizationId]);
  }
}

export async function prepareTestAuthFixtures(query) {
  await ensureCatalogFixtures(query);
  await cleanupTestAuthFixtures(query);

  const org = await query(
    `
      INSERT INTO organizations (name, legal_name, country_code, state, city, timezone)
      VALUES ($1, $1, 'MX', 'Tamaulipas', 'Ciudad Mante', 'America/Mexico_City')
      RETURNING id
    `,
    [TEST_ORGANIZATION_NAME],
  );
  const organizationId = org.rows[0].id;

  const campus = await query(
    `
      INSERT INTO campuses (organization_id, name, code, city, state, country_code, is_active)
      VALUES ($1, 'Campus CarbonTrack Test', $2, 'Ciudad Mante', 'Tamaulipas', 'MX', true)
      RETURNING id
    `,
    [organizationId, TEST_CAMPUS_CODE],
  );
  const campusId = campus.rows[0].id;

  await query(
    `
      INSERT INTO areas (campus_id, code, name, is_active)
      VALUES
        ($1, 'ADM', 'Administracion', true),
        ($1, 'LAB', 'Laboratorio', true),
        ($1, 'CC1', 'Centro de computo 1', true)
    `,
    [campusId],
  );

  await query(
    `
      INSERT INTO roles (organization_id, name, description, is_system)
      VALUES
        ($1, 'Admin', 'Acceso total al sistema', true),
        ($1, 'Directivo', 'Consulta y seguimiento ejecutivo', true),
        ($1, 'Operativo', 'Captura y operacion diaria', true)
    `,
    [organizationId],
  );

  await query(
    `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      JOIN permissions p ON (
        lower(r.name) = 'admin'
        OR (lower(r.name) = 'directivo' AND p.code IN ('exports:run'))
        OR (lower(r.name) = 'operativo' AND p.code IN ('records:create', 'records:update'))
      )
      WHERE r.organization_id = $1
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `,
    [organizationId],
  );

  for (const user of TEST_USERS) {
    const insertedUser = await query(
      `
        INSERT INTO users (
          organization_id, campus_id, area_access_mode, numeric_id, first_name,
          paternal_last_name, maternal_last_name, email, password_hash, full_name,
          notes, is_active
        )
        VALUES ($1, $2, 'all', $3, $4, $5, $6, $7::citext, crypt($8, gen_salt('bf', 10)), $9, $10, true)
        RETURNING id
      `,
      [
        organizationId,
        campusId,
        user.numericId,
        user.firstName,
        user.paternalLastName,
        user.maternalLastName,
        user.email,
        user.password,
        user.fullName,
        user.notes,
      ],
    );

    await query(
      `
        INSERT INTO user_roles (organization_id, user_id, role_id, campus_id)
        SELECT $1, $2, r.id, $3
        FROM roles r
        WHERE r.organization_id = $1
          AND lower(r.name) = lower($4)
      `,
      [organizationId, insertedUser.rows[0].id, campusId, user.role],
    );
  }
}
