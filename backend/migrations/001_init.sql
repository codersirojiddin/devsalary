CREATE TABLE IF NOT EXISTS salary_records (
    id BIGSERIAL PRIMARY KEY,
    country TEXT NOT NULL,
    role TEXT NOT NULL,
    level TEXT NOT NULL,
    work_type TEXT,
    annual_usd NUMERIC(12, 2) NOT NULL CHECK (annual_usd >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    salary_min NUMERIC(12, 2),
    salary_max NUMERIC(12, 2),
    source TEXT,
    source_url TEXT,
    source_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_country ON salary_records(country);
CREATE INDEX IF NOT EXISTS idx_salary_role ON salary_records(role);
CREATE INDEX IF NOT EXISTS idx_salary_level ON salary_records(level);
CREATE INDEX IF NOT EXISTS idx_salary_work_type ON salary_records(work_type);
CREATE INDEX IF NOT EXISTS idx_salary_country_role_level ON salary_records(country, role, level);
