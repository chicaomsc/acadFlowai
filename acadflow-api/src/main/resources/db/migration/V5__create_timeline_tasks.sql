CREATE TABLE timeline_tasks (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID         NOT NULL,
    chapter_id  UUID,
    title       VARCHAR(500) NOT NULL,
    description TEXT,
    due_date    DATE,
    priority    VARCHAR(50)  NOT NULL DEFAULT 'MEDIUM',
    status      VARCHAR(50)  NOT NULL DEFAULT 'TODO',
    order_index INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_timeline_tasks_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    CONSTRAINT fk_timeline_tasks_chapter FOREIGN KEY (chapter_id)  REFERENCES chapters (id) ON DELETE SET NULL
);

CREATE INDEX idx_timeline_tasks_project_id ON timeline_tasks (project_id);
