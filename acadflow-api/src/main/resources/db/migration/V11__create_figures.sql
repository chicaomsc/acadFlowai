CREATE TABLE figures (
    id                UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id        UUID         NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
    chapter_id        UUID         NOT NULL REFERENCES chapters(id)  ON DELETE CASCADE,
    caption           VARCHAR(500) NOT NULL,
    source_text       VARCHAR(500),
    storage_key       VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255),
    mime_type         VARCHAR(50)  NOT NULL,
    file_size_bytes   BIGINT       NOT NULL,
    width_percent     INTEGER      NOT NULL DEFAULT 100,
    created_at        TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX idx_figures_project_id ON figures(project_id);
CREATE INDEX idx_figures_chapter_id ON figures(chapter_id);
