ALTER TABLE chapters
    ADD COLUMN parent_id     UUID    REFERENCES chapters(id) ON DELETE CASCADE,
    ADD COLUMN section_order INTEGER,
    ADD COLUMN level         INTEGER NOT NULL DEFAULT 1;

CREATE INDEX idx_chapters_parent_id ON chapters (parent_id);
