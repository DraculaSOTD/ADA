"""
Admin Service
Comprehensive administrative functionality for the ADA platform
"""

import os
import json
import psutil
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import logging
import redis
import subprocess

logger = logging.getLogger(__name__)


class AdminAction(Enum):
    """Administrative actions"""
    USER_SUSPEND = "user.suspend"
    USER_ACTIVATE = "user.activate"
    USER_DELETE = "user.delete"
    USER_RESET_PASSWORD = "user.reset_password"
    USER_MODIFY_QUOTA = "user.modify_quota"
    
    MODEL_DELETE = "model.delete"
    MODEL_QUARANTINE = "model.quarantine"
    MODEL_APPROVE = "model.approve"
    
    JOB_CANCEL = "job.cancel"
    JOB_PRIORITY_CHANGE = "job.priority_change"
    
    SYSTEM_RESTART = "system.restart"
    SYSTEM_BACKUP = "system.backup"
    SYSTEM_RESTORE = "system.restore"
    SYSTEM_MAINTENANCE = "system.maintenance"
    
    CACHE_CLEAR = "cache.clear"
    LOGS_EXPORT = "logs.export"
    METRICS_EXPORT = "metrics.export"


@dataclass
class SystemStatus:
    """System status information"""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    network_io: Dict[str, int]
    active_users: int
    active_jobs: int
    models_deployed: int
    api_requests_per_minute: int
    error_rate: float
    services_status: Dict[str, str]
    alerts: List[Dict]


@dataclass
class UserStatistics:
    """User statistics"""
    user_id: str
    username: str
    created_at: datetime
    last_login: Optional[datetime]
    total_logins: int
    models_created: int
    jobs_executed: int
    storage_used_mb: int
    api_calls_made: int
    tokens_consumed: int
    violations: List[Dict]
    status: str


@dataclass
class SystemMetrics:
    """System-wide metrics"""
    total_users: int
    active_users_24h: int
    total_models: int
    total_jobs: int
    storage_used_gb: float
    compute_hours_used: float
    api_calls_total: int
    revenue_generated: float
    top_users: List[Dict]
    top_models: List[Dict]


