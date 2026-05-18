CREATE TABLE citations (
    id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id   UUID        NOT NULL REFERENCES projects(id),
    chapter_id   UUID        NOT NULL REFERENCES chapters(id),
    reference_id UUID        NOT NULL REFERENCES academic_references(id),
    type         VARCHAR(30) NOT NULL,
    page_number  VARCHAR(30),
    apud_author  VARCHAR(255),
    apud_year    VARCHAR(10),
    quoted_text  TEXT,
    created_at   TIMESTAMP   NOT NULL DEFAULT now()
);
CREATE INDEX idx_citations_chapter_id   ON citations(chapter_id);
CREATE INDEX idx_citations_project_id   ON citations(project_id);
CREATE INDEX idx_citations_reference_id ON citations(reference_id);
