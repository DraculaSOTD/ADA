#!/usr/bin/env python3
"""
Migration: Production Ready Enhancements
Adds all missing tables, relationships, indexes, and constraints for production deployment
"""

import sys
import logging
from pathlib import Path
from datetime import datetime

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text, MetaData, Table, Index
from sqlalchemy.orm import sessionmaker
from core.config import settings
from models.base import Base

# Import all models to ensure they're registered
from models.user import User, UserProfile, ApiKey, UserSettings
from models.model import Model, ModelSettings
from models.data import Upload, DataMapping
from models.job import ModelJob, JobLog, PredictionResult, GeneratedData
from models.team import Team, TeamMember, TeamInvitation, TeamResource
from models.compute import (
    ComputeInstance, ResourceAllocation, ResourceQuota, 
    ResourceUsageLog, ResourcePool, JobResourceAllocation, TeamResourceQuota
)
from models.security import (
    DataAccessLog, DataLineage, DataPermission, SecurityEvent,
    ApiKeyUsage, ComplianceLog
)
from models.data_lifecycle import (
    DataDownload, DataRetentionPolicy, CleanupJob, DataLifecycleEvent,
    UserRetentionPreference
)
from models.rule import (
    Rule, RuleCondition, RuleAction, RuleExecution, 
    RuleExecutionLog, RuleTemplate
)
from models.notification import (
    Notification, NotificationPreference, NotificationTemplate, NotificationLog
)
from models.cleaning import (
    CleaningJob, DataProfile, CleaningReport, CleaningTemplate,
    DataTransformationLog, DataQualityMetric, DataValidationRule
)
from models.payment import (
    PaymentMethod, TokenPackage, Transaction, SubscriptionPlan,
    Subscription, PaymentWebhook, Invoice, Refund, PaymentAuditLog
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_indexes(engine):
    """Create database indexes for performance optimization"""
    
    indexes_to_create = [
        # User indexes
        "CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);",
        "CREATE INDEX IF NOT EXISTS ix_users_status ON users(account_status);",
        "CREATE INDEX IF NOT EXISTS ix_users_created ON users(created_at);",
        
        # Model indexes
        "CREATE INDEX IF NOT EXISTS ix_models_user ON models(user_id);",
        "CREATE INDEX IF NOT EXISTS ix_models_team ON models(team_id);",
        "CREATE INDEX IF NOT EXISTS ix_models_visibility ON models(visibility);",
        "CREATE INDEX IF NOT EXISTS ix_models_status ON models(status);",
        
        # Upload indexes
        "CREATE INDEX IF NOT EXISTS ix_uploads_user ON uploads(user_id);",
        "CREATE INDEX IF NOT EXISTS ix_uploads_team ON uploads(team_id);",
        "CREATE INDEX IF NOT EXISTS ix_uploads_model ON uploads(model_id);",
        "CREATE INDEX IF NOT EXISTS ix_uploads_lifecycle ON uploads(lifecycle_status);",
        
        # Job indexes
        "CREATE INDEX IF NOT EXISTS ix_jobs_user ON model_jobs(user_id);",
        "CREATE INDEX IF NOT EXISTS ix_jobs_model ON model_jobs(model_id);",
        "CREATE INDEX IF NOT EXISTS ix_jobs_status ON model_jobs(status);",
        "CREATE INDEX IF NOT EXISTS ix_jobs_created ON model_jobs(created_at);",
        "CREATE INDEX IF NOT EXISTS ix_jobs_resource ON model_jobs(allocated_instance_id);",
        
        # Team indexes
        "CREATE INDEX IF NOT EXISTS ix_teams_owner ON teams(owner_id);",
        "CREATE INDEX IF NOT EXISTS ix_team_members_team ON team_members(team_id);",
        "CREATE INDEX IF NOT EXISTS ix_team_members_user ON team_members(user_id);",
        
        # Security indexes
        "CREATE INDEX IF NOT EXISTS ix_access_log_user ON data_access_log(user_id);",
        "CREATE INDEX IF NOT EXISTS ix_access_log_resource ON data_access_log(resource_type, resource_id);",
        "CREATE INDEX IF NOT EXISTS ix_access_log_created ON data_access_log(created_at);",
        "CREATE INDEX IF NOT EXISTS ix_permissions_user ON data_permissions(user_id);",
        "CREATE INDEX IF NOT EXISTS ix_permissions_data ON data_permissions(data_id);",
        
        # Resource allocation indexes
        "CREATE INDEX IF NOT EXISTS ix_allocations_job ON resource_allocations(job_id);",
        "CREATE INDEX IF NOT EXISTS ix_allocations_instance ON resource_allocations(instance_id);",
        "CREATE INDEX IF NOT EXISTS ix_allocations_status ON resource_allocations(status);",
        
        # Composite indexes for common queries
        "CREATE INDEX IF NOT EXISTS ix_models_user_visibility ON models(user_id, visibility);",
        "CREATE INDEX IF NOT EXISTS ix_jobs_user_status ON model_jobs(user_id, status);",
        "CREATE INDEX IF NOT EXISTS ix_uploads_user_lifecycle ON uploads(user_id, lifecycle_status);",
    ]
    
    with engine.connect() as conn:
        for index_sql in indexes_to_create:
            try:
                conn.execute(text(index_sql))
                conn.commit()
                logger.info(f"Created index: {index_sql[:50]}...")
            except Exception as e:
                logger.warning(f"Index creation skipped: {e}")


def add_check_constraints(engine):
    """Add check constraints for data validation"""
    
    # SQLite doesn't support ALTER TABLE ADD CONSTRAINT well, 
    # so we'll skip for SQLite
    if settings.DATABASE_URL.startswith('sqlite'):
        logger.info("Skipping check constraints for SQLite")
        return
    
    constraints = [
        # User constraints
        "ALTER TABLE users ADD CONSTRAINT chk_token_balance CHECK (token_balance >= 0);",
        "ALTER TABLE users ADD CONSTRAINT chk_failed_login CHECK (failed_login_attempts >= 0);",
        
        # Model constraints  
        "ALTER TABLE models ADD CONSTRAINT chk_model_visibility CHECK (visibility IN ('private', 'team', 'public'));",
        
        # Job constraints
        "ALTER TABLE model_jobs ADD CONSTRAINT chk_job_progress CHECK (progress >= 0 AND progress <= 100);",
        "ALTER TABLE model_jobs ADD CONSTRAINT chk_job_retry CHECK (retry_count <= max_retries);",
        
        # Resource constraints
        "ALTER TABLE resource_allocations ADD CONSTRAINT chk_cpu_usage CHECK (peak_cpu_usage >= 0 AND peak_cpu_usage <= 1);",
        "ALTER TABLE resource_allocations ADD CONSTRAINT chk_memory_usage CHECK (peak_memory_usage >= 0 AND peak_memory_usage <= 1);",
        "ALTER TABLE resource_allocations ADD CONSTRAINT chk_gpu_usage CHECK (peak_gpu_usage >= 0 AND peak_gpu_usage <= 1);",
        
        # Team constraints
        "ALTER TABLE team_members ADD CONSTRAINT chk_member_role CHECK (role IN ('member', 'admin', 'owner'));",
        "ALTER TABLE teams ADD CONSTRAINT chk_max_members CHECK (max_members > 0);",
        
        # Data quality constraints
        "ALTER TABLE data_quality_metrics ADD CONSTRAINT chk_quality_scores CHECK (" +
        "completeness_score >= 0 AND completeness_score <= 1 AND " +
        "accuracy_score >= 0 AND accuracy_score <= 1 AND " +
        "consistency_score >= 0 AND consistency_score <= 1 AND " +
        "validity_score >= 0 AND validity_score <= 1 AND " +
        "uniqueness_score >= 0 AND uniqueness_score <= 1 AND " +
        "overall_score >= 0 AND overall_score <= 1);",
    ]
    
    with engine.connect() as conn:
        for constraint_sql in constraints:
            try:
                conn.execute(text(constraint_sql))
                conn.commit()
                logger.info(f"Added constraint: {constraint_sql[:50]}...")
            except Exception as e:
                logger.warning(f"Constraint skipped: {e}")


def create_triggers(engine):
    """Create database triggers for automated actions"""
    
    # SQLite has limited trigger support
    if settings.DATABASE_URL.startswith('sqlite'):
        logger.info("Creating SQLite triggers")
        
        triggers = [
            # Update updated_at timestamp automatically
            """
            CREATE TRIGGER IF NOT EXISTS update_users_updated_at
            AFTER UPDATE ON users
            BEGIN
                UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END;
            """,
            """
            CREATE TRIGGER IF NOT EXISTS update_models_updated_at
            AFTER UPDATE ON models
            BEGIN
                UPDATE models SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END;
            """,
            """
            CREATE TRIGGER IF NOT EXISTS update_teams_updated_at
            AFTER UPDATE ON teams
            BEGIN
                UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END;
            """,
        ]
        
    else:  # PostgreSQL
        logger.info("Creating PostgreSQL triggers")
        
        # First create the trigger function
        trigger_function = """
        CREATE OR REPLACE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
        
        triggers = [
            trigger_function,
            # Apply trigger to tables with updated_at
            "CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();",
            "CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models FOR EACH ROW EXECUTE FUNCTION update_updated_at();",
            "CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();",
            "CREATE TRIGGER update_uploads_updated_at BEFORE UPDATE ON uploads FOR EACH ROW EXECUTE FUNCTION update_updated_at();",
            "CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON model_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();",
        ]
    
    with engine.connect() as conn:
        for trigger_sql in triggers:
            try:
                conn.execute(text(trigger_sql))
                conn.commit()
                logger.info(f"Created trigger: {trigger_sql[:50]}...")
            except Exception as e:
                logger.warning(f"Trigger skipped: {e}")


def update_existing_data(engine):
    """Update existing data to comply with new schema"""
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Update users without account_status
        db.execute(text("""
            UPDATE users 
            SET account_status = 'active' 
            WHERE account_status IS NULL
        """))
        
        # Update models without visibility
        db.execute(text("""
            UPDATE models 
            SET visibility = 'private' 
            WHERE visibility IS NULL
        """))
        
        # Update uploads without lifecycle_status
        db.execute(text("""
            UPDATE uploads 
            SET lifecycle_status = 'active' 
            WHERE lifecycle_status IS NULL
        """))
        
        # Update jobs without resource allocation status
        db.execute(text("""
            UPDATE model_jobs 
            SET resource_allocation_status = 'pending' 
            WHERE resource_allocation_status IS NULL
        """))
        
        # Create default resource quotas for existing users
        users = db.query(User).all()
        for user in users:
            existing_quota = db.query(ResourceQuota).filter(
                ResourceQuota.entity_type == "user",
                ResourceQuota.entity_id == str(user.id)
            ).first()
            
            if not existing_quota:
                quota = ResourceQuota(
                    entity_type="user",
                    entity_id=str(user.id),
                    max_concurrent_jobs=5 if user.subscription_plan == "free" else 20,
                    max_gpu_hours_daily=24 if user.subscription_plan != "free" else 2,
                    max_cpu_hours_daily=100 if user.subscription_plan != "free" else 10,
                    max_storage_gb=100 if user.subscription_plan != "free" else 10,
                    priority_level=1 if user.subscription_plan == "free" else 3
                )
                db.add(quota)
        
        db.commit()
        logger.info("Existing data updated successfully")
        
    except Exception as e:
        logger.error(f"Error updating existing data: {e}")
        db.rollback()
    finally:
        db.close()


def run_migration():
    """Run the complete migration"""
    
    logger.info("Starting Production Ready Enhancements migration...")
    
    # Create engine
    engine = create_engine(settings.DATABASE_URL)
    
    try:
        # Create all new tables
        logger.info("Creating new tables...")
        Base.metadata.create_all(bind=engine)
        
        # Create indexes
        logger.info("Creating indexes...")
        create_indexes(engine)
        
        # Add check constraints
        logger.info("Adding check constraints...")
        add_check_constraints(engine)
        
        # Create triggers
        logger.info("Creating triggers...")
        create_triggers(engine)
        
        # Update existing data
        logger.info("Updating existing data...")
        update_existing_data(engine)
        
        # Log migration completion
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO migration_history (migration_name, executed_at, success)
                VALUES (:name, :time, :success)
            """), {
                "name": "004_production_ready_enhancements",
                "time": datetime.utcnow(),
                "success": True
            })
            conn.commit()
        
        logger.info("Migration completed successfully!")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise
    finally:
        engine.dispose()


