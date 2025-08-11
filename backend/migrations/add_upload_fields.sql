-- Add new fields to uploads table
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS file_type VARCHAR(10);

-- Update existing records with file size and type from filesystem
-- This would need to be done programmatically or manually