#!/usr/bin/env python3
"""
Database Setup Script for ADA Multi-tenant Architecture
Sets up the complete database schema with all security and multi-tenancy features
"""

import os
import sys
import logging
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from core.config import settings
from models.base import Base
from core.db_types import get_uuid_type

# Import all models in the correct order to ensure they're registered
from models.all_models import *

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_database_if_not_exists():
    """Create database if it doesn't exist (PostgreSQL only)"""
    if not settings.DATABASE_URL.startswith('postgresql'):
        return
    
    try:
        # Parse database URL to get database name
        from urllib.parse import urlparse
        parsed = urlparse(settings.DATABASE_URL)
        db_name = parsed.path[1:]  # Remove leading slash
        
        # Create connection to default postgres database
        default_url = settings.DATABASE_URL.replace(f'/{db_name}', '/postgres')
        engine = create_engine(default_url, isolation_level='AUTOCOMMIT')
        
        # Check if database exists
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT 1 FROM pg_database WHERE datname = :db_name"
            ), {"db_name": db_name})
            
            if not result.fetchone():
                logger.info(f"Creating database: {db_name}")
                conn.execute(text(f'CREATE DATABASE "{db_name}"'))
            else:
                logger.info(f"Database {db_name} already exists")
        
        engine.dispose()
        
    except Exception as e:
        logger.error(f"Error creating database: {e}")
        raise


