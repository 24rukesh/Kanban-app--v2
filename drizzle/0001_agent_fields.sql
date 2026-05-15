ALTER TABLE tasks ADD COLUMN agent_id TEXT;
ALTER TABLE tasks ADD COLUMN external_ref TEXT;
ALTER TABLE tasks ADD COLUMN updated_by TEXT NOT NULL DEFAULT 'admin';

CREATE UNIQUE INDEX IF NOT EXISTS tasks_external_ref_uidx
  ON tasks (external_ref)
  WHERE external_ref IS NOT NULL AND external_ref != '';

