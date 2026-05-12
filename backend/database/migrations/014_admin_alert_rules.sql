CREATE TABLE IF NOT EXISTS admin_alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name varchar(160) NOT NULL,
  type varchar(40) NOT NULL,
  condition text NOT NULL,
  severity varchar(20) NOT NULL DEFAULT 'warning',
  priority varchar(20) NOT NULL DEFAULT 'normal',
  frequency varchar(20) NOT NULL DEFAULT 'immediate',
  channels text[] NOT NULL DEFAULT ARRAY['inapp']::text[],
  recipients text[] NOT NULL DEFAULT ARRAY[]::text[],
  enabled boolean NOT NULL DEFAULT true,
  triggered_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_alert_rules_created_by_fk FOREIGN KEY (created_by,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT admin_alert_rules_updated_by_fk FOREIGN KEY (updated_by,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT admin_alert_rules_name_chk CHECK (btrim(name) <> ''),
  CONSTRAINT admin_alert_rules_condition_chk CHECK (btrim(condition) <> ''),
  CONSTRAINT admin_alert_rules_type_chk CHECK (type IN ('device','anomaly','factor','period','goal','validation','security','system')),
  CONSTRAINT admin_alert_rules_severity_chk CHECK (severity IN ('info','warning','critical')),
  CONSTRAINT admin_alert_rules_priority_chk CHECK (priority IN ('low','normal','high')),
  CONSTRAINT admin_alert_rules_frequency_chk CHECK (frequency IN ('immediate','hourly','daily','weekly')),
  CONSTRAINT admin_alert_rules_triggered_count_chk CHECK (triggered_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_admin_alert_rules_org_enabled
  ON admin_alert_rules(organization_id, enabled, updated_at DESC);
