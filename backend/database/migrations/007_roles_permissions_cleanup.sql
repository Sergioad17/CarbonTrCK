DELETE FROM role_permissions rp
USING permissions p
WHERE p.id = rp.permission_id
  AND p.code IN (
    'dashboard:export',
    'electricity:edit',
    'fuel:edit',
    'ai:view',
    'ai:create',
    'ai:edit',
    'ai:export',
    'ai:approve',
    'ml:run',
    'ml:review_anomalies'
  );

DELETE FROM permissions
WHERE code IN (
  'dashboard:export',
  'electricity:edit',
  'fuel:edit',
  'ai:view',
  'ai:create',
  'ai:edit',
  'ai:export',
  'ai:approve',
  'ml:run',
  'ml:review_anomalies'
);
