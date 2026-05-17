ALTER TABLE projects
    ADD COLUMN subtitle         VARCHAR(255),
    ADD COLUMN academic_degree  VARCHAR(50),
    ADD COLUMN defense_city     VARCHAR(255),
    ADD COLUMN defense_year     INTEGER,
    ADD COLUMN abstract_pt      TEXT,
    ADD COLUMN abstract_en      TEXT,
    ADD COLUMN keywords         VARCHAR(500);
