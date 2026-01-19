"""
Database Migration: Enhanced Data Isolation and Resource Integration
Adds missing tables and relationships for complete multi-tenant data isolation,
resource allocation integration, and comprehensive audit trails.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid
import os

# Revision identifiers
revision = '002_enhanced_isolation'
down_revision = '001_multi_tenant'
branch_labels = None
depends_on = None

# Check if we're using SQLite
USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() == "true"

def get_uuid_type():
    """Get appropriate UUID type based on database"""
    if USE_SQLITE:
        return sa.String(36)
    else:
        return postgresql.UUID(as_uuid=True)

def upgrade():
    """Create enhanced data isolation and resource integration tables"""
    
    # Job-Resource Allocation linking table
    op.create_table(
        'job_resource_allocations',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('job_id', sa.Integer, sa.ForeignKey('model_jobs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('allocation_id', get_uuid_type(), sa.ForeignKey('resource_allocations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('allocated_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('released_at', sa.DateTime),
        sa.Column('status', sa.String(20), default='active'),  # active, released, failed
        sa.Column('resource_usage_summary', sa.JSON, default=lambda: {}),
        sa.Column('cost_breakdown', sa.JSON, default=lambda: {}),
        sa.UniqueConstraint('job_id', 'allocation_id', name='unique_job_allocation')
    )
    
    # Enhanced Data Access Policies
    op.create_table(
        'data_access_policies',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('resource_type', sa.String(50), nullable=False),  # model, upload, job, generated_data
        sa.Column('resource_id', sa.String(255), nullable=False),
        sa.Column('policy_name', sa.String(255), nullable=False),
        sa.Column('policy_type', sa.String(50), default='access_control'),  # access_control, data_retention, encryption
        
        # Subject (who the policy applies to)
        sa.Column('subject_type', sa.String(20), nullable=False),  # user, team, role, public
        sa.Column('subject_id', sa.String(255)),  # null for public policies
        
        # Conditions and rules
        sa.Column('conditions', sa.JSON, default=lambda: {}),  # Time, IP, device restrictions
        sa.Column('permissions', sa.JSON, nullable=False),  # Specific permissions granted
        sa.Column('restrictions', sa.JSON, default=lambda: {}),  # Rate limits, download limits, etc.
        
        # Policy metadata
        sa.Column('priority', sa.Integer, default=100),  # Lower number = higher priority
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('effective_from', sa.DateTime, server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime),
        sa.Column('created_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('last_modified_by', sa.Integer, sa.ForeignKey('users.id')),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Resource Billing Log
    op.create_table(
        'resource_billing_log',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('team_id', get_uuid_type(), sa.ForeignKey('teams.id')),
        sa.Column('job_id', sa.Integer, sa.ForeignKey('model_jobs.id')),
        sa.Column('allocation_id', get_uuid_type(), sa.ForeignKey('resource_allocations.id')),
        
        # Billing details
        sa.Column('billing_type', sa.String(50), nullable=False),  # compute, storage, api_call, data_transfer
        sa.Column('resource_type', sa.String(50), nullable=False),  # cpu, gpu, memory, storage
        sa.Column('quantity', sa.Float, nullable=False),  # Amount consumed
        sa.Column('unit', sa.String(20), nullable=False),  # hours, gb, calls, mb
        sa.Column('rate_per_unit', sa.Integer, nullable=False),  # Tokens per unit
        sa.Column('total_tokens', sa.Integer, nullable=False),  # Total cost
        
        # Time tracking
        sa.Column('billing_period_start', sa.DateTime, nullable=False),
        sa.Column('billing_period_end', sa.DateTime, nullable=False),
        sa.Column('billed_at', sa.DateTime, server_default=sa.func.now()),
        
        # Metadata
        sa.Column('billing_details', sa.JSON, default=lambda: {}),  # Additional billing context
        sa.Column('invoice_id', sa.String(255)),  # Link to external billing system
        sa.Column('status', sa.String(20), default='pending'),  # pending, processed, refunded
        
        sa.Index('idx_billing_log_user_period', 'user_id', 'billing_period_start', 'billing_period_end'),
        sa.Index('idx_billing_log_job', 'job_id'),
        sa.Index('idx_billing_log_status', 'status')
    )
    
    # Enhanced Data Transformation Log (complete lineage)
    op.create_table(
        'data_transformation_log',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('transformation_id', sa.String(255), nullable=False),  # Unique ID for this transformation
        sa.Column('parent_transformation_id', sa.String(255)),  # Chain transformations
        
        # Source data
        sa.Column('source_data', sa.JSON, nullable=False),  # List of source data references
        sa.Column('source_checksums', sa.JSON, default=lambda: {}),  # Data integrity verification
        
        # Target data
        sa.Column('target_data', sa.JSON, nullable=False),  # List of output data references
        sa.Column('target_checksums', sa.JSON, default=lambda: {}),
        
        # Transformation details
        sa.Column('transformation_type', sa.String(50), nullable=False),
        sa.Column('algorithm', sa.String(100)),  # ML algorithm used
        sa.Column('parameters', sa.JSON, default=lambda: {}),  # All parameters used
        sa.Column('code_version', sa.String(100)),  # Version of processing code
        sa.Column('environment_info', sa.JSON, default=lambda: {}),  # Python version, dependencies
        
        # Processing context
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('team_id', get_uuid_type(), sa.ForeignKey('teams.id')),
        sa.Column('job_id', sa.Integer, sa.ForeignKey('model_jobs.id')),
        sa.Column('compute_instance_id', get_uuid_type(), sa.ForeignKey('compute_instances.id')),
        
        # Quality and validation
        sa.Column('input_data_quality', sa.JSON, default=lambda: {}),
        sa.Column('output_data_quality', sa.JSON, default=lambda: {}),
        sa.Column('validation_results', sa.JSON, default=lambda: {}),
        sa.Column('performance_metrics', sa.JSON, default=lambda: {}),
        
        # Reproducibility
        sa.Column('seed_values', sa.JSON, default=lambda: {}),  # Random seeds for reproducibility
        sa.Column('execution_environment', sa.JSON, default=lambda: {}),  # Container/environment details
        
        # Timing
        sa.Column('started_at', sa.DateTime, nullable=False),
        sa.Column('completed_at', sa.DateTime, nullable=False),
        sa.Column('processing_time_seconds', sa.Float),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        
        sa.Index('idx_transformation_log_user', 'user_id'),
        sa.Index('idx_transformation_log_job', 'job_id'),
        sa.Index('idx_transformation_log_type', 'transformation_type'),
        sa.Index('idx_transformation_log_parent', 'parent_transformation_id')
    )
    
    # Resource Pool Assignments
    op.create_table(
        'resource_pool_assignments',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('pool_id', get_uuid_type(), sa.ForeignKey('resource_pools.id', ondelete='CASCADE'), nullable=False),
        sa.Column('instance_id', get_uuid_type(), sa.ForeignKey('compute_instances.id', ondelete='CASCADE'), nullable=False),
        sa.Column('assignment_type', sa.String(20), default='automatic'),  # automatic, manual, reserved
        sa.Column('priority', sa.Integer, default=1),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('assigned_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('assigned_by', sa.Integer, sa.ForeignKey('users.id')),
        sa.UniqueConstraint('pool_id', 'instance_id', name='unique_pool_instance')
    )
    
    # Team Resource Quotas (separate from individual user quotas)
    op.create_table(
        'team_resource_quotas',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('team_id', get_uuid_type(), sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False, unique=True),
        
        # Compute quotas
        sa.Column('max_concurrent_jobs', sa.Integer, default=10),
        sa.Column('max_cpu_hours_daily', sa.Integer, default=100),
        sa.Column('max_gpu_hours_daily', sa.Integer, default=10),
        sa.Column('max_memory_gb_hours_daily', sa.Integer, default=500),
        sa.Column('max_storage_gb', sa.Integer, default=1000),
        
        # Model and data quotas
        sa.Column('max_models', sa.Integer, default=50),
        sa.Column('max_uploads_per_day', sa.Integer, default=100),
        sa.Column('max_upload_size_gb', sa.Integer, default=10),
        sa.Column('max_generated_data_gb', sa.Integer, default=100),
        
        # Cost controls
        sa.Column('daily_token_limit', sa.Integer, default=10000),
        sa.Column('monthly_token_limit', sa.Integer, default=300000),
        sa.Column('cost_alert_threshold', sa.Integer, default=8000),  # Alert at 80% of daily limit
        
        # Access controls
        sa.Column('allowed_instance_types', sa.JSON, default=lambda: []),  # Empty = all allowed
        sa.Column('blocked_instance_types', sa.JSON, default=lambda: []),
        sa.Column('max_job_duration_hours', sa.Integer, default=48),
        sa.Column('can_use_gpu', sa.Boolean, default=True),
        sa.Column('can_use_premium_instances', sa.Boolean, default=False),
        
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Data Classification and Sensitivity
    op.create_table(
        'data_classification',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('data_type', sa.String(50), nullable=False),  # upload, generated_data, model_output
        sa.Column('data_id', sa.String(255), nullable=False),
        
        # Classification
        sa.Column('sensitivity_level', sa.String(20), default='internal'),  # public, internal, confidential, restricted
        sa.Column('data_categories', sa.JSON, default=lambda: []),  # PII, financial, health, etc.
        sa.Column('compliance_requirements', sa.JSON, default=lambda: []),  # GDPR, HIPAA, etc.
        
        # Detection method
        sa.Column('classified_by', sa.String(50), default='automatic'),  # automatic, manual, user_declared
        sa.Column('classification_confidence', sa.Float),  # 0.0-1.0 for automatic classification
        sa.Column('detection_rules', sa.JSON, default=lambda: []),  # Rules that triggered classification
        
        # Access implications
        sa.Column('encryption_required', sa.Boolean, default=False),
        sa.Column('retention_period_days', sa.Integer),  # How long to keep the data
        sa.Column('deletion_required_by', sa.DateTime),  # Hard deadline for deletion
        sa.Column('export_restrictions', sa.JSON, default=lambda: {}),  # Geographic or other restrictions
        
        # Metadata
        sa.Column('classified_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('last_reviewed', sa.DateTime),
        sa.Column('review_required_by', sa.DateTime),
        sa.Column('created_by', sa.Integer, sa.ForeignKey('users.id')),
        
        sa.UniqueConstraint('data_type', 'data_id', name='unique_data_classification'),
        sa.Index('idx_classification_sensitivity', 'sensitivity_level'),
        sa.Index('idx_classification_compliance', 'compliance_requirements'),
        sa.Index('idx_classification_review', 'review_required_by')
    )
    
    # Enhanced columns for existing tables
    
    # Add resource allocation tracking to model_jobs
    op.add_column('model_jobs', sa.Column('requires_gpu', sa.Boolean, default=False))
    op.add_column('model_jobs', sa.Column('estimated_memory_gb', sa.Integer, default=4))
    op.add_column('model_jobs', sa.Column('estimated_cpu_cores', sa.Integer, default=2))
    op.add_column('model_jobs', sa.Column('estimated_duration_hours', sa.Integer, default=1))
    op.add_column('model_jobs', sa.Column('actual_resource_cost', sa.Integer, default=0))
    op.add_column('model_jobs', sa.Column('resource_allocation_status', sa.String(20), default='pending'))
    op.add_column('model_jobs', sa.Column('allocated_instance_id', get_uuid_type(), sa.ForeignKey('compute_instances.id')))
    op.add_column('model_jobs', sa.Column('container_id', sa.String(255)))
    op.add_column('model_jobs', sa.Column('isolation_network_id', sa.String(255)))
    op.add_column('model_jobs', sa.Column('data_access_permissions', sa.JSON, default=lambda: []))
    
    # Add team quotas usage tracking to teams
    op.add_column('teams', sa.Column('current_cpu_usage', sa.Float, default=0.0))
    op.add_column('teams', sa.Column('current_gpu_usage', sa.Float, default=0.0))
    op.add_column('teams', sa.Column('current_memory_usage', sa.Float, default=0.0))
    op.add_column('teams', sa.Column('current_storage_usage', sa.Float, default=0.0))
    op.add_column('teams', sa.Column('daily_token_usage', sa.Integer, default=0))
    op.add_column('teams', sa.Column('monthly_token_usage', sa.Integer, default=0))
    op.add_column('teams', sa.Column('usage_last_updated', sa.DateTime, server_default=sa.func.now()))
    
    # Add enhanced tracking to uploads
    op.add_column('uploads', sa.Column('data_lineage_id', sa.String(255)))  # Link to transformation log
    op.add_column('uploads', sa.Column('source_transformation_id', sa.String(255)))  # If generated from another dataset
    op.add_column('uploads', sa.Column('preprocessing_applied', sa.JSON, default=lambda: []))
    op.add_column('uploads', sa.Column('usage_count', sa.Integer, default=0))  # How many times used in training
    op.add_column('uploads', sa.Column('last_used_at', sa.DateTime))
    op.add_column('uploads', sa.Column('retention_expires_at', sa.DateTime))
    
    # Add model performance and lineage tracking
    op.add_column('models', sa.Column('training_data_lineage', sa.JSON, default=lambda: []))
    op.add_column('models', sa.Column('model_artifacts_path', sa.Text))
    op.add_column('models', sa.Column('model_size_mb', sa.Float))
    op.add_column('models', sa.Column('inference_cost_tokens', sa.Integer, default=0))
    op.add_column('models', sa.Column('total_predictions_made', sa.Integer, default=0))
    op.add_column('models', sa.Column('model_validation_metrics', sa.JSON, default=lambda: {}))
    op.add_column('models', sa.Column('deployment_status', sa.String(20), default='inactive'))
    op.add_column('models', sa.Column('last_used_for_prediction', sa.DateTime))
    
    # Add usage tracking for users
    op.add_column('users', sa.Column('current_active_jobs', sa.Integer, default=0))
    op.add_column('users', sa.Column('daily_token_usage', sa.Integer, default=0))
    op.add_column('users', sa.Column('monthly_token_usage', sa.Integer, default=0))
    op.add_column('users', sa.Column('total_data_uploaded_gb', sa.Float, default=0.0))
    op.add_column('users', sa.Column('total_predictions_made', sa.Integer, default=0))
    op.add_column('users', sa.Column('preferred_compute_region', sa.String(50), default='local'))
    
    # Create additional indexes for performance
    op.create_index('idx_job_resource_status', 'model_jobs', ['resource_allocation_status'])
    op.create_index('idx_job_instance', 'model_jobs', ['allocated_instance_id'])
    op.create_index('idx_job_team_user', 'model_jobs', ['team_id', 'user_id'])
    op.create_index('idx_upload_team_user', 'uploads', ['team_id', 'user_id'])
    op.create_index('idx_upload_retention', 'uploads', ['retention_expires_at'])
    op.create_index('idx_model_team_visibility', 'models', ['team_id', 'visibility'])
    op.create_index('idx_model_deployment', 'models', ['deployment_status'])
    op.create_index('idx_data_access_policies_resource', 'data_access_policies', ['resource_type', 'resource_id'])
    op.create_index('idx_data_access_policies_subject', 'data_access_policies', ['subject_type', 'subject_id'])

def downgrade():
    """Remove enhanced data isolation and resource integration tables"""
    
    # Drop indexes
    op.drop_index('idx_data_access_policies_subject')
    op.drop_index('idx_data_access_policies_resource')
    op.drop_index('idx_model_deployment')
    op.drop_index('idx_model_team_visibility')
    op.drop_index('idx_upload_retention')
    op.drop_index('idx_upload_team_user')
    op.drop_index('idx_job_team_user')
    op.drop_index('idx_job_instance')
    op.drop_index('idx_job_resource_status')
    
    # Remove added columns from existing tables
    op.drop_column('users', 'preferred_compute_region')
    op.drop_column('users', 'total_predictions_made')
    op.drop_column('users', 'total_data_uploaded_gb')
    op.drop_column('users', 'monthly_token_usage')
    op.drop_column('users', 'daily_token_usage')
    op.drop_column('users', 'current_active_jobs')
    
    op.drop_column('models', 'last_used_for_prediction')
    op.drop_column('models', 'deployment_status')
    op.drop_column('models', 'model_validation_metrics')
    op.drop_column('models', 'total_predictions_made')
    op.drop_column('models', 'inference_cost_tokens')
    op.drop_column('models', 'model_size_mb')
    op.drop_column('models', 'model_artifacts_path')
    op.drop_column('models', 'training_data_lineage')
    
    op.drop_column('uploads', 'retention_expires_at')
    op.drop_column('uploads', 'last_used_at')
    op.drop_column('uploads', 'usage_count')
    op.drop_column('uploads', 'preprocessing_applied')
    op.drop_column('uploads', 'source_transformation_id')
    op.drop_column('uploads', 'data_lineage_id')
    
    op.drop_column('teams', 'usage_last_updated')
    op.drop_column('teams', 'monthly_token_usage')
    op.drop_column('teams', 'daily_token_usage')
    op.drop_column('teams', 'current_storage_usage')
    op.drop_column('teams', 'current_memory_usage')
    op.drop_column('teams', 'current_gpu_usage')
    op.drop_column('teams', 'current_cpu_usage')
    
    op.drop_column('model_jobs', 'data_access_permissions')
    op.drop_column('model_jobs', 'isolation_network_id')
    op.drop_column('model_jobs', 'container_id')
    op.drop_column('model_jobs', 'allocated_instance_id')
    op.drop_column('model_jobs', 'resource_allocation_status')
    op.drop_column('model_jobs', 'actual_resource_cost')
    op.drop_column('model_jobs', 'estimated_duration_hours')
    op.drop_column('model_jobs', 'estimated_cpu_cores')
    op.drop_column('model_jobs', 'estimated_memory_gb')
    op.drop_column('model_jobs', 'requires_gpu')
    
    # Drop new tables
    op.drop_table('data_classification')
    op.drop_table('team_resource_quotas')
    op.drop_table('resource_pool_assignments')
    op.drop_table('data_transformation_log')
    op.drop_table('resource_billing_log')
    op.drop_table('data_access_policies')
    op.drop_table('job_resource_allocations')