-- Update model_jobs table
ALTER TABLE model_jobs ADD COLUMN IF NOT EXISTS parameters JSON;
ALTER TABLE model_jobs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE model_jobs ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE model_jobs ADD COLUMN IF NOT EXISTS retry_of_job_id INTEGER REFERENCES model_jobs(id);
ALTER TABLE model_jobs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE model_jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Rename ended_at to completed_at if needed (keeping ended_at for compatibility)
-- UPDATE model_jobs SET completed_at = ended_at WHERE completed_at IS NULL AND ended_at IS NOT NULL;

-- Create job_logs table
CREATE TABLE IF NOT EXISTS job_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    log_level VARCHAR(20) DEFAULT 'INFO',
    message TEXT,
    FOREIGN KEY (job_id) REFERENCES model_jobs (id) ON DELETE CASCADE
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_logs_timestamp ON job_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_model_jobs_user_status ON model_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_model_jobs_created_at ON model_jobs(created_at);