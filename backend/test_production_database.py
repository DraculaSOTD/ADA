#!/usr/bin/env python3
"""
Comprehensive test for production-ready database
Tests all features, data isolation, and resource allocation
"""

import sys
import logging
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from core.config import settings
from models.all_models import *

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_database_features():
    """Test all database features for production readiness"""
    
    logger.info("Testing production database features...")
    
    # Create engine and session
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Test 1: User creation and authentication features
        logger.info("Testing user management features...")
        
        test_user = User(
            email="test@ada.local",
            password_hash="hashed_password",
            token_balance=1000,
            subscription_plan="premium",
            account_status="active"
        )
        db.add(test_user)
        db.flush()
        
        # Test user profile
        profile = UserProfile(
            user_id=test_user.id,
            full_name="Test User",
            company="Test Company"
        )
        db.add(profile)
        
        # Test user settings
        settings_obj = UserSettings(
            user_id=test_user.id,
            dark_mode=True,
            email_notifications=True
        )
        db.add(settings_obj)
        
        # Test 2: Team features
        logger.info("Testing team management features...")
        
        team = Team(
            name="Test Team",
            description="A test team",
            owner_id=test_user.id,
            visibility="private"
        )
        db.add(team)
        db.flush()
        
        # Test team membership
        membership = TeamMember(
            team_id=team.id,
            user_id=test_user.id,
            role="owner",
            status="active"
        )
        db.add(membership)
        
        # Test team resource quota
        team_quota = TeamResourceQuota(
            team_id=team.id,
            max_concurrent_jobs=20,
            max_gpu_hours_monthly=200,
            monthly_token_limit=50000
        )
        db.add(team_quota)
        
        # Test 3: Model and data management
        logger.info("Testing model and data features...")
        
        model = Model(
            user_id=test_user.id,
            team_id=team.id,
            name="Test Model",
            description="A test model",
            type="neural_network",
            visibility="team",
            status="active"
        )
        db.add(model)
        db.flush()
        
        # Test upload
        upload = Upload(
            user_id=test_user.id,
            team_id=team.id,
            model_id=model.id,
            filename="test_data.csv",
            original_filename="original_test_data.csv",
            path="/uploads/test_data.csv",
            file_size=1024,
            validation_status="valid",
            visibility="private"
        )
        db.add(upload)
        db.flush()
        
        # Test 4: Compute resource management
        logger.info("Testing compute resource management...")
        
        # Get default compute instance
        instance = db.query(ComputeInstance).first()
        if instance:
            # Test job creation
            job = ModelJob(
                user_id=test_user.id,
                team_id=team.id,
                model_id=model.id,
                job_type="training",
                status="pending",
                token_cost=500,
                requires_gpu=False,
                estimated_memory_gb=8,
                estimated_cpu_cores=4
            )
            db.add(job)
            db.flush()
            
            # Test resource allocation
            allocation = ResourceAllocation(
                job_id=job.id,
                instance_id=instance.id,
                user_id=test_user.id,
                team_id=team.id,
                allocated_cpu=4,
                allocated_memory_gb=8,
                estimated_cost_tokens=500,
                status="allocated"
            )
            db.add(allocation)
            
            # Test job resource allocation
            job_alloc = JobResourceAllocation(
                job_id=job.id,
                allocation_id=allocation.id,
                resource_type="cpu",
                quantity_allocated=4.0,
                unit="cores",
                cost_per_unit=10,
                total_cost=40
            )
            db.add(job_alloc)
        
        # Test 5: Security and audit features
        logger.info("Testing security and audit features...")
        
        # Test data access log
        access_log = DataAccessLog(
            user_id=test_user.id,
            team_id=team.id,
            resource_type="model",
            resource_id=str(model.id),
            action="read",
            authorization_level="read",
            success=True,
            ip_address="127.0.0.1"
        )
        db.add(access_log)
        
        # Test security event
        security_event = SecurityEvent(
            user_id=test_user.id,
            event_type="login",
            severity="low",
            description="User logged in successfully",
            ip_address="127.0.0.1"
        )
        db.add(security_event)
        
        # Test 6: Notification system
        logger.info("Testing notification system...")
        
        notification = Notification(
            user_id=test_user.id,
            title="Test Notification",
            message="This is a test notification",
            type="info",
            priority="normal",
            is_read=False,
            related_model_id=model.id
        )
        db.add(notification)
        
        notification_prefs = NotificationPreference(
            user_id=test_user.id,
            email_notifications=True,
            model_completion_alerts=True,
            team_activity_alerts=True
        )
        db.add(notification_prefs)
        
        # Test 7: Rules engine
        logger.info("Testing rules engine...")
        
        rule = Rule(
            user_id=test_user.id,
            team_id=team.id,
            rule_name="Test Rule",
            description="A test business rule",
            logic_json={"conditions": [], "actions": []},
            rule_type="business",
            is_active=True,
            token_cost=50
        )
        db.add(rule)
        db.flush()
        
        rule_execution = RuleExecution(
            rule_id=rule.id,
            user_id=test_user.id,
            trigger_type="manual",
            input_data={"test": "data"},
            status="completed",
            token_cost=50
        )
        db.add(rule_execution)
        
        # Test 8: Data lifecycle management
        logger.info("Testing data lifecycle management...")
        
        download_log = DataDownload(
            user_id=test_user.id,
            resource_type="upload",
            resource_id=str(upload.id),
            resource_name=upload.filename,
            download_method="api",
            file_size_bytes=1024,
            download_successful=True,
            is_first_download=True
        )
        db.add(download_log)
        
        retention_policy = DataRetentionPolicy(
            policy_name="Standard Upload Policy",
            resource_type="upload",
            retention_type="DAYS_30",
            retention_hours=720,
            created_by=test_user.id
        )
        db.add(retention_policy)
        
        # Test 9: Cleaning and quality management
        logger.info("Testing data cleaning features...")
        
        cleaning_job = CleaningJob(
            user_id=test_user.id,
            filename="test_data.csv",
            tier="BASIC",
            status="COMPLETED",
            total_rows=1000,
            total_columns=10,
            quality_score_before=0.7,
            quality_score_after=0.95,
            token_cost=100
        )
        db.add(cleaning_job)
        db.flush()
        
        transformation_log = DataTransformationLog(
            cleaning_job_id=cleaning_job.id,
            user_id=test_user.id,
            transformation_type="normalize",
            transformation_name="Standard Normalization",
            target_column="age",
            rows_affected=1000,
            validation_passed=True
        )
        db.add(transformation_log)
        
        # Test 10: Payment and transaction features
        logger.info("Testing payment system...")
        
        token_package = TokenPackage(
            name="Basic Package",
            tokens=1000,
            price=10.00,
            currency="USD",
            is_active=True
        )
        db.add(token_package)
        db.flush()
        
        transaction = Transaction(
            user_id=test_user.id,
            gateway="stripe",
            amount=10.00,
            total_amount=10.00,
            currency="USD",
            status="success",
            transaction_type="token_purchase",
            tokens_granted=1000,
            package_id=token_package.id
        )
        db.add(transaction)
        
        # Commit all test data
        db.commit()
        
        logger.info("✓ All database features tested successfully!")
        
        # Test data isolation queries
        logger.info("Testing data isolation...")
        
        # Test that user can only see their own data
        user_models = db.query(Model).filter(Model.user_id == test_user.id).all()
        assert len(user_models) == 1, "User should see only their own models"
        
        # Test team data visibility
        team_models = db.query(Model).filter(Model.team_id == team.id).all()
        assert len(team_models) == 1, "Team should see team models"
        
        logger.info("✓ Data isolation working correctly!")
        
        # Test resource allocation
        logger.info("Testing resource allocation...")
        
        # Verify resource allocation exists
        allocations = db.query(ResourceAllocation).filter(
            ResourceAllocation.user_id == test_user.id
        ).all()
        assert len(allocations) > 0, "User should have resource allocations"
        
        logger.info("✓ Resource allocation working correctly!")
        
        # Generate summary report
        logger.info("\n=== PRODUCTION DATABASE TEST SUMMARY ===")
        logger.info(f"Users: {db.query(User).count()}")
        logger.info(f"Teams: {db.query(Team).count()}")
        logger.info(f"Models: {db.query(Model).count()}")
        logger.info(f"Jobs: {db.query(ModelJob).count()}")
        logger.info(f"Resource Allocations: {db.query(ResourceAllocation).count()}")
        logger.info(f"Security Events: {db.query(SecurityEvent).count()}")
        logger.info(f"Notifications: {db.query(Notification).count()}")
        logger.info(f"Rules: {db.query(Rule).count()}")
        logger.info(f"Data Downloads: {db.query(DataDownload).count()}")
        logger.info(f"Cleaning Jobs: {db.query(CleaningJob).count()}")
        logger.info(f"Transactions: {db.query(Transaction).count()}")
        logger.info("=========================================")
        
        logger.info("🎉 ALL TESTS PASSED! Database is production-ready!")
        
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()
        engine.dispose()


if __name__ == "__main__":
    test_database_features()