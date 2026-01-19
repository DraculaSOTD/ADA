"""
Direct migration runner for SQLite database
Applies schema changes without Alembic
"""

import sqlite3
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_lifecycle_migrations():
    """Run data lifecycle management migrations"""
    
    conn = sqlite3.connect('ada.db')
    cursor = conn.cursor()
    
    try:
        logger.info("Running data lifecycle migrations...")
        
        # Create data_retention_policies table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS data_retention_policies (
            id TEXT PRIMARY KEY,
            resource_type TEXT NOT NULL,
            retention_type TEXT NOT NULL,
            retention_hours INTEGER,
            applies_to_all_users INTEGER DEFAULT 0,
            applies_to_team_id TEXT,
            specific_user_id INTEGER,
            specific_model_id INTEGER,
            trigger_on_first_download INTEGER DEFAULT 0,
            trigger_on_job_completion INTEGER DEFAULT 0,
            send_notifications INTEGER DEFAULT 1,
            notification_hours_before INTEGER DEFAULT 2,
            policy_description TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (specific_user_id) REFERENCES users(id),
            FOREIGN KEY (applies_to_team_id) REFERENCES teams(id)
        )
        """)
        
        # Create data_downloads table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS data_downloads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            team_id TEXT,
            resource_type TEXT NOT NULL,
            resource_id TEXT NOT NULL,
            resource_name TEXT,
            download_method TEXT DEFAULT 'api',
            file_path TEXT,
            file_size_bytes INTEGER,
            download_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            download_completed_at TIMESTAMP,
            download_duration_seconds INTEGER,
            is_first_download INTEGER DEFAULT 0,
            retention_timer_started INTEGER DEFAULT 0,
            client_ip TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (team_id) REFERENCES teams(id)
        )
        """)
        
        # Create cleanup_jobs table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS cleanup_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_type TEXT NOT NULL,
            cleanup_reason TEXT,
            scheduled_at TIMESTAMP,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            status TEXT DEFAULT 'pending',
            items_processed INTEGER DEFAULT 0,
            items_deleted INTEGER DEFAULT 0,
            items_failed INTEGER DEFAULT 0,
            bytes_freed INTEGER DEFAULT 0,
            execution_log TEXT,
            last_error TEXT,
            triggered_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # Create data_lifecycle_events table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS data_lifecycle_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resource_type TEXT NOT NULL,
            resource_id TEXT NOT NULL,
            resource_name TEXT,
            event_type TEXT NOT NULL,
            event_description TEXT,
            user_id INTEGER,
            triggered_by TEXT,
            previous_status TEXT,
            new_status TEXT,
            previous_expiration TIMESTAMP,
            new_expiration TIMESTAMP,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """)
        
        # Create user_retention_preferences table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_retention_preferences (
            user_id INTEGER PRIMARY KEY,
            auto_delete_generated_data INTEGER DEFAULT 1,
            auto_delete_predictions INTEGER DEFAULT 1,
            auto_delete_training_data INTEGER DEFAULT 1,
            retain_successful_models INTEGER DEFAULT 1,
            custom_retention_days_generated INTEGER DEFAULT 1,
            custom_retention_days_predictions INTEGER DEFAULT 1,
            custom_retention_days_uploads INTEGER DEFAULT 7,
            email_before_deletion INTEGER DEFAULT 1,
            allow_extension_requests INTEGER DEFAULT 0,
            preserve_data_lineage INTEGER DEFAULT 1,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """)
        
        # Add lifecycle columns to existing tables if they don't exist
        # For uploads table
        try:
            cursor.execute("ALTER TABLE uploads ADD COLUMN file_path TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists
            
        try:
            cursor.execute("ALTER TABLE uploads ADD COLUMN lifecycle_status TEXT DEFAULT 'active'")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE uploads ADD COLUMN first_downloaded_at TIMESTAMP")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE uploads ADD COLUMN download_count INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE uploads ADD COLUMN expires_at TIMESTAMP")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE uploads ADD COLUMN scheduled_deletion_at TIMESTAMP")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE uploads ADD COLUMN expiry_notified_at TIMESTAMP")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE uploads ADD COLUMN is_temporary INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
            
        # For generated_data table
        try:
            cursor.execute("ALTER TABLE generated_data ADD COLUMN lifecycle_status TEXT DEFAULT 'active'")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE generated_data ADD COLUMN first_downloaded_at TIMESTAMP")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE generated_data ADD COLUMN download_count INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE generated_data ADD COLUMN expires_at TIMESTAMP")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE generated_data ADD COLUMN scheduled_deletion_at TIMESTAMP")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE generated_data ADD COLUMN expiry_notified_at TIMESTAMP")
        except sqlite3.OperationalError:
            pass
            
        # For prediction_results table  
        try:
            cursor.execute("ALTER TABLE prediction_results ADD COLUMN lifecycle_status TEXT DEFAULT 'active'")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE prediction_results ADD COLUMN first_downloaded_at TIMESTAMP")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE prediction_results ADD COLUMN download_count INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE prediction_results ADD COLUMN expires_at TIMESTAMP")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE prediction_results ADD COLUMN scheduled_deletion_at TIMESTAMP")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE prediction_results ADD COLUMN expiry_notified_at TIMESTAMP")
        except sqlite3.OperationalError:
            pass
            
        # For model_jobs table (workspace management)
        try:
            cursor.execute("ALTER TABLE model_jobs ADD COLUMN temporary_workspace_path TEXT")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE model_jobs ADD COLUMN workspace_cleanup_status TEXT DEFAULT 'pending'")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE model_jobs ADD COLUMN workspace_cleaned_at TIMESTAMP")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE model_jobs ADD COLUMN data_files_cleaned INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
            
        conn.commit()
        logger.info("Data lifecycle migrations completed successfully")
        
        # Check tables were created
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%lifecycle%' OR name LIKE '%retention%' OR name LIKE '%cleanup%' OR name LIKE '%download%'")
        tables = cursor.fetchall()
        logger.info(f"Created lifecycle tables: {[t[0] for t in tables]}")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def run_enhanced_isolation_migrations():
    """Run enhanced isolation and resource management migrations"""
    
    conn = sqlite3.connect('ada.db')
    cursor = conn.cursor()
    
    try:
        logger.info("Running enhanced isolation migrations...")
        
        # Create job_resource_allocations table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS job_resource_allocations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER NOT NULL,
            allocation_id TEXT NOT NULL,
            instance_id TEXT,
            resource_type TEXT NOT NULL,
            allocated_cpu_cores INTEGER,
            allocated_memory_gb REAL,
            allocated_gpu_count INTEGER,
            allocated_storage_gb REAL,
            allocation_metadata TEXT,
            cost_per_hour INTEGER,
            actual_usage_hours REAL,
            total_cost INTEGER,
            status TEXT DEFAULT 'pending',
            allocated_at TIMESTAMP,
            released_at TIMESTAMP,
            resource_usage_summary TEXT,
            cost_breakdown TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id) REFERENCES model_jobs(id)
        )
        """)
        
        # Create data_access_policies table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS data_access_policies (
            id TEXT PRIMARY KEY,
            team_id TEXT,
            resource_type TEXT NOT NULL,
            resource_id TEXT,
            access_level TEXT NOT NULL,
            allowed_users TEXT,
            allowed_teams TEXT,
            allowed_roles TEXT,
            conditions TEXT,
            expires_at TIMESTAMP,
            is_active INTEGER DEFAULT 1,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (team_id) REFERENCES teams(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
        """)
        
        # Create resource_billing_log table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS resource_billing_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            team_id TEXT,
            job_id INTEGER,
            resource_type TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit_cost INTEGER NOT NULL,
            total_cost INTEGER NOT NULL,
            billing_period_start TIMESTAMP,
            billing_period_end TIMESTAMP,
            description TEXT,
            metadata TEXT,
            invoice_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (team_id) REFERENCES teams(id),
            FOREIGN KEY (job_id) REFERENCES model_jobs(id)
        )
        """)
        
        # Create data_transformation_log table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS data_transformation_log (
            transformation_id TEXT PRIMARY KEY,
            source_data TEXT NOT NULL,
            target_data TEXT NOT NULL,
            source_checksums TEXT,
            target_checksums TEXT,
            transformation_type TEXT NOT NULL,
            algorithm TEXT,
            parameters TEXT,
            user_id INTEGER NOT NULL,
            team_id TEXT,
            job_id INTEGER,
            input_rows INTEGER,
            output_rows INTEGER,
            input_columns INTEGER,
            output_columns INTEGER,
            data_quality_before TEXT,
            data_quality_after TEXT,
            transformations_applied TEXT,
            validation_results TEXT,
            performance_metrics TEXT,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            processing_time_seconds INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (team_id) REFERENCES teams(id),
            FOREIGN KEY (job_id) REFERENCES model_jobs(id)
        )
        """)
        
        # Create team_resource_quotas table if not exists
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS team_resource_quotas (
            team_id TEXT PRIMARY KEY,
            max_concurrent_jobs INTEGER DEFAULT 5,
            max_cpu_cores INTEGER DEFAULT 16,
            max_memory_gb REAL DEFAULT 32,
            max_storage_gb REAL DEFAULT 100,
            max_gpu_count INTEGER DEFAULT 0,
            can_use_gpu INTEGER DEFAULT 0,
            daily_token_limit INTEGER DEFAULT 10000,
            monthly_token_limit INTEGER DEFAULT 100000,
            priority_tier INTEGER DEFAULT 1,
            custom_limits TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (team_id) REFERENCES teams(id)
        )
        """)
        
        # Create data_classification table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS data_classification (
            id TEXT PRIMARY KEY,
            resource_type TEXT NOT NULL,
            resource_id TEXT NOT NULL,
            classification_level TEXT NOT NULL,
            sensitivity_score INTEGER,
            contains_pii INTEGER DEFAULT 0,
            contains_phi INTEGER DEFAULT 0,
            contains_financial INTEGER DEFAULT 0,
            compliance_tags TEXT,
            encryption_required INTEGER DEFAULT 0,
            retention_policy TEXT,
            access_restrictions TEXT,
            classified_by INTEGER,
            classified_at TIMESTAMP,
            last_reviewed_at TIMESTAMP,
            next_review_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (classified_by) REFERENCES users(id)
        )
        """)
        
        conn.commit()
        logger.info("Enhanced isolation migrations completed successfully")
        
    except Exception as e:
        logger.error(f"Enhanced isolation migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def main():
    """Run all migrations"""
    logger.info("Starting database migrations...")
    
    try:
        # Run enhanced isolation migrations first
        run_enhanced_isolation_migrations()
        
        # Then run lifecycle migrations
        run_lifecycle_migrations()
        
        logger.info("All migrations completed successfully!")
        
    except Exception as e:
        logger.error(f"Migration process failed: {e}")
        raise


if __name__ == "__main__":
    main()