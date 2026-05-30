CREATE TABLE academic_tables (
    id          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id  UUID         NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
    chapter_id  UUID         NOT NULL REFERENCES chapters(id)  ON DELETE CASCADE,
    type        VARCHAR(20)  NOT NULL,
    title       VARCHAR(500) NOT NULL,
    source_text VARCHAR(500),
    content     TEXT         NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_academic_tables_project_id ON academic_tables(project_id);
CREATE INDEX idx_academic_tables_chapter_id ON academic_tables(chapter_id);
