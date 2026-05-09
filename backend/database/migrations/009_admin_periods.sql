CREATE TABLE IF NOT EXISTS admin_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name varchar(80) NOT NULL,
  label varchar(160),
  period_type varchar(30) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'open',
  is_default boolean NOT NULL DEFAULT false,
  capture_deadline date,
  validation_deadline date,
  report_deadline date,
  lock_capture_on_close boolean NOT NULL DEFAULT true,
  allow_special_reopen boolean NOT NULL DEFAULT false,
  special_reopen_roles text[] NOT NULL DEFAULT ARRAY['admin']::text[],
  special_reopen_note text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_periods_org_name_uq UNIQUE (organization_id,name),
  CONSTRAINT admin_periods_dates_chk CHECK (end_date >= start_date),
  CONSTRAINT admin_periods_type_chk CHECK (period_type IN ('monthly','bimonthly','quarterly','semester','annual')),
  CONSTRAINT admin_periods_status_chk CHECK (status IN ('open','review','closed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_periods_default_uq
  ON admin_periods(organization_id)
  WHERE is_default;

CREATE INDEX IF NOT EXISTS idx_admin_periods_org_dates
  ON admin_periods(organization_id,start_date,end_date);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'admin_periods_set_updated_at'
  ) THEN
    CREATE TRIGGER admin_periods_set_updated_at
      BEFORE UPDATE ON admin_periods
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
