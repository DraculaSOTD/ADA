# Enhanced ADA Database Setup Guide

This document outlines the comprehensive database enhancements implemented for the ADA platform to provide multi-tenant data isolation, resource management integration, and complete audit trails.

## What Was Enhanced

### 1. Database Schema Improvements

#### New Tables Added:
- **job_resource_allocations**: Links training jobs to specific compute resources
- **data_access_policies**: Fine-grained access control policies
- **resource_billing_log**: Tracks actual resource usage and costs
- **data_transformation_log**: Complete data lineage for all ML operations
- **resource_pool_assignments**: Manages compute instance pools
- **team_resource_quotas**: Team-specific resource limits and controls
- **data_classification**: Automatic data sensitivity classification

#### Enhanced Existing Tables:
- **model_jobs**: Added resource allocation tracking, isolation settings
- **teams**: Added usage tracking and resource consumption monitoring
- **users**: Added enhanced usage statistics and preferences
- **models**: Added performance metrics, lineage tracking, deployment status
- **uploads**: Added lineage tracking, usage statistics, retention policies

### 2. Data Isolation & Security Features

#### Multi-Tenant Access Control:
- **Row-level security** for complete data separation between users/teams
- **Resource-based permissions** with granular access levels (read, write, admin, owner)
- **Team context switching** with proper membership validation
- **Data visibility controls** (private, team, public with proper filtering)

#### Enhanced Security:
- **Complete audit trails** for all data access and modifications
- **Security event monitoring** with automatic threat detection
- **API key usage tracking** with rate limiting support
- **Compliance logging** for GDPR, HIPAA, and other regulations

### 3. Resource Management Integration

#### Compute Resource Allocation:
- **Isolated execution environments** for each training job
- **Resource quota enforcement** at user and team levels
- **Cost tracking and billing** with token-based pricing
- **Resource usage monitoring** with real-time metrics

#### Training Pipeline Integration:
- **Resource-aware job scheduling** with priority queuing
- **Automatic resource allocation** based on job requirements
- **Container-based isolation** for secure multi-tenant execution
- **Performance and cost optimization** tracking

### 4. Data Lineage & Compliance

#### Complete Data Tracking:
- **End-to-end data lineage** from upload to model predictions
- **Transformation logging** with reproducibility information
- **Data quality monitoring** throughout the ML pipeline
- **Automatic data classification** for compliance requirements

## Setup Instructions

### 1. Database Migration

Run the enhanced migration to create new tables and update existing ones:

```bash
cd backend
export USE_SQLITE=true  # or configure PostgreSQL
python manage_database.sh migrate
```

Or manually with Alembic:
```bash
alembic upgrade 002_enhanced_isolation
```

### 2. Update API Endpoints

Replace the existing models API with the enhanced version:

```python
# In main.py or your FastAPI app setup
from routes.enhanced_models import router as enhanced_models_router

app.include_router(enhanced_models_router)
```

### 3. Initialize Default Resources

Create default compute instances and resource pools:

```python
# Run once to set up default resources
python setup_database.py
```

### 4. Configure Environment Variables

Add these settings to your environment:

```bash
# Resource Management
USE_SQLITE=true  # or false for PostgreSQL
DOCKER_ENABLED=true  # Enable container-based isolation
DEFAULT_CPU_QUOTA=100  # Default CPU hours per user per day
DEFAULT_MEMORY_QUOTA=200  # Default memory GB-hours per user per day
DEFAULT_TOKEN_LIMIT=10000  # Default daily token limit

# Security
ENABLE_DATA_ISOLATION=true
AUDIT_LOG_RETENTION_DAYS=365
ENABLE_AUTOMATIC_DATA_CLASSIFICATION=true

# Billing
ENABLE_RESOURCE_BILLING=true
CPU_COST_PER_HOUR=50  # Tokens per CPU hour
MEMORY_COST_PER_GB_HOUR=20  # Tokens per GB-hour
GPU_COST_PER_HOUR=500  # Tokens per GPU hour
```

### 5. Frontend Integration Points

Update your frontend to use the new enhanced endpoints:

#### Model Training:
```javascript
// Enhanced training with resource allocation
POST /api/v2/models/train
Headers: {
  'X-Team-Context': 'team-uuid-if-applicable'
}
Body: {
  model_name: "My Model",
  algorithm: "random_forest_clf",
  data_sources: [{"data_id": 123}],
  target_column: "target",
  resource_requirements: {
    cpu_cores: 4,
    memory_gb: 8,
    gpu_count: 0,
    max_duration_hours: 2
  }
}
```

#### Model Listing with Proper Isolation:
```javascript
// Get models with team-based filtering
GET /api/v2/models/?team_id=team-uuid&visibility=team&limit=50
```

#### Training Status with Resource Usage:
```javascript
// Get detailed training status
GET /api/v2/models/training/{job_id}/status
Response: {
  status: "training",
  progress: 75,
  resource_info: {
    instance_name: "Local CPU Instance",
    cpu_cores: 4,
    memory_gb: 8
  },
  estimated_cost: 400,
  actual_cost: 300
}
```

## Key Benefits Achieved

### 1. Complete Data Isolation
- Users can only see and access their own data and team data
- Public models are properly filtered based on access permissions
- Training jobs run in isolated environments with controlled data access

### 2. Resource Management
- Training jobs are allocated specific compute resources
- Resource usage is tracked and billed accurately
- Teams have quotas and usage limits enforced automatically

### 3. Audit & Compliance
- Complete audit trail of all data access and modifications
- Data lineage tracking for ML model reproducibility
- Compliance reporting for data governance requirements

### 4. Scalability & Performance
- Multi-tenant architecture supports hundreds of users/teams
- Resource pooling optimizes compute utilization
- Proper indexing for fast data access queries

## Security Considerations

### Data Protection:
- All data access goes through the data isolation middleware
- API endpoints validate permissions before any operations
- Database queries include proper filtering for multi-tenancy

### Resource Security:
- Training jobs run in isolated containers
- Network isolation prevents data leakage between jobs
- Resource quotas prevent abuse and ensure fair usage

### Audit & Monitoring:
- All operations are logged for security analysis
- Suspicious activity triggers automatic alerts
- Data access patterns are monitored for anomalies

## Troubleshooting

### Common Issues:

1. **Migration Errors**: Ensure all dependencies are installed and database is accessible
2. **Permission Denied**: Check that data isolation middleware is properly configured
3. **Resource Allocation Failures**: Verify compute instances are available and configured
4. **Data Access Issues**: Confirm user has proper team memberships and permissions

### Debugging:
- Check logs in `logs/` directory for detailed error information
- Use database admin tools to verify table structure matches expected schema
- Test API endpoints with proper authentication headers

## Next Steps

1. **Performance Optimization**: Add caching layers for frequently accessed data
2. **Advanced Analytics**: Implement usage analytics dashboard for administrators
3. **Cost Optimization**: Add predictive cost estimation for training jobs
4. **External Integrations**: Connect to cloud providers for scalable compute resources

For questions or issues, refer to the detailed implementation in the codebase or contact the development team.