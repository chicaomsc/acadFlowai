CREATE TABLE academic_references (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id           UUID         NOT NULL,
    primary_chapter_id   UUID,
    title                VARCHAR(500) NOT NULL,
    authors              TEXT         NOT NULL,
    type                 VARCHAR(50)  NOT NULL,
    year                 INTEGER      NOT NULL,
    journal              VARCHAR(500),
    publisher            VARCHAR(500),
    doi                  VARCHAR(500),
    url                  TEXT,
    access_date          DATE,
    abnt_formatted       TEXT,
    has_citation         BOOLEAN      NOT NULL DEFAULT false,
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_references_project FOREIGN KEY (project_id)         REFERENCES projects  (id) ON DELETE CASCADE,
    CONSTRAINT fk_references_chapter FOREIGN KEY (primary_chapter_id) REFERENCES chapters  (id) ON DELETE SET NULL
);

CREATE INDEX idx_references_project_id ON academic_references (project_id);
