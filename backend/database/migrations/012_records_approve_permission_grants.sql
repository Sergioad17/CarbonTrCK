-- Habilita la validacion de registros para perfiles de gobierno.
BEGIN;

INSERT INTO permissions (code, description)
VALUES ('records:approve', 'Aprobar registros')
ON CONFLICT (code) DO UPDATE
  SET description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON p.code = 'records:approve'
WHERE r.name IN ('Admin', 'Directivo')
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
