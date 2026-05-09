-- Tablas para el módulo Admin Panel > Entrenamiento IA.
-- Estas tablas son independientes de los modelos analíticos previos
-- (ml_models, ml_model_runs) para no contaminar dominios existentes.

CREATE TABLE IF NOT EXISTS ai_training_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name varchar(160) NOT NULL,
  description text,
  model_type varchar(40) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  date_from date,
  date_to date,
  train_ratio numeric(5,2) NOT NULL DEFAULT 70,
  validation_ratio numeric(5,2) NOT NULL DEFAULT 20,
  max_readings integer,
  readings_count integer NOT NULL DEFAULT 0,
  devices_count integer NOT NULL DEFAULT 0,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_training_runs_status_chk CHECK (status IN ('pending','running','completed','failed','cancelled')),
  CONSTRAINT ai_training_runs_model_type_chk CHECK (model_type IN ('consumption_prediction','anomaly_detection','pattern_classification')),
  CONSTRAINT ai_training_runs_train_ratio_chk CHECK (train_ratio >= 0 AND train_ratio <= 100),
  CONSTRAINT ai_training_runs_validation_ratio_chk CHECK (validation_ratio >= 0 AND validation_ratio <= 100),
  CONSTRAINT ai_training_runs_split_chk CHECK (train_ratio + validation_ratio <= 100),
  CONSTRAINT ai_training_runs_dates_chk CHECK (date_from IS NULL OR date_to IS NULL OR date_to >= date_from),
  CONSTRAINT ai_training_runs_max_readings_chk CHECK (max_readings IS NULL OR max_readings > 0)
);

CREATE INDEX IF NOT EXISTS idx_ai_training_runs_org_created
  ON ai_training_runs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_training_runs_status
  ON ai_training_runs(organization_id, status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'ai_training_runs_set_updated_at'
  ) THEN
    CREATE TRIGGER ai_training_runs_set_updated_at
      BEFORE UPDATE ON ai_training_runs
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ai_training_run_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_run_id uuid NOT NULL REFERENCES ai_training_runs(id) ON UPDATE CASCADE ON DELETE CASCADE,
  device_id uuid NOT NULL,
  device_code varchar(120) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_training_run_devices_uq UNIQUE (training_run_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_training_run_devices_run
  ON ai_training_run_devices(training_run_id);

CREATE TABLE IF NOT EXISTS ai_model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  training_run_id uuid NOT NULL REFERENCES ai_training_runs(id) ON UPDATE CASCADE ON DELETE CASCADE,
  model_type varchar(40) NOT NULL,
  version varchar(40) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'inactive',
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  artifact_path text,
  activated_at timestamptz,
  activated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_model_versions_status_chk CHECK (status IN ('inactive','active')),
  CONSTRAINT ai_model_versions_run_uq UNIQUE (training_run_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_model_versions_org_type_status
  ON ai_model_versions(organization_id, model_type, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_model_versions_active_uq
  ON ai_model_versions(organization_id, model_type)
  WHERE status = 'active';