def rollback_migration():
    """Rollback the migration if needed"""
    
    logger.warning("Rolling back Production Ready Enhancements migration...")
    
    engine = create_engine(settings.DATABASE_URL)
    
    try:
        # Drop new tables in reverse order
        tables_to_drop = [
            "rule_execution_logs",
            "rule_executions",
            "rule_actions",
            "rule_conditions",
            "rule_templates",
            "notification_logs",
            "notification_templates",
            "data_validation_rules",
            "data_quality_metrics",
            "data_transformation_logs",
            "team_resource_quotas",
            "job_resource_allocations",
        ]
        
        with engine.connect() as conn:
            for table_name in tables_to_drop:
                try:
                    conn.execute(text(f"DROP TABLE IF EXISTS {table_name} CASCADE"))
                    conn.commit()
                    logger.info(f"Dropped table: {table_name}")
                except Exception as e:
                    logger.warning(f"Could not drop table {table_name}: {e}")
        
        logger.info("Rollback completed")
        
    except Exception as e:
        logger.error(f"Rollback failed: {e}")
        raise
    finally:
        engine.dispose()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Production Ready Enhancements Migration")
    parser.add_argument(
        "action",
        choices=["migrate", "rollback"],
        help="Action to perform: migrate (apply changes) or rollback (revert changes)"
    )
    
    args = parser.parse_args()
    
    if args.action == "migrate":
        run_migration()
    elif args.action == "rollback":
        rollback_migration()