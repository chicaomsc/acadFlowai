ALTER TABLE citations DROP CONSTRAINT citations_project_id_fkey;
ALTER TABLE citations DROP CONSTRAINT citations_chapter_id_fkey;
ALTER TABLE citations DROP CONSTRAINT citations_reference_id_fkey;

ALTER TABLE citations
    ADD CONSTRAINT citations_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE citations
    ADD CONSTRAINT citations_chapter_id_fkey
        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE;

ALTER TABLE citations
    ADD CONSTRAINT citations_reference_id_fkey
        FOREIGN KEY (reference_id) REFERENCES academic_references(id) ON DELETE CASCADE;
