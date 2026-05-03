BEGIN;

CREATE TABLE IF NOT EXISTS organization_admin_settings (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE CASCADE,
  institutional jsonb NOT NULL DEFAULT '{}'::jsonb,
  system jsonb NOT NULL DEFAULT '{}'::jsonb,
  security jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by_user_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_admin_settings_updated_by_fk
    FOREIGN KEY (updated_by_user_id)
    REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE TRIGGER organization_admin_settings_set_updated_at
  BEFORE UPDATE ON organization_admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMIT;