def setup_database():
    """Set up the complete database schema"""
    
    logger.info("Setting up ADA multi-tenant database...")
    
    # Create database if needed
    create_database_if_not_exists()
    
    # Create engine and session
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    try:
        # Create all tables
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        
        # Create session for initial data
        db = SessionLocal()
        
        try:
            # Create default admin user if none exists
            admin_user = db.query(User).filter(User.email == "admin@ada.local").first()
            if not admin_user:
                logger.info("Creating default admin user...")
                
                import bcrypt
                password_hash = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                
                admin_user = User(
                    email="admin@ada.local",
                    password_hash=password_hash,
                    token_balance=10000,
                    subscription_plan="admin",
                    account_status="active",
                    consent_given={
                        "data_processing": True,
                        "analytics": True
                    }
                )
                
                db.add(admin_user)
                db.flush()
                
                # Create admin profile
                admin_profile = UserProfile(
                    user_id=admin_user.id,
                    full_name="ADA Administrator",
                    company="ADA Platform",
                    position="System Administrator"
                )
                
                db.add(admin_profile)
                
                # Create admin settings
                admin_settings = UserSettings(
                    user_id=admin_user.id,
                    debug_mode=True,
                    data_analytics=True
                )
                
                db.add(admin_settings)
                
                db.commit()
                logger.info("Default admin user created: admin@ada.local / admin123")
            
            # Create default compute instances if none exist
            from models.compute import ComputeInstance
            instances = db.query(ComputeInstance).count()
            
            if instances == 0:
                logger.info("Creating default compute instances...")
                
                import psutil
                cpu_count = psutil.cpu_count()
                memory_gb = round(psutil.virtual_memory().total / (1024**3))
                
                # CPU instance
                cpu_instance = ComputeInstance(
                    name="Default CPU Instance",
                    instance_type="cpu-standard",
                    cpu_cores=max(2, cpu_count // 2),
                    memory_gb=max(4, memory_gb // 2),
                    gpu_count=0,
                    storage_gb=100,
                    hourly_cost_tokens=100,
                    status="available",
                    region="local",
                    docker_image="ada/ml-runtime:latest",
                    environment_config={"type": "cpu", "isolation": "container"}
                )
                
                db.add(cpu_instance)
                
                # Try to create GPU instance if available
                try:
                    import GPUtil
                    gpus = GPUtil.getGPUs()
                    if gpus:
                        gpu_instance = ComputeInstance(
                            name="Default GPU Instance",
                            instance_type="gpu-small",
                            cpu_cores=max(4, cpu_count // 2),
                            memory_gb=max(8, memory_gb // 2),
                            gpu_count=len(gpus),
                            gpu_type=gpus[0].name,
                            storage_gb=200,
                            hourly_cost_tokens=500,
                            status="available",
                            region="local",
                            docker_image="ada/ml-runtime:gpu",
                            environment_config={"type": "gpu", "isolation": "container"}
                        )
                        db.add(gpu_instance)
                        logger.info(f"Created GPU instance with {len(gpus)} GPUs")
                        
                except ImportError:
                    logger.info("GPU support not available")
                
                db.commit()
                logger.info("Default compute instances created")
            
            # Create default resource quotas for admin user
            from models.compute import ResourceQuota
            admin_quota = db.query(ResourceQuota).filter(
                ResourceQuota.entity_type == "user",
                ResourceQuota.entity_id == str(admin_user.id)
            ).first()
            
            if not admin_quota:
                logger.info("Creating admin resource quota...")
                
                admin_quota = ResourceQuota(
                    entity_type="user",
                    entity_id=str(admin_user.id),
                    max_concurrent_jobs=50,
                    max_gpu_hours_daily=100,
                    max_cpu_hours_daily=1000,
                    max_storage_gb=500,
                    max_memory_gb_per_job=64,
                    max_job_duration_hours=48,
                    priority_level=5,
                    daily_token_limit=10000,
                    monthly_token_limit=100000
                )
                
                db.add(admin_quota)
                db.commit()
                logger.info("Admin resource quota created")
            
            logger.info("Database setup completed successfully!")
            
            # Print summary
            users_count = db.query(User).count()
            instances_count = db.query(ComputeInstance).count()
            quotas_count = db.query(ResourceQuota).count()
            
            logger.info(f"Summary:")
            logger.info(f"  Users: {users_count}")
            logger.info(f"  Compute Instances: {instances_count}")
            logger.info(f"  Resource Quotas: {quotas_count}")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error setting up database: {e}")
        raise
    
    finally:
        engine.dispose()


def reset_database():
    """Reset the entire database (DANGER: This will delete all data!)"""
    
    logger.warning("RESETTING DATABASE - ALL DATA WILL BE LOST!")
    
    confirmation = input("Type 'CONFIRM_RESET' to proceed: ")
    if confirmation != "CONFIRM_RESET":
        logger.info("Reset cancelled")
        return
    
    engine = create_engine(settings.DATABASE_URL)
    
    try:
        logger.info("Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        logger.info("Database reset completed")
        
        # Now setup fresh database
        setup_database()
        
    except Exception as e:
        logger.error(f"Error resetting database: {e}")
        raise
    
    finally:
        engine.dispose()


def verify_database():
    """Verify database setup and connectivity"""
    
    logger.info("Verifying database setup...")
    
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    try:
        db = SessionLocal()
        
        try:
            # Test basic connectivity
            db.execute(text("SELECT 1"))
            logger.info("✓ Database connectivity OK")
            
            # Check if tables exist
            tables = [
                User, Model, Upload, ModelJob, Team, TeamMember,
                ComputeInstance, ResourceAllocation, ResourceQuota,
                DataAccessLog, SecurityEvent
            ]
            
            for table in tables:
                count = db.query(table).count()
                logger.info(f"✓ {table.__tablename__}: {count} records")
            
            logger.info("Database verification completed successfully!")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Database verification failed: {e}")
        raise
    
    finally:
        engine.dispose()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="ADA Database Setup")
    parser.add_argument(
        "action",
        choices=["setup", "reset", "verify"],
        help="Action to perform: setup (create/update), reset (drop all), verify (check)"
    )
    
    args = parser.parse_args()
    
    if args.action == "setup":
        setup_database()
    elif args.action == "reset":
        reset_database()
    elif args.action == "verify":
        verify_database()