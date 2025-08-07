-- Migration to enhance rules to work as models

-- Add new fields to the rules table
ALTER TABLE rules 
ADD COLUMN IF NOT EXISTS trigger_config JSONB DEFAULT '{"type": "manual"}',
ADD COLUMN IF NOT EXISTS input_schema JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS output_schema JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_rule_id INTEGER REFERENCES rules(id),
ADD COLUMN IF NOT EXISTS execution_mode TEXT DEFAULT 'sequential',
ADD COLUMN IF NOT EXISTS error_handling JSONB DEFAULT '{"strategy": "stop", "maxRetries": 3}',
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create a corresponding model entry for each rule
INSERT INTO models (user_id, name, description, type, visibility, status, created_at)
SELECT 
    user_id,
    rule_name,
    COALESCE(description, 'Rules Engine: ' || rule_name),
    'rules_engine',
    'private',
    'active',
    created_at
FROM rules 
WHERE NOT EXISTS (
    SELECT 1 FROM models 
    WHERE models.name = rules.rule_name 
    AND models.user_id = rules.user_id 
    AND models.type = 'rules_engine'
);

-- Update rules table to link with models
ALTER TABLE rules 
ADD COLUMN IF NOT EXISTS linked_model_id INTEGER REFERENCES models(id);

-- Link existing rules to their model counterparts
UPDATE rules 
SET linked_model_id = models.id
FROM models 
WHERE models.name = rules.rule_name 
AND models.user_id = rules.user_id 
AND models.type = 'rules_engine'
AND rules.linked_model_id IS NULL;

-- Create rule_executions table to track execution history
CREATE TABLE IF NOT EXISTS rule_executions (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES rules(id),
    user_id INTEGER REFERENCES users(id),
    trigger_type TEXT,
    input_data JSONB,
    output_data JSONB,
    status TEXT,
    error_message TEXT,
    execution_time_ms INTEGER,
    token_cost INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create rule_dependencies table for rule chaining
CREATE TABLE IF NOT EXISTS rule_dependencies (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES rules(id),
    depends_on_rule_id INTEGER REFERENCES rules(id),
    dependency_type TEXT DEFAULT 'sequential', -- 'sequential', 'parallel', 'conditional'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rule_id, depends_on_rule_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rule_executions_rule_id ON rule_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_executions_user_id ON rule_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_rule_executions_status ON rule_executions(status);
CREATE INDEX IF NOT EXISTS idx_rules_linked_model_id ON rules(linked_model_id);
CREATE INDEX IF NOT EXISTS idx_models_type ON models(type);

-- Add trigger to automatically create/update model when rule is created/updated
CREATE OR REPLACE FUNCTION sync_rule_to_model()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Create a new model for the rule
        INSERT INTO models (user_id, name, description, type, visibility, status, created_at)
        VALUES (
            NEW.user_id,
            NEW.rule_name,
            COALESCE(NEW.description, 'Rules Engine: ' || NEW.rule_name),
            'rules_engine',
            'private',
            'active',
            NEW.created_at
        )
        RETURNING id INTO NEW.linked_model_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Update the linked model
        UPDATE models 
        SET 
            name = NEW.rule_name,
            description = COALESCE(NEW.description, 'Rules Engine: ' || NEW.rule_name)
        WHERE id = NEW.linked_model_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS sync_rule_model_trigger ON rules;
CREATE TRIGGER sync_rule_model_trigger
BEFORE INSERT OR UPDATE ON rules
FOR EACH ROW
EXECUTE FUNCTION sync_rule_to_model();