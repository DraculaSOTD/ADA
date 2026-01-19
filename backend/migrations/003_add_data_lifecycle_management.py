"""
Database Migration: Data Lifecycle Management
Adds comprehensive data lifecycle tracking, download monitoring, and automatic cleanup
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid
import os

# Revision identifiers
revision = '003_data_lifecycle'
down_revision = '002_enhanced_isolation'
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
    """Create data lifecycle management tables and enhance existing models"""
    
    # Data Downloads tracking table
    op.create_table(
        'data_downloads',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        
        # Resource being downloaded
        sa.Column('resource_type', sa.String(50), nullable=False),
        sa.Column('resource_id', sa.String(255), nullable=False),
        sa.Column('resource_name', sa.String(255)),
        
        # Download details
        sa.Column('download_method', sa.String(50), default='api'),
        sa.Column('file_path', sa.Text),
        sa.Column('file_size_bytes', sa.Integer),
        sa.Column('download_duration_seconds', sa.Float),
        
        # Network and session info
        sa.Column('ip_address', sa.String(45)),
        sa.Column('user_agent', sa.Text),
        sa.Column('session_id', sa.String(255)),
        
        # Status tracking
        sa.Column('download_started_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('download_completed_at', sa.DateTime),
        sa.Column('download_successful', sa.Boolean, default=True),
        sa.Column('error_message', sa.Text),
        
        # Retention impact
        sa.Column('retention_timer_started', sa.Boolean, default=False),
        sa.Column('is_first_download', sa.Boolean, default=False),
        
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now())
    )
    
    # Data Retention Policies table
    op.create_table(
        'data_retention_policies',
        sa.Column('id', get_uuid_type(), primary_key=True),
        
        # Policy identification
        sa.Column('policy_name', sa.String(255), nullable=False),
        sa.Column('resource_type', sa.String(50), nullable=False),
        
        # Retention rules
        sa.Column('retention_type', sa.String(50), nullable=False),  # immediate, 24_hours, etc.
        sa.Column('retention_hours', sa.Integer),
        
        # Trigger conditions
        sa.Column('trigger_on_creation', sa.Boolean, default=False),
        sa.Column('trigger_on_first_download', sa.Boolean, default=True),
        sa.Column('trigger_on_job_completion', sa.Boolean, default=False),
        sa.Column('trigger_on_last_access', sa.Boolean, default=False),
        
        # Policy settings
        sa.Column('send_notifications', sa.Boolean, default=True),
        sa.Column('notification_hours_before', sa.Integer, default=2),
        sa.Column('allow_user_extension', sa.Boolean, default=False),
        sa.Column('max_extension_hours', sa.Integer, default=168),
        
        # Scope
        sa.Column('applies_to_all_users', sa.Boolean, default=True),
        sa.Column('specific_user_id', sa.Integer, sa.ForeignKey('users.id')),
        sa.Column('specific_team_id', get_uuid_type(), sa.ForeignKey('teams.id')),
        
        # Metadata
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Cleanup Jobs table
    op.create_table(
        'cleanup_jobs',
        sa.Column('id', get_uuid_type(), primary_key=True),
        
        # Job identification
        sa.Column('job_type', sa.String(50), nullable=False),
        sa.Column('cleanup_reason', sa.String(100)),
        
        # Scope
        sa.Column('resource_type', sa.String(50)),
        sa.Column('resource_ids', sa.JSON, default=lambda: []),
        sa.Column('user_filter', sa.Integer, sa.ForeignKey('users.id')),
        sa.Column('team_filter', get_uuid_type(), sa.ForeignKey('teams.id')),
        
        # Execution details
        sa.Column('scheduled_at', sa.DateTime, nullable=False),
        sa.Column('started_at', sa.DateTime),
        sa.Column('completed_at', sa.DateTime),
        
        # Status and results
        sa.Column('status', sa.String(20), default='scheduled'),
        sa.Column('items_processed', sa.Integer, default=0),
        sa.Column('items_deleted', sa.Integer, default=0),
        sa.Column('items_failed', sa.Integer, default=0),
        sa.Column('bytes_freed', sa.Integer, default=0),
        
        # Error handling
        sa.Column('error_count', sa.Integer, default=0),
        sa.Column('last_error', sa.Text),
        sa.Column('retry_count', sa.Integer, default=0),
        sa.Column('max_retries', sa.Integer, default=3),
        
        # Execution metadata
        sa.Column('execution_log', sa.JSON, default=lambda: []),
        sa.Column('performance_metrics', sa.JSON, default=lambda: {}),
        
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Data Lifecycle Events table
    op.create_table(
        'data_lifecycle_events',
        sa.Column('id', get_uuid_type(), primary_key=True),
        
        # Resource identification
        sa.Column('resource_type', sa.String(50), nullable=False),
        sa.Column('resource_id', sa.String(255), nullable=False),
        sa.Column('resource_name', sa.String(255)),
        
        # Event details
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('event_description', sa.Text),
        
        # Context
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id')),
        sa.Column('triggered_by', sa.String(50)),
        sa.Column('related_policy_id', get_uuid_type(), sa.ForeignKey('data_retention_policies.id')),
        sa.Column('related_cleanup_job_id', get_uuid_type(), sa.ForeignKey('cleanup_jobs.id')),
        
        # Lifecycle state changes
        sa.Column('previous_status', sa.String(50)),
        sa.Column('new_status', sa.String(50)),
        sa.Column('previous_expiration', sa.DateTime),
        sa.Column('new_expiration', sa.DateTime),
        
        # Additional metadata
        sa.Column('metadata', sa.JSON, default=lambda: {}),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('user_agent', sa.Text),
        
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now())
    )
    
    # User Retention Preferences table
    op.create_table(
        'user_retention_preferences',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False, unique=True),
        
        # Notification preferences
        sa.Column('email_notifications', sa.Boolean, default=True),
        sa.Column('notification_hours_before', sa.Integer, default=2),
        sa.Column('send_daily_summary', sa.Boolean, default=False),
        
        # Default retention preferences
        sa.Column('default_generated_data_retention', sa.String(20), default='24_hours'),
        sa.Column('default_prediction_retention', sa.String(20), default='24_hours'),
        sa.Column('default_training_data_retention', sa.String(20), default='training_complete'),
        
        # Extension preferences
        sa.Column('auto_extend_before_expiry', sa.Boolean, default=False),
        sa.Column('max_auto_extensions', sa.Integer, default=3),
        
        # Storage preferences
        sa.Column('compress_old_data', sa.Boolean, default=True),
        sa.Column('archive_instead_of_delete', sa.Boolean, default=False),
        sa.Column('archive_location', sa.String(255)),
        
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Add lifecycle columns to existing tables
    
    # Enhance uploads table with lifecycle tracking
    op.add_column('uploads', sa.Column('lifecycle_status', sa.String(50), default='active'))
    op.add_column('uploads', sa.Column('first_downloaded_at', sa.DateTime))
    op.add_column('uploads', sa.Column('download_count', sa.Integer, default=0))
    op.add_column('uploads', sa.Column('retention_policy_id', get_uuid_type(), sa.ForeignKey('data_retention_policies.id')))
    op.add_column('uploads', sa.Column('expires_at', sa.DateTime))
    op.add_column('uploads', sa.Column('expiry_notified_at', sa.DateTime))
    op.add_column('uploads', sa.Column('user_extended_until', sa.DateTime))
    op.add_column('uploads', sa.Column('scheduled_deletion_at', sa.DateTime))
    op.add_column('uploads', sa.Column('temporary_workspace_path', sa.Text))
    op.add_column('uploads', sa.Column('is_temporary', sa.Boolean, default=False))
    
    # Enhance generated_data table with lifecycle tracking
    op.add_column('generated_data', sa.Column('lifecycle_status', sa.String(50), default='active'))
    op.add_column('generated_data', sa.Column('first_downloaded_at', sa.DateTime))
    op.add_column('generated_data', sa.Column('download_count', sa.Integer, default=0))
    op.add_column('generated_data', sa.Column('retention_policy_id', get_uuid_type(), sa.ForeignKey('data_retention_policies.id')))
    op.add_column('generated_data', sa.Column('expires_at', sa.DateTime))
    op.add_column('generated_data', sa.Column('expiry_notified_at', sa.DateTime))
    op.add_column('generated_data', sa.Column('user_extended_until', sa.DateTime))
    op.add_column('generated_data', sa.Column('scheduled_deletion_at', sa.DateTime))
    op.add_column('generated_data', sa.Column('is_temporary', sa.Boolean, default=False))
    
    # Enhance prediction_results table with lifecycle tracking
    op.add_column('prediction_results', sa.Column('lifecycle_status', sa.String(50), default='active'))
    op.add_column('prediction_results', sa.Column('first_downloaded_at', sa.DateTime))
    op.add_column('prediction_results', sa.Column('download_count', sa.Integer, default=0))
    op.add_column('prediction_results', sa.Column('retention_policy_id', get_uuid_type(), sa.ForeignKey('data_retention_policies.id')))
    op.add_column('prediction_results', sa.Column('expires_at', sa.DateTime))
    op.add_column('prediction_results', sa.Column('expiry_notified_at', sa.DateTime))
    op.add_column('prediction_results', sa.Column('user_extended_until', sa.DateTime))
    op.add_column('prediction_results', sa.Column('scheduled_deletion_at', sa.DateTime))
    
    # Enhance model_jobs table for temporary workspace tracking
    op.add_column('model_jobs', sa.Column('temporary_workspace_path', sa.Text))
    op.add_column('model_jobs', sa.Column('workspace_cleanup_status', sa.String(20), default='pending'))
    op.add_column('model_jobs', sa.Column('workspace_cleaned_at', sa.DateTime))
    op.add_column('model_jobs', sa.Column('data_files_cleaned', sa.Boolean, default=False))
    
    # Create indexes for performance
    op.create_index('idx_data_downloads_user_resource', 'data_downloads', ['user_id', 'resource_type', 'resource_id'])
    op.create_index('idx_data_downloads_timestamp', 'data_downloads', ['download_started_at'])
    op.create_index('idx_retention_policies_type', 'data_retention_policies', ['resource_type', 'retention_type'])
    op.create_index('idx_cleanup_jobs_status', 'cleanup_jobs', ['status'])
    op.create_index('idx_cleanup_jobs_scheduled', 'cleanup_jobs', ['scheduled_at'])
    op.create_index('idx_lifecycle_events_resource', 'data_lifecycle_events', ['resource_type', 'resource_id'])
    op.create_index('idx_lifecycle_events_timestamp', 'data_lifecycle_events', ['created_at'])
    
    # Lifecycle status indexes for existing tables
    op.create_index('idx_uploads_lifecycle', 'uploads', ['lifecycle_status'])
    op.create_index('idx_uploads_expires_at', 'uploads', ['expires_at'])
    op.create_index('idx_uploads_scheduled_deletion', 'uploads', ['scheduled_deletion_at'])
    op.create_index('idx_generated_data_lifecycle', 'generated_data', ['lifecycle_status'])
    op.create_index('idx_generated_data_expires_at', 'generated_data', ['expires_at'])
    op.create_index('idx_prediction_results_lifecycle', 'prediction_results', ['lifecycle_status'])
    op.create_index('idx_prediction_results_expires_at', 'prediction_results', ['expires_at'])


def downgrade():
    """Remove data lifecycle management tables and columns"""
    
    # Drop indexes
    op.drop_index('idx_prediction_results_expires_at')
    op.drop_index('idx_prediction_results_lifecycle')
    op.drop_index('idx_generated_data_expires_at')
    op.drop_index('idx_generated_data_lifecycle')
    op.drop_index('idx_uploads_scheduled_deletion')
    op.drop_index('idx_uploads_expires_at')
    op.drop_index('idx_uploads_lifecycle')
    op.drop_index('idx_lifecycle_events_timestamp')
    op.drop_index('idx_lifecycle_events_resource')
    op.drop_index('idx_cleanup_jobs_scheduled')
    op.drop_index('idx_cleanup_jobs_status')
    op.drop_index('idx_retention_policies_type')
    op.drop_index('idx_data_downloads_timestamp')
    op.drop_index('idx_data_downloads_user_resource')
    
    # Remove added columns from existing tables
    op.drop_column('model_jobs', 'data_files_cleaned')
    op.drop_column('model_jobs', 'workspace_cleaned_at')
    op.drop_column('model_jobs', 'workspace_cleanup_status')
    op.drop_column('model_jobs', 'temporary_workspace_path')
    
    op.drop_column('prediction_results', 'scheduled_deletion_at')
    op.drop_column('prediction_results', 'user_extended_until')
    op.drop_column('prediction_results', 'expiry_notified_at')
    op.drop_column('prediction_results', 'expires_at')
    op.drop_column('prediction_results', 'retention_policy_id')
    op.drop_column('prediction_results', 'download_count')
    op.drop_column('prediction_results', 'first_downloaded_at')
    op.drop_column('prediction_results', 'lifecycle_status')
    
    op.drop_column('generated_data', 'is_temporary')
    op.drop_column('generated_data', 'scheduled_deletion_at')
    op.drop_column('generated_data', 'user_extended_until')
    op.drop_column('generated_data', 'expiry_notified_at')
    op.drop_column('generated_data', 'expires_at')
    op.drop_column('generated_data', 'retention_policy_id')
    op.drop_column('generated_data', 'download_count')
    op.drop_column('generated_data', 'first_downloaded_at')
    op.drop_column('generated_data', 'lifecycle_status')
    
    op.drop_column('uploads', 'is_temporary')
    op.drop_column('uploads', 'temporary_workspace_path')
    op.drop_column('uploads', 'scheduled_deletion_at')
    op.drop_column('uploads', 'user_extended_until')
    op.drop_column('uploads', 'expiry_notified_at')
    op.drop_column('uploads', 'expires_at')
    op.drop_column('uploads', 'retention_policy_id')
    op.drop_column('uploads', 'download_count')
    op.drop_column('uploads', 'first_downloaded_at')
    op.drop_column('uploads', 'lifecycle_status')
    
    # Drop new tables
    op.drop_table('user_retention_preferences')
    op.drop_table('data_lifecycle_events')
    op.drop_table('cleanup_jobs')
    op.drop_table('data_retention_policies')
    op.drop_table('data_downloads')