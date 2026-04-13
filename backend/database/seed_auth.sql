BEGIN;

WITH org AS (
  INSERT INTO organizations (name, legal_name, country_code, state, city, timezone)
  VALUES ('CarbonTrack Demo Org', 'CarbonTrack Demo Org', 'MX', 'Tamaulipas', 'Ciudad Mante', 'America/Mexico_City')
  ON CONFLICT DO NOTHING
  RETURNING id
),
existing_org AS (
  SELECT id FROM org
  UNION ALL
  SELECT id FROM organizations WHERE name = 'CarbonTrack Demo Org' LIMIT 1
),
campus AS (
  INSERT INTO campuses (organization_id, name, code, city, state, country_code, is_active)
  SELECT id, 'Campus CarbonTrack', 'CAMPUS-CT', 'Ciudad Mante', 'Tamaulipas', 'MX', true
  FROM existing_org
  ON CONFLICT (organization_id,code) DO NOTHING
  RETURNING id, organization_id
),
existing_campus AS (
  SELECT id, organization_id FROM campus
  UNION ALL
  SELECT id, organization_id FROM campuses WHERE code = 'CAMPUS-CT' LIMIT 1
)
INSERT INTO areas (campus_id, code, name, is_active)
SELECT id, x.code, x.name, true
FROM existing_campus
CROSS JOIN (
  VALUES
    ('ADM', 'Administracion'),
    ('LAB', 'Laboratorio'),
    ('CC1', 'Centro de computo 1')
) AS x(code, name)
ON CONFLICT (campus_id,code) DO NOTHING;

WITH org AS (
  SELECT id FROM organizations WHERE name = 'CarbonTrack Demo Org' LIMIT 1
)
INSERT INTO roles (organization_id, name, description, is_system)
SELECT org.id, x.name, x.description, true
FROM org
CROSS JOIN (
  VALUES
    ('Admin', 'Acceso total al sistema'),
    ('Directivo', 'Consulta y seguimiento ejecutivo'),
    ('Operativo', 'Captura y operacion diaria')
) AS x(name, description)
ON CONFLICT (organization_id,name) DO NOTHING;

WITH role_map AS (
  SELECT r.id, r.name, r.organization_id
  FROM roles r
  JOIN organizations o ON o.id = r.organization_id
  WHERE o.name = 'CarbonTrack Demo Org'
),
permission_map AS (
  SELECT id, code FROM permissions
),
desired AS (
  SELECT
    rm.id AS role_id,
    pm.id AS permission_id
  FROM role_map rm
  JOIN permission_map pm ON (
    LOWER(rm.name) = 'admin'
    OR (LOWER(rm.name) = 'directivo' AND pm.code IN ('exports:run'))
    OR (LOWER(rm.name) = 'operativo' AND pm.code IN ('records:create', 'records:update'))
  )
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, permission_id
FROM desired
ON CONFLICT (role_id,permission_id) DO NOTHING;

WITH org AS (
  SELECT id FROM organizations WHERE name = 'CarbonTrack Demo Org' LIMIT 1
),
campus AS (
  SELECT id, organization_id FROM campuses WHERE code = 'CAMPUS-CT' LIMIT 1
)
INSERT INTO users (
  organization_id,
  campus_id,
  area_access_mode,
  numeric_id,
  first_name,
  paternal_last_name,
  maternal_last_name,
  email,
  password_hash,
  full_name,
  notes,
  is_active
)
SELECT
  org.id,
  campus.id,
  'all',
  x.numeric_id,
  x.first_name,
  x.paternal_last_name,
  x.maternal_last_name,
  x.email::citext,
  crypt(x.password, gen_salt('bf', 10)),
  x.full_name,
  x.notes,
  true
FROM org
JOIN campus ON campus.organization_id = org.id
CROSS JOIN (
  VALUES
    ('USR-001', 'Admin', 'CarbonTrack', 'Demo', 'admin@itsmante.edu.mx', 'admin123A', 'Admin CarbonTrack Demo', 'Usuario administrador semilla'),
    ('USR-002', 'Ana', 'Operativa', 'Demo', 'ana@itsmante.edu.mx', 'captura1A', 'Ana Operativa Demo', 'Usuario operativo semilla'),
    ('USR-003', 'Directora', 'Academica', 'Demo', 'director@itsmante.edu.mx', 'consulta1A', 'Directora Academica Demo', 'Usuario directivo semilla')
) AS x(numeric_id, first_name, paternal_last_name, maternal_last_name, email, password, full_name, notes)
ON CONFLICT (organization_id,email) DO NOTHING;

WITH org AS (
  SELECT id FROM organizations WHERE name = 'CarbonTrack Demo Org' LIMIT 1
),
campus AS (
  SELECT id, organization_id FROM campuses WHERE code = 'CAMPUS-CT' LIMIT 1
),
role_map AS (
  SELECT id, LOWER(name) AS role_name
  FROM roles
  WHERE organization_id = (SELECT id FROM org)
),
user_map AS (
  SELECT id, LOWER(email::text) AS email
  FROM users
  WHERE organization_id = (SELECT id FROM org)
),
desired AS (
  SELECT
    (SELECT id FROM org) AS organization_id,
    um.id AS user_id,
    rm.id AS role_id,
    (SELECT id FROM campus) AS campus_id
  FROM user_map um
  JOIN role_map rm ON (
    (um.email = 'admin@itsmante.edu.mx' AND rm.role_name = 'admin')
    OR (um.email = 'ana@itsmante.edu.mx' AND rm.role_name = 'operativo')
    OR (um.email = 'director@itsmante.edu.mx' AND rm.role_name = 'directivo')
  )
)
INSERT INTO user_roles (organization_id, user_id, role_id, campus_id)
SELECT organization_id, user_id, role_id, campus_id
FROM desired
ON CONFLICT DO NOTHING;

COMMIT;
