CREATE TABLE chapters (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID         NOT NULL,
    title             VARCHAR(500) NOT NULL,
    type              VARCHAR(50)  NOT NULL,
    content           TEXT,
    status            VARCHAR(50)  NOT NULL DEFAULT 'NOT_STARTED',
    order_index       INTEGER      NOT NULL,
    word_count        INTEGER      NOT NULL DEFAULT 0,
    target_word_count INTEGER      NOT NULL DEFAULT 0,
    last_edited_at    TIMESTAMP,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_chapters_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE INDEX idx_chapters_project_id ON chapters (project_id);