class AdminService:
    """Administrative service for platform management"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.redis_client = redis.Redis(
            host=config.get('redis_host', 'localhost'),
            port=config.get('redis_port', 6379),
            decode_responses=True
        )
        self.audit_enabled = config.get('audit_enabled', True)
        self.backup_path = config.get('backup_path', '/backups')
        self.maintenance_mode = False
    
    # System Monitoring
    async def get_system_status(self) -> SystemStatus:
        """Get comprehensive system status"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            
            # Network I/O
            network = psutil.net_io_counters()
            network_io = {
                'bytes_sent': network.bytes_sent,
                'bytes_recv': network.bytes_recv,
                'packets_sent': network.packets_sent,
                'packets_recv': network.packets_recv
            }
            
            # Active users (from Redis)
            active_users = await self._count_active_users()
            
            # Active jobs
            active_jobs = await self._count_active_jobs()
            
            # Deployed models
            models_deployed = await self._count_deployed_models()
            
            # API metrics
            api_requests_per_minute = await self._get_api_request_rate()
            error_rate = await self._get_error_rate()
            
            # Services status
            services_status = await self._check_services_status()
            
            # Active alerts
            alerts = await self._get_active_alerts()
            
            return SystemStatus(
                timestamp=datetime.utcnow(),
                cpu_percent=cpu_percent,
                memory_percent=memory_percent,
                disk_percent=disk_percent,
                network_io=network_io,
                active_users=active_users,
                active_jobs=active_jobs,
                models_deployed=models_deployed,
                api_requests_per_minute=api_requests_per_minute,
                error_rate=error_rate,
                services_status=services_status,
                alerts=alerts
            )
            
        except Exception as e:
            logger.error(f"Failed to get system status: {str(e)}")
            raise
    
    async def get_system_metrics(self, time_range: str = '24h') -> SystemMetrics:
        """Get system-wide metrics"""
        try:
            # Parse time range
            hours = self._parse_time_range(time_range)
            start_time = datetime.utcnow() - timedelta(hours=hours)
            
            # Gather metrics
            total_users = await self._count_total_users()
            active_users_24h = await self._count_active_users(hours=24)
            total_models = await self._count_total_models()
            total_jobs = await self._count_total_jobs()
            storage_used_gb = await self._calculate_storage_usage()
            compute_hours_used = await self._calculate_compute_hours(start_time)
            api_calls_total = await self._count_api_calls(start_time)
            revenue_generated = await self._calculate_revenue(start_time)
            
            # Get top users and models
            top_users = await self._get_top_users(limit=10)
            top_models = await self._get_top_models(limit=10)
            
            return SystemMetrics(
                total_users=total_users,
                active_users_24h=active_users_24h,
                total_models=total_models,
                total_jobs=total_jobs,
                storage_used_gb=storage_used_gb,
                compute_hours_used=compute_hours_used,
                api_calls_total=api_calls_total,
                revenue_generated=revenue_generated,
                top_users=top_users,
                top_models=top_models
            )
            
        except Exception as e:
            logger.error(f"Failed to get system metrics: {str(e)}")
            raise
    
    # User Management
    async def get_user_statistics(self, user_id: str) -> UserStatistics:
        """Get detailed user statistics"""
        try:
            # Get user data
            user_data = await self._get_user_data(user_id)
            
            # Calculate statistics
            stats = UserStatistics(
                user_id=user_id,
                username=user_data.get('username', 'unknown'),
                created_at=datetime.fromisoformat(user_data.get('created_at', datetime.utcnow().isoformat())),
                last_login=datetime.fromisoformat(user_data['last_login']) if user_data.get('last_login') else None,
                total_logins=await self._count_user_logins(user_id),
                models_created=await self._count_user_models(user_id),
                jobs_executed=await self._count_user_jobs(user_id),
                storage_used_mb=await self._calculate_user_storage(user_id),
                api_calls_made=await self._count_user_api_calls(user_id),
                tokens_consumed=await self._count_user_tokens(user_id),
                violations=await self._get_user_violations(user_id),
                status=user_data.get('status', 'active')
            )
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get user statistics: {str(e)}")
            raise
    
    async def suspend_user(self, user_id: str, reason: str, 
                          duration_hours: Optional[int] = None,
                          admin_id: str = None) -> Dict[str, Any]:
        """Suspend a user account"""
        try:
            # Update user status
            suspension_data = {
                'status': 'suspended',
                'suspension_reason': reason,
                'suspended_at': datetime.utcnow().isoformat(),
                'suspended_by': admin_id
            }
            
            if duration_hours:
                suspension_data['suspension_expires'] = (
                    datetime.utcnow() + timedelta(hours=duration_hours)
                ).isoformat()
            
            # Update user record
            await self._update_user(user_id, suspension_data)
            
            # Revoke active sessions
            await self._revoke_user_sessions(user_id)
            
            # Cancel active jobs
            await self._cancel_user_jobs(user_id)
            
            # Log action
            await self._log_admin_action(AdminAction.USER_SUSPEND, {
                'user_id': user_id,
                'reason': reason,
                'duration_hours': duration_hours,
                'admin_id': admin_id
            })
            
            return {
                'success': True,
                'message': f'User {user_id} suspended successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to suspend user: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def activate_user(self, user_id: str, admin_id: str = None) -> Dict[str, Any]:
        """Activate a suspended user account"""
        try:
            # Update user status
            activation_data = {
                'status': 'active',
                'suspension_reason': None,
                'suspended_at': None,
                'suspended_by': None,
                'suspension_expires': None,
                'activated_at': datetime.utcnow().isoformat(),
                'activated_by': admin_id
            }
            
            # Update user record
            await self._update_user(user_id, activation_data)
            
            # Log action
            await self._log_admin_action(AdminAction.USER_ACTIVATE, {
                'user_id': user_id,
                'admin_id': admin_id
            })
            
            return {
                'success': True,
                'message': f'User {user_id} activated successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to activate user: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def delete_user(self, user_id: str, admin_id: str = None,
                         permanent: bool = False) -> Dict[str, Any]:
        """Delete a user account"""
        try:
            if permanent:
                # Permanent deletion
                # Delete user data
                await self._delete_user_data(user_id)
                
                # Delete user models
                await self._delete_user_models(user_id)
                
                # Delete user jobs
                await self._delete_user_jobs(user_id)
                
                # Delete user files
                await self._delete_user_files(user_id)
                
                # Remove from database
                await self._remove_user(user_id)
                
                message = f'User {user_id} permanently deleted'
            else:
                # Soft deletion
                deletion_data = {
                    'status': 'deleted',
                    'deleted_at': datetime.utcnow().isoformat(),
                    'deleted_by': admin_id
                }
                
                await self._update_user(user_id, deletion_data)
                
                # Revoke sessions
                await self._revoke_user_sessions(user_id)
                
                message = f'User {user_id} marked as deleted'
            
            # Log action
            await self._log_admin_action(AdminAction.USER_DELETE, {
                'user_id': user_id,
                'permanent': permanent,
                'admin_id': admin_id
            })
            
            return {'success': True, 'message': message}
            
        except Exception as e:
            logger.error(f"Failed to delete user: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def modify_user_quota(self, user_id: str, quota_type: str,
                               new_value: int, admin_id: str = None) -> Dict[str, Any]:
        """Modify user resource quotas"""
        try:
            # Get current quotas
            quotas = await self._get_user_quotas(user_id)
            
            # Update quota
            quotas[quota_type] = new_value
            
            # Save updated quotas
            await self._update_user_quotas(user_id, quotas)
            
            # Log action
            await self._log_admin_action(AdminAction.USER_MODIFY_QUOTA, {
                'user_id': user_id,
                'quota_type': quota_type,
                'new_value': new_value,
                'admin_id': admin_id
            })
            
            return {
                'success': True,
                'message': f'Quota {quota_type} updated to {new_value} for user {user_id}'
            }
            
        except Exception as e:
            logger.error(f"Failed to modify user quota: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # Model Management
    async def quarantine_model(self, model_id: str, reason: str,
                              admin_id: str = None) -> Dict[str, Any]:
        """Quarantine a model for review"""
        try:
            # Update model status
            quarantine_data = {
                'status': 'quarantined',
                'quarantine_reason': reason,
                'quarantined_at': datetime.utcnow().isoformat(),
                'quarantined_by': admin_id
            }
            
            # Update model
            await self._update_model(model_id, quarantine_data)
            
            # Disable model endpoints
            await self._disable_model_endpoints(model_id)
            
            # Notify model owner
            await self._notify_model_owner(model_id, 'quarantine', reason)
            
            # Log action
            await self._log_admin_action(AdminAction.MODEL_QUARANTINE, {
                'model_id': model_id,
                'reason': reason,
                'admin_id': admin_id
            })
            
            return {
                'success': True,
                'message': f'Model {model_id} quarantined successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to quarantine model: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def approve_model(self, model_id: str, admin_id: str = None) -> Dict[str, Any]:
        """Approve a quarantined model"""
        try:
            # Update model status
            approval_data = {
                'status': 'approved',
                'quarantine_reason': None,
                'quarantined_at': None,
                'quarantined_by': None,
                'approved_at': datetime.utcnow().isoformat(),
                'approved_by': admin_id
            }
            
            # Update model
            await self._update_model(model_id, approval_data)
            
            # Re-enable model endpoints
            await self._enable_model_endpoints(model_id)
            
            # Notify model owner
            await self._notify_model_owner(model_id, 'approved', 'Model approved for use')
            
            # Log action
            await self._log_admin_action(AdminAction.MODEL_APPROVE, {
                'model_id': model_id,
                'admin_id': admin_id
            })
            
            return {
                'success': True,
                'message': f'Model {model_id} approved successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to approve model: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # System Operations
    async def enable_maintenance_mode(self, message: str = None,
                                     estimated_duration_minutes: int = None,
                                     admin_id: str = None) -> Dict[str, Any]:
        """Enable system maintenance mode"""
        try:
            self.maintenance_mode = True
            
            # Store maintenance info
            maintenance_info = {
                'enabled': True,
                'message': message or 'System is under maintenance',
                'started_at': datetime.utcnow().isoformat(),
                'estimated_end': (datetime.utcnow() + timedelta(minutes=estimated_duration_minutes)).isoformat() 
                                if estimated_duration_minutes else None,
                'admin_id': admin_id
            }
            
            self.redis_client.hset('system:maintenance', mapping=maintenance_info)
            
            # Notify all connected users
            await self._broadcast_maintenance_notification(maintenance_info)
            
            # Log action
            await self._log_admin_action(AdminAction.SYSTEM_MAINTENANCE, maintenance_info)
            
            return {
                'success': True,
                'message': 'Maintenance mode enabled'
            }
            
        except Exception as e:
            logger.error(f"Failed to enable maintenance mode: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def disable_maintenance_mode(self, admin_id: str = None) -> Dict[str, Any]:
        """Disable system maintenance mode"""
        try:
            self.maintenance_mode = False
            
            # Clear maintenance info
            self.redis_client.delete('system:maintenance')
            
            # Notify all users
            await self._broadcast_maintenance_ended()
            
            # Log action
            await self._log_admin_action(AdminAction.SYSTEM_MAINTENANCE, {
                'enabled': False,
                'admin_id': admin_id
            })
            
            return {
                'success': True,
                'message': 'Maintenance mode disabled'
            }
            
        except Exception as e:
            logger.error(f"Failed to disable maintenance mode: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def backup_system(self, backup_type: str = 'full',
                           admin_id: str = None) -> Dict[str, Any]:
        """Create system backup"""
        try:
            backup_id = f"backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            backup_dir = os.path.join(self.backup_path, backup_id)
            os.makedirs(backup_dir, exist_ok=True)
            
            if backup_type == 'full':
                # Backup database
                await self._backup_database(backup_dir)
                
                # Backup Redis
                await self._backup_redis(backup_dir)
                
                # Backup files
                await self._backup_files(backup_dir)
                
                # Backup configurations
                await self._backup_configs(backup_dir)
            
            elif backup_type == 'database':
                await self._backup_database(backup_dir)
            
            elif backup_type == 'files':
                await self._backup_files(backup_dir)
            
            # Create backup manifest
            manifest = {
                'backup_id': backup_id,
                'backup_type': backup_type,
                'created_at': datetime.utcnow().isoformat(),
                'created_by': admin_id,
                'size_mb': self._get_directory_size(backup_dir)
            }
            
            with open(os.path.join(backup_dir, 'manifest.json'), 'w') as f:
                json.dump(manifest, f, indent=2)
            
            # Log action
            await self._log_admin_action(AdminAction.SYSTEM_BACKUP, manifest)
            
            return {
                'success': True,
                'backup_id': backup_id,
                'message': f'{backup_type.capitalize()} backup created successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to create backup: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def restore_system(self, backup_id: str, admin_id: str = None) -> Dict[str, Any]:
        """Restore system from backup"""
        try:
            backup_dir = os.path.join(self.backup_path, backup_id)
            
            if not os.path.exists(backup_dir):
                return {'success': False, 'error': 'Backup not found'}
            
            # Read manifest
            with open(os.path.join(backup_dir, 'manifest.json'), 'r') as f:
                manifest = json.load(f)
            
            # Enable maintenance mode during restore
            await self.enable_maintenance_mode(
                message='System restore in progress',
                admin_id=admin_id
            )
            
            try:
                if manifest['backup_type'] == 'full':
                    # Restore database
                    await self._restore_database(backup_dir)
                    
                    # Restore Redis
                    await self._restore_redis(backup_dir)
                    
                    # Restore files
                    await self._restore_files(backup_dir)
                    
                    # Restore configurations
                    await self._restore_configs(backup_dir)
                
                elif manifest['backup_type'] == 'database':
                    await self._restore_database(backup_dir)
                
                elif manifest['backup_type'] == 'files':
                    await self._restore_files(backup_dir)
                
                # Log action
                await self._log_admin_action(AdminAction.SYSTEM_RESTORE, {
                    'backup_id': backup_id,
                    'backup_type': manifest['backup_type'],
                    'admin_id': admin_id
                })
                
                return {
                    'success': True,
                    'message': 'System restored successfully'
                }
                
            finally:
                # Disable maintenance mode
                await self.disable_maintenance_mode(admin_id=admin_id)
            
        except Exception as e:
            logger.error(f"Failed to restore system: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def clear_cache(self, cache_type: str = 'all',
                         admin_id: str = None) -> Dict[str, Any]:
        """Clear system caches"""
        try:
            cleared_items = 0
            
            if cache_type in ['all', 'redis']:
                # Clear Redis cache
                pattern = 'cache:*'
                for key in self.redis_client.scan_iter(pattern):
                    self.redis_client.delete(key)
                    cleared_items += 1
            
            if cache_type in ['all', 'model']:
                # Clear model cache
                pattern = 'model:cache:*'
                for key in self.redis_client.scan_iter(pattern):
                    self.redis_client.delete(key)
                    cleared_items += 1
            
            if cache_type in ['all', 'api']:
                # Clear API response cache
                pattern = 'api:cache:*'
                for key in self.redis_client.scan_iter(pattern):
                    self.redis_client.delete(key)
                    cleared_items += 1
            
            # Log action
            await self._log_admin_action(AdminAction.CACHE_CLEAR, {
                'cache_type': cache_type,
                'cleared_items': cleared_items,
                'admin_id': admin_id
            })
            
            return {
                'success': True,
                'cleared_items': cleared_items,
                'message': f'{cache_type.capitalize()} cache cleared successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to clear cache: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # Audit and Logging
    async def get_audit_logs(self, filters: Dict = None,
                            limit: int = 100) -> List[Dict]:
        """Get audit logs with optional filters"""
        try:
            logs = []
            
            # Get logs from Redis
            log_keys = self.redis_client.lrange('audit:admin_actions', 0, -1)
            
            for log_key in log_keys[:limit]:
                log_entry = json.loads(log_key)
                
                # Apply filters
                if filters:
                    if 'action' in filters and log_entry['action'] != filters['action']:
                        continue
                    if 'admin_id' in filters and log_entry.get('admin_id') != filters['admin_id']:
                        continue
                    if 'start_date' in filters:
                        log_date = datetime.fromisoformat(log_entry['timestamp'])
                        if log_date < datetime.fromisoformat(filters['start_date']):
                            continue
                
                logs.append(log_entry)
            
            return logs
            
        except Exception as e:
            logger.error(f"Failed to get audit logs: {str(e)}")
            return []
    
    async def export_logs(self, log_type: str = 'all',
                         start_date: Optional[datetime] = None,
                         end_date: Optional[datetime] = None,
                         format: str = 'json') -> Dict[str, Any]:
        """Export system logs"""
        try:
            export_id = f"logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            export_path = f"/exports/{export_id}.{format}"
            
            # Collect logs
            logs = await self._collect_logs(log_type, start_date, end_date)
            
            # Export in requested format
            if format == 'json':
                with open(export_path, 'w') as f:
                    json.dump(logs, f, indent=2, default=str)
            
            elif format == 'csv':
                import csv
                with open(export_path, 'w', newline='') as f:
                    if logs:
                        writer = csv.DictWriter(f, fieldnames=logs[0].keys())
                        writer.writeheader()
                        writer.writerows(logs)
            
            # Log action
            await self._log_admin_action(AdminAction.LOGS_EXPORT, {
                'log_type': log_type,
                'start_date': start_date.isoformat() if start_date else None,
                'end_date': end_date.isoformat() if end_date else None,
                'format': format,
                'export_path': export_path
            })
            
            return {
                'success': True,
                'export_path': export_path,
                'record_count': len(logs)
            }
            
        except Exception as e:
            logger.error(f"Failed to export logs: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # Helper Methods
    async def _log_admin_action(self, action: AdminAction, metadata: Dict):
        """Log administrative action"""
        if not self.audit_enabled:
            return
        
        log_entry = {
            'action': action.value,
            'timestamp': datetime.utcnow().isoformat(),
            'metadata': metadata
        }
        
        # Store in Redis
        self.redis_client.lpush('audit:admin_actions', json.dumps(log_entry))
        
        # Trim to keep last 10000 entries
        self.redis_client.ltrim('audit:admin_actions', 0, 9999)
    
    async def _count_active_users(self, hours: int = 1) -> int:
        """Count active users in the last N hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        count = 0
        
        pattern = 'session:user:*'
        for key in self.redis_client.scan_iter(pattern):
            session_data = self.redis_client.hgetall(key)
            if session_data:
                last_activity = datetime.fromisoformat(session_data.get('last_activity', ''))
                if last_activity > cutoff_time:
                    count += 1
        
        return count
    
    async def _count_active_jobs(self) -> int:
        """Count currently active jobs"""
        return self.redis_client.llen('job:queue:active')
    
    async def _count_deployed_models(self) -> int:
        """Count deployed models"""
        count = 0
        pattern = 'model:*'
        for key in self.redis_client.scan_iter(pattern):
            model_data = self.redis_client.hgetall(key)
            if model_data and model_data.get('status') == 'deployed':
                count += 1
        return count
    
    async def _get_api_request_rate(self) -> int:
        """Get API requests per minute"""
        # Get requests from last minute
        now = datetime.utcnow()
        minute_ago = now - timedelta(minutes=1)
        
        count = 0
        pattern = f'api:request:{now.strftime("%Y%m%d%H%M")}:*'
        for key in self.redis_client.scan_iter(pattern):
            count += int(self.redis_client.get(key) or 0)
        
        return count
    
    async def _get_error_rate(self) -> float:
        """Calculate error rate"""
        total_requests = await self._get_api_request_rate()
        if total_requests == 0:
            return 0.0
        
        error_count = 0
        pattern = f'api:error:{datetime.utcnow().strftime("%Y%m%d%H%M")}:*'
        for key in self.redis_client.scan_iter(pattern):
            error_count += int(self.redis_client.get(key) or 0)
        
        return (error_count / total_requests) * 100
    
    async def _check_services_status(self) -> Dict[str, str]:
        """Check status of various services"""
        services = {}
        
        # Check Redis
        try:
            self.redis_client.ping()
            services['redis'] = 'healthy'
        except:
            services['redis'] = 'unhealthy'
        
        # Check API
        services['api'] = 'healthy'  # Assume healthy if this code is running
        
        # Check job processor
        last_job_heartbeat = self.redis_client.get('job:processor:heartbeat')
        if last_job_heartbeat:
            last_heartbeat_time = datetime.fromisoformat(last_job_heartbeat)
            if datetime.utcnow() - last_heartbeat_time < timedelta(minutes=1):
                services['job_processor'] = 'healthy'
            else:
                services['job_processor'] = 'unhealthy'
        else:
            services['job_processor'] = 'unknown'
        
        return services
    
    async def _get_active_alerts(self) -> List[Dict]:
        """Get active system alerts"""
        alerts = []
        
        # Check disk space
        disk = psutil.disk_usage('/')
        if disk.percent > 90:
            alerts.append({
                'type': 'critical',
                'category': 'disk',
                'message': f'Disk usage critical: {disk.percent}%'
            })
        elif disk.percent > 80:
            alerts.append({
                'type': 'warning',
                'category': 'disk',
                'message': f'Disk usage high: {disk.percent}%'
            })
        
        # Check memory
        memory = psutil.virtual_memory()
        if memory.percent > 90:
            alerts.append({
                'type': 'critical',
                'category': 'memory',
                'message': f'Memory usage critical: {memory.percent}%'
            })
        
        # Check error rate
        error_rate = await self._get_error_rate()
        if error_rate > 10:
            alerts.append({
                'type': 'critical',
                'category': 'errors',
                'message': f'High error rate: {error_rate:.1f}%'
            })
        
        return alerts
    
    def _parse_time_range(self, time_range: str) -> int:
        """Parse time range string to hours"""
        if time_range.endswith('h'):
            return int(time_range[:-1])
        elif time_range.endswith('d'):
            return int(time_range[:-1]) * 24
        elif time_range.endswith('w'):
            return int(time_range[:-1]) * 24 * 7
        else:
            return 24  # Default to 24 hours
    
    def _get_directory_size(self, path: str) -> float:
        """Get directory size in MB"""
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(path):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                total_size += os.path.getsize(filepath)
        return total_size / (1024 * 1024)  # Convert to MB
    
    # Placeholder methods for database operations
    async def _get_user_data(self, user_id: str) -> Dict:
        """Get user data from database"""
        return self.redis_client.hgetall(f"user:{user_id}")
    
    async def _update_user(self, user_id: str, data: Dict):
        """Update user data"""
        self.redis_client.hset(f"user:{user_id}", mapping=data)
    
    async def _count_total_users(self) -> int:
        """Count total users"""
        return len(list(self.redis_client.scan_iter("user:*")))
    
    async def _count_total_models(self) -> int:
        """Count total models"""
        return len(list(self.redis_client.scan_iter("model:*")))
    
    async def _count_total_jobs(self) -> int:
        """Count total jobs"""
        return len(list(self.redis_client.scan_iter("job:*")))
    
    async def _calculate_storage_usage(self) -> float:
        """Calculate total storage usage in GB"""
        # Placeholder - implement based on your storage system
        return 0.0
    
    async def _calculate_compute_hours(self, start_time: datetime) -> float:
        """Calculate compute hours used"""
        # Placeholder - implement based on your compute tracking
        return 0.0
    
    async def _count_api_calls(self, start_time: datetime) -> int:
        """Count API calls since start time"""
        # Placeholder - implement based on your API tracking
        return 0
    
    async def _calculate_revenue(self, start_time: datetime) -> float:
        """Calculate revenue generated"""
        # Placeholder - implement based on your billing system
        return 0.0
    
    async def _get_top_users(self, limit: int) -> List[Dict]:
        """Get top users by activity"""
        # Placeholder - implement based on your metrics
        return []
    
    async def _get_top_models(self, limit: int) -> List[Dict]:
        """Get top models by usage"""
        # Placeholder - implement based on your metrics
        return []