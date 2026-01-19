"""
Database Migration: Multi-tenant Architecture Setup
Creates all necessary tables for teams, compute resources, security, and data isolation
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid
import os

# Revision identifiers
revision = '001_multi_tenant'
down_revision = None
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
    """Create multi-tenant architecture tables"""
    
    # Teams table
    op.create_table(
        'teams',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('owner_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('visibility', sa.String(20), default='private'),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('settings', sa.JSON, default={}),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Team members table
    op.create_table(
        'team_members',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('team_id', get_uuid_type(), sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('permissions', sa.JSON, default=[]),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('joined_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint('team_id', 'user_id', name='unique_team_user')
    )
    
    # Team invitations table
    op.create_table(
        'team_invitations',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('team_id', get_uuid_type(), sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('invitee_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('invited_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('message', sa.Text),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('expires_at', sa.DateTime, nullable=False),
        sa.Column('responded_at', sa.DateTime),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now())
    )
    
    # Team resources table
    op.create_table(
        'team_resources',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('team_id', get_uuid_type(), sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('resource_type', sa.String(50), nullable=False),
        sa.Column('resource_id', sa.String(255), nullable=False),
        sa.Column('allocated_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('allocated_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime),
        sa.Column('status', sa.String(20), default='active')
    )
    
    # Compute instances table
    op.create_table(
        'compute_instances',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('instance_type', sa.String(50), nullable=False),
        sa.Column('cpu_cores', sa.Integer, nullable=False),
        sa.Column('memory_gb', sa.Integer, nullable=False),
        sa.Column('gpu_count', sa.Integer, default=0),
        sa.Column('gpu_type', sa.String(100)),
        sa.Column('storage_gb', sa.Integer, nullable=False),
        sa.Column('hourly_cost_tokens', sa.Integer, nullable=False),
        sa.Column('status', sa.String(20), default='available'),
        sa.Column('region', sa.String(50)),
        sa.Column('availability_zone', sa.String(50)),
        sa.Column('docker_image', sa.String(255)),
        sa.Column('environment_config', sa.JSON, default={}),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Resource allocations table
    op.create_table(
        'resource_allocations',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('job_id', sa.Integer, sa.ForeignKey('model_jobs.id'), nullable=False),
        sa.Column('instance_id', get_uuid_type(), sa.ForeignKey('compute_instances.id'), nullable=False),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('allocated_cpu', sa.Integer, nullable=False),
        sa.Column('allocated_memory_gb', sa.Integer, nullable=False),
        sa.Column('allocated_gpu_count', sa.Integer, default=0),
        sa.Column('allocated_storage_gb', sa.Integer, nullable=False),
        sa.Column('container_id', sa.String(255)),
        sa.Column('estimated_cost_tokens', sa.Integer),
        sa.Column('actual_cost_tokens', sa.Integer),
        sa.Column('peak_cpu_usage', sa.Float),
        sa.Column('peak_memory_usage', sa.Float),
        sa.Column('status', sa.String(20), default='allocated'),
        sa.Column('allocated_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('started_at', sa.DateTime),
        sa.Column('released_at', sa.DateTime)
    )
    
    # Resource quotas table
    op.create_table(
        'resource_quotas',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('entity_type', sa.String(20), nullable=False),  # 'user' or 'team'
        sa.Column('entity_id', sa.String(255), nullable=False),
        sa.Column('max_cpu_hours', sa.Integer, default=100),
        sa.Column('max_memory_gb_hours', sa.Integer, default=200),
        sa.Column('max_storage_gb', sa.Integer, default=50),
        sa.Column('max_concurrent_jobs', sa.Integer, default=5),
        sa.Column('max_models', sa.Integer, default=10),
        sa.Column('max_uploads', sa.Integer, default=100),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint('entity_type', 'entity_id', name='unique_entity_quota')
    )
    
    # Resource usage logs table
    op.create_table(
        'resource_usage_log',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('allocation_id', get_uuid_type(), sa.ForeignKey('resource_allocations.id'), nullable=False),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('instance_id', get_uuid_type(), sa.ForeignKey('compute_instances.id'), nullable=False),
        sa.Column('cpu_usage_percent', sa.Float),
        sa.Column('memory_usage_percent', sa.Float),
        sa.Column('gpu_usage_percent', sa.Float),
        sa.Column('storage_usage_gb', sa.Float),
        sa.Column('network_io_mb', sa.Float),
        sa.Column('tokens_consumed_this_period', sa.Integer, default=0),
        sa.Column('timestamp', sa.DateTime, server_default=sa.func.now())
    )
    
    # Data access log table
    op.create_table(
        'data_access_log',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('team_id', get_uuid_type(), sa.ForeignKey('teams.id')),
        sa.Column('resource_type', sa.String(50), nullable=False),
        sa.Column('resource_id', sa.String(255), nullable=False),
        sa.Column('resource_owner_id', sa.Integer, sa.ForeignKey('users.id')),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('method', sa.String(10)),
        sa.Column('endpoint', sa.String(255)),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('user_agent', sa.Text),
        sa.Column('session_id', sa.String(255)),
        sa.Column('request_id', sa.String(255)),
        sa.Column('permission_source', sa.String(50)),
        sa.Column('authorization_level', sa.String(20)),
        sa.Column('success', sa.Boolean, nullable=False),
        sa.Column('error_code', sa.String(20)),
        sa.Column('error_message', sa.Text),
        sa.Column('response_size_bytes', sa.Integer),
        sa.Column('processing_time_ms', sa.Integer),
        sa.Column('details', sa.JSON, default={}),
        sa.Column('metadata', sa.JSON, default={}),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now())
    )
    
    # Data lineage table
    op.create_table(
        'data_lineage',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('source_id', sa.String(255), nullable=False),
        sa.Column('source_type', sa.String(50), nullable=False),
        sa.Column('source_name', sa.String(255)),
        sa.Column('source_checksum', sa.String(255)),
        sa.Column('target_id', sa.String(255), nullable=False),
        sa.Column('target_type', sa.String(50), nullable=False),
        sa.Column('target_name', sa.String(255)),
        sa.Column('target_checksum', sa.String(255)),
        sa.Column('transformation_type', sa.String(50), nullable=False),
        sa.Column('transformation_config', sa.JSON, default={}),
        sa.Column('transformation_code_hash', sa.String(255)),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('job_id', sa.Integer, sa.ForeignKey('model_jobs.id')),
        sa.Column('processing_node', sa.String(255)),
        sa.Column('data_quality_before', sa.JSON, default={}),
        sa.Column('data_quality_after', sa.JSON, default={}),
        sa.Column('validation_results', sa.JSON, default={}),
        sa.Column('started_at', sa.DateTime, nullable=False),
        sa.Column('completed_at', sa.DateTime, nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now())
    )
    
    # Data permissions table
    op.create_table(
        'data_permissions',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('data_id', sa.String(255), nullable=False),
        sa.Column('data_type', sa.String(50), nullable=False),
        sa.Column('data_name', sa.String(255)),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('team_id', get_uuid_type(), sa.ForeignKey('teams.id')),
        sa.Column('granted_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('granted_reason', sa.Text),
        sa.Column('permissions', sa.JSON, nullable=False),
        sa.Column('access_level', sa.String(20), default='read'),
        sa.Column('ip_restrictions', sa.JSON, default=[]),
        sa.Column('time_restrictions', sa.JSON, default={}),
        sa.Column('usage_limits', sa.JSON, default={}),
        sa.Column('expires_at', sa.DateTime),
        sa.Column('is_revoked', sa.Boolean, default=False),
        sa.Column('revoked_at', sa.DateTime),
        sa.Column('revoked_by', sa.Integer, sa.ForeignKey('users.id')),
        sa.Column('revocation_reason', sa.Text),
        sa.Column('access_count', sa.Integer, default=0),
        sa.Column('last_accessed', sa.DateTime),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Security events table
    op.create_table(
        'security_events',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('severity', sa.String(20), nullable=False),
        sa.Column('category', sa.String(50)),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id')),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('user_agent', sa.Text),
        sa.Column('session_id', sa.String(255)),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('resource_affected', sa.String(255)),
        sa.Column('action_attempted', sa.String(100)),
        sa.Column('system_state', sa.JSON, default={}),
        sa.Column('request_data', sa.JSON, default={}),
        sa.Column('response_data', sa.JSON, default={}),
        sa.Column('detected_by', sa.String(50)),
        sa.Column('automatic_response', sa.String(100)),
        sa.Column('requires_investigation', sa.Boolean, default=False),
        sa.Column('investigated', sa.Boolean, default=False),
        sa.Column('investigation_notes', sa.Text),
        sa.Column('resolved', sa.Boolean, default=False),
        sa.Column('resolved_by', sa.Integer, sa.ForeignKey('users.id')),
        sa.Column('resolved_at', sa.DateTime),
        sa.Column('resolution_notes', sa.Text),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now())
    )
    
    # API key usage table
    op.create_table(
        'api_key_usage',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('api_key_id', sa.Integer, sa.ForeignKey('api_keys.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('endpoint', sa.String(255), nullable=False),
        sa.Column('method', sa.String(10), nullable=False),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('user_agent', sa.Text),
        sa.Column('status_code', sa.Integer),
        sa.Column('response_size_bytes', sa.Integer),
        sa.Column('processing_time_ms', sa.Integer),
        sa.Column('tokens_consumed', sa.Integer, default=0),
        sa.Column('compute_seconds', sa.Integer, default=0),
        sa.Column('rate_limit_bucket', sa.String(100)),
        sa.Column('rate_limit_remaining', sa.Integer),
        sa.Column('timestamp', sa.DateTime, server_default=sa.func.now())
    )
    
    # Compliance log table
    op.create_table(
        'compliance_log',
        sa.Column('id', get_uuid_type(), primary_key=True),
        sa.Column('framework', sa.String(50), nullable=False),
        sa.Column('regulation', sa.String(100)),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id')),
        sa.Column('data_subject_id', sa.String(255)),
        sa.Column('data_types', sa.JSON, default=[]),
        sa.Column('data_categories', sa.JSON, default=[]),
        sa.Column('processing_purpose', sa.String(255)),
        sa.Column('legal_basis', sa.String(100)),
        sa.Column('processing_location', sa.String(100)),
        sa.Column('data_location', sa.String(100)),
        sa.Column('jurisdiction', sa.String(50)),
        sa.Column('retention_period', sa.Integer),
        sa.Column('scheduled_deletion', sa.DateTime),
        sa.Column('actual_deletion', sa.DateTime),
        sa.Column('performed_by', sa.Integer, sa.ForeignKey('users.id')),
        sa.Column('automated', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now())
    )
    
    # Add team_id columns to existing tables
    op.add_column('models', sa.Column('team_id', get_uuid_type(), sa.ForeignKey('teams.id')))
    op.add_column('uploads', sa.Column('team_id', get_uuid_type(), sa.ForeignKey('teams.id')))
    op.add_column('model_jobs', sa.Column('team_id', get_uuid_type(), sa.ForeignKey('teams.id')))
    
    # Add enhanced security columns to users table
    op.add_column('users', sa.Column('account_status', sa.String(20), default='active'))
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer, default=0))
    op.add_column('users', sa.Column('account_locked_until', sa.DateTime))
    op.add_column('users', sa.Column('password_changed_at', sa.DateTime))
    op.add_column('users', sa.Column('requires_password_change', sa.Boolean, default=False))
    op.add_column('users', sa.Column('data_retention_policy', sa.JSON, default=lambda: {"auto_delete_days": 365}))
    op.add_column('users', sa.Column('privacy_settings', sa.JSON, default=lambda: {"profile_visible": False, "activity_tracking": True}))
    op.add_column('users', sa.Column('consent_given', sa.JSON, default=lambda: {"data_processing": False, "analytics": False}))
    op.add_column('users', sa.Column('last_activity_at', sa.DateTime))
    op.add_column('users', sa.Column('total_compute_hours', sa.Integer, default=0))
    op.add_column('users', sa.Column('total_models_created', sa.Integer, default=0))
    
    # Add enhanced security columns to models table
    op.add_column('models', sa.Column('share_settings', sa.JSON, default=lambda: {"public": False, "team": True, "link_sharing": False}))
    op.add_column('models', sa.Column('access_permissions', sa.JSON, default=lambda: {"read": ["owner"], "write": ["owner"], "admin": ["owner"]}))
    op.add_column('models', sa.Column('is_template', sa.Boolean, default=False))
    op.add_column('models', sa.Column('is_featured', sa.Boolean, default=False))
    op.add_column('models', sa.Column('training_data_id', sa.Text))
    op.add_column('models', sa.Column('training_data_checksum', sa.Text))
    
    # Add enhanced security columns to uploads table
    op.add_column('uploads', sa.Column('original_filename', sa.Text))
    op.add_column('uploads', sa.Column('content_type', sa.String(100)))
    op.add_column('uploads', sa.Column('encoding', sa.String(50)))
    op.add_column('uploads', sa.Column('checksum', sa.String(255)))
    op.add_column('uploads', sa.Column('validation_status', sa.String(20), default='pending'))
    op.add_column('uploads', sa.Column('quality_score', sa.Integer))
    op.add_column('uploads', sa.Column('validation_results', sa.JSON, default={}))
    op.add_column('uploads', sa.Column('visibility', sa.String(20), default='private'))
    op.add_column('uploads', sa.Column('is_sensitive', sa.Boolean, default=False))
    op.add_column('uploads', sa.Column('data_classification', sa.String(50)))
    op.add_column('uploads', sa.Column('access_permissions', sa.JSON, default=lambda: {"read": ["owner"], "download": ["owner"]}))
    op.add_column('uploads', sa.Column('processing_errors', sa.JSON, default=[]))
    op.add_column('uploads', sa.Column('last_accessed', sa.DateTime))
    op.add_column('uploads', sa.Column('access_count', sa.Integer, default=0))
    op.add_column('uploads', sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()))
    
    # Add enhanced job tracking columns to model_jobs table
    op.add_column('model_jobs', sa.Column('estimated_token_cost', sa.Integer))
    op.add_column('model_jobs', sa.Column('resource_requirements', sa.JSON, default={}))
    op.add_column('model_jobs', sa.Column('priority', sa.Integer, default=1))
    op.add_column('model_jobs', sa.Column('queue_time_seconds', sa.Integer))
    op.add_column('model_jobs', sa.Column('retry_of_job_id', sa.Integer, sa.ForeignKey('model_jobs.id')))
    op.add_column('model_jobs', sa.Column('dependent_on_job_id', sa.Integer, sa.ForeignKey('model_jobs.id')))
    op.add_column('model_jobs', sa.Column('max_retries', sa.Integer, default=3))
    op.add_column('model_jobs', sa.Column('retry_count', sa.Integer, default=0))
    op.add_column('model_jobs', sa.Column('execution_context', sa.JSON, default={}))
    op.add_column('model_jobs', sa.Column('data_sources', sa.JSON, default=[]))
    op.add_column('model_jobs', sa.Column('isolation_level', sa.String(20), default='standard'))
    op.add_column('model_jobs', sa.Column('queued_at', sa.DateTime))
    
    # Create indexes for performance
    op.create_index('idx_team_members_user_team', 'team_members', ['user_id', 'team_id'])
    op.create_index('idx_team_members_status', 'team_members', ['status'])
    op.create_index('idx_data_access_log_user_resource', 'data_access_log', ['user_id', 'resource_type', 'resource_id'])
    op.create_index('idx_data_access_log_timestamp', 'data_access_log', ['created_at'])
    op.create_index('idx_resource_allocations_job', 'resource_allocations', ['job_id'])
    op.create_index('idx_resource_allocations_user', 'resource_allocations', ['user_id'])
    op.create_index('idx_resource_allocations_status', 'resource_allocations', ['status'])
    op.create_index('idx_security_events_user_timestamp', 'security_events', ['user_id', 'created_at'])
    op.create_index('idx_security_events_severity', 'security_events', ['severity'])
    op.create_index('idx_data_permissions_user_data', 'data_permissions', ['user_id', 'data_type', 'data_id'])
    op.create_index('idx_data_lineage_source', 'data_lineage', ['source_type', 'source_id'])
    op.create_index('idx_data_lineage_target', 'data_lineage', ['target_type', 'target_id'])


def downgrade():
    """Remove multi-tenant architecture tables"""
    
    # Drop indexes
    op.drop_index('idx_data_lineage_target')
    op.drop_index('idx_data_lineage_source')
    op.drop_index('idx_data_permissions_user_data')
    op.drop_index('idx_security_events_severity')
    op.drop_index('idx_security_events_user_timestamp')
    op.drop_index('idx_resource_allocations_status')
    op.drop_index('idx_resource_allocations_user')
    op.drop_index('idx_resource_allocations_job')
    op.drop_index('idx_data_access_log_timestamp')
    op.drop_index('idx_data_access_log_user_resource')
    op.drop_index('idx_team_members_status')
    op.drop_index('idx_team_members_user_team')
    
    # Remove added columns from existing tables
    op.drop_column('model_jobs', 'queued_at')
    op.drop_column('model_jobs', 'isolation_level')
    op.drop_column('model_jobs', 'data_sources')
    op.drop_column('model_jobs', 'execution_context')
    op.drop_column('model_jobs', 'retry_count')
    op.drop_column('model_jobs', 'max_retries')
    op.drop_column('model_jobs', 'dependent_on_job_id')
    op.drop_column('model_jobs', 'retry_of_job_id')
    op.drop_column('model_jobs', 'queue_time_seconds')
    op.drop_column('model_jobs', 'priority')
    op.drop_column('model_jobs', 'resource_requirements')
    op.drop_column('model_jobs', 'estimated_token_cost')
    op.drop_column('model_jobs', 'team_id')
    
    op.drop_column('uploads', 'updated_at')
    op.drop_column('uploads', 'access_count')
    op.drop_column('uploads', 'last_accessed')
    op.drop_column('uploads', 'processing_errors')
    op.drop_column('uploads', 'access_permissions')
    op.drop_column('uploads', 'data_classification')
    op.drop_column('uploads', 'is_sensitive')
    op.drop_column('uploads', 'visibility')
    op.drop_column('uploads', 'validation_results')
    op.drop_column('uploads', 'quality_score')
    op.drop_column('uploads', 'validation_status')
    op.drop_column('uploads', 'checksum')
    op.drop_column('uploads', 'encoding')
    op.drop_column('uploads', 'content_type')
    op.drop_column('uploads', 'original_filename')
    op.drop_column('uploads', 'team_id')
    
    op.drop_column('models', 'training_data_checksum')
    op.drop_column('models', 'training_data_id')
    op.drop_column('models', 'is_featured')
    op.drop_column('models', 'is_template')
    op.drop_column('models', 'access_permissions')
    op.drop_column('models', 'share_settings')
    op.drop_column('models', 'team_id')
    
    op.drop_column('users', 'total_models_created')
    op.drop_column('users', 'total_compute_hours')
    op.drop_column('users', 'last_activity_at')
    op.drop_column('users', 'consent_given')
    op.drop_column('users', 'privacy_settings')
    op.drop_column('users', 'data_retention_policy')
    op.drop_column('users', 'requires_password_change')
    op.drop_column('users', 'password_changed_at')
    op.drop_column('users', 'account_locked_until')
    op.drop_column('users', 'failed_login_attempts')
    op.drop_column('users', 'account_status')
    
    # Drop new tables
    op.drop_table('compliance_log')
    op.drop_table('api_key_usage')
    op.drop_table('security_events')
    op.drop_table('data_permissions')
    op.drop_table('data_lineage')
    op.drop_table('data_access_log')
    op.drop_table('resource_usage_log')
    op.drop_table('resource_quotas')
    op.drop_table('resource_allocations')
    op.drop_table('compute_instances')
    op.drop_table('team_resources')
    op.drop_table('team_invitations')
    op.drop_table('team_members')
    op.drop_table('teams')