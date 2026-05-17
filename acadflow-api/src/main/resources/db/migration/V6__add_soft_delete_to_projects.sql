ALTER TABLE projects ADD COLUMN deleted_at TIMESTAMP;

CREATE INDEX idx_projects_active ON projects (user_id, deleted_at) WHERE deleted_at IS NULL;
