-- Historial administrativo para Admin Panel > Validacion y registros.
BEGIN;

CREATE TABLE IF NOT EXISTS validation_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  record_id uuid NOT NULL,
  decision varchar(16) NOT NULL,
  actor_id uuid NOT NULL,
  comment text,
  criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT validation_decisions_org_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT validation_decisions_record_fk FOREIGN KEY (record_id,organization_id) REFERENCES records(id,organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT validation_decisions_actor_fk FOREIGN KEY (actor_id,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT validation_decisions_decision_chk CHECK (decision IN ('approved','rejected','returned'))
);

CREATE INDEX IF NOT EXISTS idx_validation_decisions_org_created ON validation_decisions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_decisions_record ON validation_decisions(record_id, created_at DESC);

COMMIT;
