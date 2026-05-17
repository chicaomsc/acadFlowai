CREATE TABLE projects (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID         NOT NULL,
    title                VARCHAR(500) NOT NULL,
    course               VARCHAR(255) NOT NULL,
    institution          VARCHAR(255) NOT NULL,
    advisor_name         VARCHAR(255),
    norm                 VARCHAR(50)  NOT NULL DEFAULT 'ABNT',
    deadline             DATE,
    theme                TEXT,
    research_problem     TEXT,
    general_objective    TEXT,
    specific_objectives  TEXT,
    status               VARCHAR(50)  NOT NULL DEFAULT 'IN_PROGRESS',
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_projects_user_id ON projects (user_id);
