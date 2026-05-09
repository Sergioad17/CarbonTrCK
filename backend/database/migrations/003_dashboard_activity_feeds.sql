BEGIN;

CREATE TABLE IF NOT EXISTS dashboard_activity_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dashboard_activity_feeds_organization_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT dashboard_activity_feeds_updated_by_fk FOREIGN KEY (updated_by,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT dashboard_activity_feeds_organization_uq UNIQUE (organization_id),
  CONSTRAINT dashboard_activity_feeds_items_array_chk CHECK (jsonb_typeof(items) = 'array')
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'dashboard_activity_feeds_set_updated_at'
  ) THEN
    CREATE TRIGGER dashboard_activity_feeds_set_updated_at
    BEFORE UPDATE ON dashboard_activity_feeds
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

COMMIT;
