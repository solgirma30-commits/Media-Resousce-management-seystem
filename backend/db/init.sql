CREATE TABLE IF NOT EXISTS department_updates (
    id SERIAL PRIMARY KEY,
    department TEXT NOT NULL,
    message TEXT NOT NULL,
    sender TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
