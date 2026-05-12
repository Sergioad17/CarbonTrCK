-- Motor de alertas v2: templates editables, condiciones estructuradas, webhook,
-- frecuencia real, registro de entregas y eventos de seguridad.

-- ── Columnas nuevas en admin_alert_rules ─────────────────────────────────────
ALTER TABLE admin_alert_rules
  ADD COLUMN IF NOT EXISTS condition_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS webhook_url text,
  ADD COLUMN IF NOT EXISTS cooldown_minutes integer,
  ADD COLUMN IF NOT EXISTS quiet_hours_start smallint,
  ADD COLUMN IF NOT EXISTS quiet_hours_end smallint,
  ADD COLUMN IF NOT EXISTS last_evaluated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_triggered_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_failures integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE admin_alert_rules DROP CONSTRAINT admin_alert_rules_type_chk;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE admin_alert_rules
  ADD CONSTRAINT admin_alert_rules_type_chk
  CHECK (type IN ('device','anomaly','factor','period','goal','validation','security','system','custom'));

ALTER TABLE admin_alert_rules
  ADD CONSTRAINT admin_alert_rules_quiet_start_chk
  CHECK (quiet_hours_start IS NULL OR (quiet_hours_start >= 0 AND quiet_hours_start < 24));

ALTER TABLE admin_alert_rules
  ADD CONSTRAINT admin_alert_rules_quiet_end_chk
  CHECK (quiet_hours_end IS NULL OR (quiet_hours_end >= 0 AND quiet_hours_end < 24));

-- ── Tabla de plantillas editables ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_alert_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  code varchar(80) NOT NULL,
  name varchar(160) NOT NULL,
  channel varchar(20) NOT NULL DEFAULT 'inapp',
  subject varchar(200),
  body text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_alert_templates_org_code_uk UNIQUE (organization_id, code),
  CONSTRAINT admin_alert_templates_channel_chk
    CHECK (channel IN ('email','inapp','push','sms','webhook')),
  CONSTRAINT admin_alert_templates_name_chk CHECK (btrim(name) <> ''),
  CONSTRAINT admin_alert_templates_body_chk CHECK (btrim(body) <> ''),
  CONSTRAINT admin_alert_templates_created_by_fk
    FOREIGN KEY (created_by, organization_id) REFERENCES users(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT admin_alert_templates_updated_by_fk
    FOREIGN KEY (updated_by, organization_id) REFERENCES users(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_admin_alert_templates_org
  ON admin_alert_templates (organization_id, channel, enabled);

-- FK opcional rule → template
DO $$ BEGIN
  ALTER TABLE admin_alert_rules
    ADD CONSTRAINT admin_alert_rules_template_fk
    FOREIGN KEY (template_id) REFERENCES admin_alert_templates(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_admin_alert_rules_template
  ON admin_alert_rules (template_id);

-- ── Bitácora de entregas (delivery log) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_alert_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  rule_id uuid REFERENCES admin_alert_rules(id) ON UPDATE CASCADE ON DELETE SET NULL,
  notification_id uuid,
  user_id uuid,
  channel varchar(20) NOT NULL,
  recipient text,
  status varchar(20) NOT NULL DEFAULT 'queued',
  provider_message_id text,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  event_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  CONSTRAINT admin_alert_deliveries_status_chk
    CHECK (status IN ('queued','sent','failed','skipped','bounced')),
  CONSTRAINT admin_alert_deliveries_channel_chk
    CHECK (channel IN ('email','inapp','push','sms','webhook'))
);

CREATE INDEX IF NOT EXISTS idx_admin_alert_deliveries_org_created
  ON admin_alert_deliveries (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_alert_deliveries_rule
  ON admin_alert_deliveries (rule_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_alert_deliveries_status
  ON admin_alert_deliveries (status, channel);

-- ── Dedupe / frecuencia (un slot por regla+event_key+bucket) ─────────────────
CREATE TABLE IF NOT EXISTS admin_alert_dedupe (
  rule_id uuid NOT NULL REFERENCES admin_alert_rules(id) ON UPDATE CASCADE ON DELETE CASCADE,
  event_key text NOT NULL,
  bucket_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rule_id, event_key, bucket_key)
);

CREATE INDEX IF NOT EXISTS idx_admin_alert_dedupe_created
  ON admin_alert_dedupe (created_at);

-- ── Eventos de seguridad agregados (para evaluator de auth) ──────────────────
CREATE TABLE IF NOT EXISTS admin_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  user_id uuid,
  event_type varchar(60) NOT NULL,
  ip_address text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_security_events_org_type_created
  ON admin_security_events (organization_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_security_events_user
  ON admin_security_events (user_id, created_at DESC);

-- ── Limpieza periódica del dedupe (mantén 30 días) ───────────────────────────
-- Se ejecutará desde el cron, pero dejamos índice listo.
