"""
Role-Based Access Control (RBAC) Service
Manages roles, permissions, and access control for the ADA platform
"""

from typing import Dict, List, Optional, Set, Tuple
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
import json


class Role(Enum):
    """System-wide role definitions"""
    USER = "user"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"
    TEAM_MEMBER = "team_member"
    TEAM_ADMIN = "team_admin"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class Permission(Enum):
    """System-wide permission definitions"""
    # Model permissions
    MODEL_CREATE = "model.create"
    MODEL_READ = "model.read"
    MODEL_UPDATE = "model.update"
    MODEL_DELETE = "model.delete"
    MODEL_TRAIN = "model.train"
    MODEL_PREDICT = "model.predict"
    MODEL_SHARE = "model.share"
    MODEL_PUBLISH = "model.publish"
    
    # Data permissions
    DATA_UPLOAD = "data.upload"
    DATA_READ = "data.read"
    DATA_DELETE = "data.delete"
    DATA_GENERATE = "data.generate"
    DATA_CLEAN = "data.clean"
    DATA_ANALYZE = "data.analyze"
    
    # Job permissions
    JOB_CREATE = "job.create"
    JOB_READ = "job.read"
    JOB_CANCEL = "job.cancel"
    JOB_PRIORITY = "job.priority"
    
    # Rules permissions
    RULES_CREATE = "rules.create"
    RULES_READ = "rules.read"
    RULES_UPDATE = "rules.update"
    RULES_DELETE = "rules.delete"
    RULES_EXECUTE = "rules.execute"
    
    # Team permissions
    TEAM_CREATE = "team.create"
    TEAM_READ = "team.read"
    TEAM_UPDATE = "team.update"
    TEAM_DELETE = "team.delete"
    TEAM_INVITE = "team.invite"
    TEAM_REMOVE_MEMBER = "team.remove_member"
    
    # Admin permissions
    ADMIN_USERS = "admin.users"
    ADMIN_DEVICES = "admin.devices"
    ADMIN_SYSTEM = "admin.system"
    ADMIN_METRICS = "admin.metrics"
    ADMIN_LOGS = "admin.logs"
    ADMIN_CONFIG = "admin.config"
    
    # Resource permissions
    RESOURCE_UNLIMITED = "resource.unlimited"
    RESOURCE_PRIORITY = "resource.priority"
    RESOURCE_RESERVED = "resource.reserved"


class ResourceScope(Enum):
    """Resource access scope"""
    OWN = "own"  # Can only access own resources
    TEAM = "team"  # Can access team resources
    ALL = "all"  # Can access all resources


@dataclass
class RoleDefinition:
    """Role configuration with permissions and limits"""
    name: str
    permissions: Set[Permission]
    resource_scope: ResourceScope
    limits: Dict[str, int]
    priority: int
    description: str


@dataclass
class TeamRole:
    """Team-specific role"""
    team_id: str
    user_id: str
    role: str
    permissions: Set[str] = field(default_factory=set)
    granted_at: datetime = field(default_factory=datetime.utcnow)
    granted_by: str = ""


@dataclass
class ResourcePermission:
    """Permission for a specific resource"""
    resource_type: str
    resource_id: str
    user_id: str
    permissions: Set[str]
    granted_at: datetime
    expires_at: Optional[datetime] = None


class RBACService:
    """Role-Based Access Control service implementation"""
    
    def __init__(self, db_connection, cache_client):
        self.db = db_connection
        self.cache = cache_client
        self._initialize_role_definitions()
        self._initialize_permission_matrix()
    
    def _initialize_role_definitions(self):
        """Initialize system role definitions"""
        self.role_definitions = {
            Role.USER: RoleDefinition(
                name="User",
                permissions={
                    Permission.MODEL_CREATE,
                    Permission.MODEL_READ,
                    Permission.MODEL_UPDATE,
                    Permission.MODEL_DELETE,
                    Permission.MODEL_TRAIN,
                    Permission.MODEL_PREDICT,
                    Permission.DATA_UPLOAD,
                    Permission.DATA_READ,
                    Permission.DATA_DELETE,
                    Permission.JOB_CREATE,
                    Permission.JOB_READ,
                    Permission.JOB_CANCEL,
                    Permission.RULES_CREATE,
                    Permission.RULES_READ,
                    Permission.RULES_UPDATE,
                    Permission.RULES_DELETE,
                    Permission.RULES_EXECUTE,
                },
                resource_scope=ResourceScope.OWN,
                limits={
                    "max_models": 5,
                    "max_storage_gb": 10,
                    "max_jobs_per_day": 10,
                    "max_team_members": 0,
                    "max_processing_units": 10,
                    "max_file_size_mb": 100,
                },
                priority=1,
                description="Basic platform access with standard limits"
            ),
            
            Role.PREMIUM: RoleDefinition(
                name="Premium",
                permissions={
                    Permission.MODEL_CREATE,
                    Permission.MODEL_READ,
                    Permission.MODEL_UPDATE,
                    Permission.MODEL_DELETE,
                    Permission.MODEL_TRAIN,
                    Permission.MODEL_PREDICT,
                    Permission.MODEL_SHARE,
                    Permission.DATA_UPLOAD,
                    Permission.DATA_READ,
                    Permission.DATA_DELETE,
                    Permission.DATA_GENERATE,
                    Permission.DATA_CLEAN,
                    Permission.DATA_ANALYZE,
                    Permission.JOB_CREATE,
                    Permission.JOB_READ,
                    Permission.JOB_CANCEL,
                    Permission.JOB_PRIORITY,
                    Permission.RULES_CREATE,
                    Permission.RULES_READ,
                    Permission.RULES_UPDATE,
                    Permission.RULES_DELETE,
                    Permission.RULES_EXECUTE,
                    Permission.TEAM_CREATE,
                    Permission.TEAM_READ,
                },
                resource_scope=ResourceScope.OWN,
                limits={
                    "max_models": 20,
                    "max_storage_gb": 50,
                    "max_jobs_per_day": 50,
                    "max_team_members": 5,
                    "max_processing_units": 50,
                    "max_file_size_mb": 500,
                },
                priority=5,
                description="Advanced features with higher limits"
            ),
            
            Role.ENTERPRISE: RoleDefinition(
                name="Enterprise",
                permissions={
                    Permission.MODEL_CREATE,
                    Permission.MODEL_READ,
                    Permission.MODEL_UPDATE,
                    Permission.MODEL_DELETE,
                    Permission.MODEL_TRAIN,
                    Permission.MODEL_PREDICT,
                    Permission.MODEL_SHARE,
                    Permission.MODEL_PUBLISH,
                    Permission.DATA_UPLOAD,
                    Permission.DATA_READ,
                    Permission.DATA_DELETE,
                    Permission.DATA_GENERATE,
                    Permission.DATA_CLEAN,
                    Permission.DATA_ANALYZE,
                    Permission.JOB_CREATE,
                    Permission.JOB_READ,
                    Permission.JOB_CANCEL,
                    Permission.JOB_PRIORITY,
                    Permission.RULES_CREATE,
                    Permission.RULES_READ,
                    Permission.RULES_UPDATE,
                    Permission.RULES_DELETE,
                    Permission.RULES_EXECUTE,
                    Permission.TEAM_CREATE,
                    Permission.TEAM_READ,
                    Permission.TEAM_UPDATE,
                    Permission.TEAM_DELETE,
                    Permission.TEAM_INVITE,
                    Permission.TEAM_REMOVE_MEMBER,
                    Permission.RESOURCE_PRIORITY,
                    Permission.RESOURCE_RESERVED,
                },
                resource_scope=ResourceScope.TEAM,
                limits={
                    "max_models": 100,
                    "max_storage_gb": 500,
                    "max_jobs_per_day": 500,
                    "max_team_members": 50,
                    "max_processing_units": 200,
                    "max_file_size_mb": 2000,
                },
                priority=10,
                description="Team features with priority processing"
            ),
            
            Role.ADMIN: RoleDefinition(
                name="Admin",
                permissions={
                    # All user permissions
                    *[p for p in Permission],
                },
                resource_scope=ResourceScope.ALL,
                limits={
                    "max_models": -1,  # Unlimited
                    "max_storage_gb": -1,
                    "max_jobs_per_day": -1,
                    "max_team_members": -1,
                    "max_processing_units": -1,
                    "max_file_size_mb": -1,
                },
                priority=100,
                description="Full system administration"
            ),
        }
    
    def _initialize_permission_matrix(self):
        """Initialize permission dependency matrix"""
        self.permission_dependencies = {
            Permission.MODEL_TRAIN: {Permission.MODEL_READ, Permission.DATA_READ},
            Permission.MODEL_PREDICT: {Permission.MODEL_READ},
            Permission.MODEL_SHARE: {Permission.MODEL_READ},
            Permission.MODEL_PUBLISH: {Permission.MODEL_READ, Permission.MODEL_SHARE},
            Permission.DATA_CLEAN: {Permission.DATA_READ},
            Permission.DATA_ANALYZE: {Permission.DATA_READ},
            Permission.TEAM_INVITE: {Permission.TEAM_READ},
            Permission.TEAM_REMOVE_MEMBER: {Permission.TEAM_READ, Permission.TEAM_UPDATE},
        }
    
    # Permission Checking
    async def check_permission(self, user_id: str, permission: Permission, 
                              resource_id: Optional[str] = None,
                              resource_type: Optional[str] = None) -> bool:
        """
        Check if user has permission for an action
        """
        try:
            # Get user roles
            user_roles = await self._get_user_roles(user_id)
            
            # Check system roles
            for role in user_roles:
                role_def = self.role_definitions.get(role)
                if role_def and permission in role_def.permissions:
                    # Check resource scope
                    if await self._check_resource_scope(
                        user_id, resource_id, resource_type, role_def.resource_scope
                    ):
                        return True
            
            # Check team roles if resource belongs to a team
            if resource_type == "team":
                team_permissions = await self._get_team_permissions(user_id, resource_id)
                if permission.value in team_permissions:
                    return True
            
            # Check specific resource permissions
            if resource_id:
                resource_permissions = await self._get_resource_permissions(
                    user_id, resource_type, resource_id
                )
                if permission.value in resource_permissions:
                    return True
            
            return False
            
        except Exception as e:
            print(f"Error checking permission: {e}")
            return False
    
    async def check_permissions_batch(self, user_id: str, 
                                     permissions: List[Tuple[Permission, Optional[str], Optional[str]]]) -> Dict[str, bool]:
        """
        Check multiple permissions at once
        Returns dict mapping permission string to boolean result
        """
        results = {}
        for permission, resource_id, resource_type in permissions:
            key = f"{permission.value}:{resource_type or 'global'}:{resource_id or 'all'}"
            results[key] = await self.check_permission(user_id, permission, resource_id, resource_type)
        return results
    
    # Role Management
    async def assign_role(self, user_id: str, role: Role, assigned_by: str) -> bool:
        """
        Assign a system role to a user
        """
        try:
            # Validate role
            if role not in self.role_definitions:
                raise ValueError(f"Invalid role: {role}")
            
            # Store role assignment
            await self._store_role_assignment(user_id, role, assigned_by)
            
            # Clear cache
            await self._clear_user_cache(user_id)
            
            # Log event
            await self._log_rbac_event(
                user_id, "role_assigned", 
                {"role": role.value, "assigned_by": assigned_by}
            )
            
            return True
            
        except Exception as e:
            print(f"Error assigning role: {e}")
            return False
    
    async def revoke_role(self, user_id: str, role: Role, revoked_by: str) -> bool:
        """
        Revoke a system role from a user
        """
        try:
            # Remove role assignment
            await self._remove_role_assignment(user_id, role)
            
            # Clear cache
            await self._clear_user_cache(user_id)
            
            # Log event
            await self._log_rbac_event(
                user_id, "role_revoked",
                {"role": role.value, "revoked_by": revoked_by}
            )
            
            return True
            
        except Exception as e:
            print(f"Error revoking role: {e}")
            return False
    
    async def get_user_roles(self, user_id: str) -> List[Role]:
        """
        Get all roles assigned to a user
        """
        return await self._get_user_roles(user_id)
    
    # Team Management
    async def create_team(self, team_name: str, owner_id: str, 
                         description: str = "") -> Dict:
        """
        Create a new team
        """
        try:
            # Check if user can create teams
            user_roles = await self._get_user_roles(owner_id)
            can_create = any(
                role in [Role.PREMIUM, Role.ENTERPRISE, Role.ADMIN]
                for role in user_roles
            )
            
            if not can_create:
                return {"success": False, "error": "User cannot create teams"}
            
            # Create team
            team_id = await self._create_team_record(team_name, owner_id, description)
            
            # Assign owner as team admin
            await self.assign_team_role(team_id, owner_id, "team_admin", owner_id)
            
            return {"success": True, "team_id": team_id}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def assign_team_role(self, team_id: str, user_id: str, 
                              role: str, assigned_by: str) -> bool:
        """
        Assign a role within a team
        """
        try:
            # Validate team exists
            if not await self._team_exists(team_id):
                raise ValueError("Team not found")
            
            # Check if assigner has permission
            if not await self.check_permission(
                assigned_by, Permission.TEAM_INVITE, team_id, "team"
            ):
                raise PermissionError("User cannot assign team roles")
            
            # Create team role assignment
            team_role = TeamRole(
                team_id=team_id,
                user_id=user_id,
                role=role,
                granted_at=datetime.utcnow(),
                granted_by=assigned_by
            )
            
            # Store assignment
            await self._store_team_role(team_role)
            
            # Clear cache
            await self._clear_user_cache(user_id)
            
            return True
            
        except Exception as e:
            print(f"Error assigning team role: {e}")
            return False
    
    async def get_team_members(self, team_id: str, user_id: str) -> List[Dict]:
        """
        Get all members of a team
        """
        # Check if user has permission to view team
        if not await self.check_permission(user_id, Permission.TEAM_READ, team_id, "team"):
            return []
        
        return await self._get_team_members(team_id)
    
    async def share_resource_with_team(self, resource_type: str, resource_id: str,
                                      team_id: str, permissions: Set[str],
                                      shared_by: str) -> bool:
        """
        Share a resource with a team
        """
        try:
            # Check if user owns the resource or has share permission
            if not await self._can_share_resource(shared_by, resource_type, resource_id):
                raise PermissionError("User cannot share this resource")
            
            # Share with all team members
            team_members = await self._get_team_members(team_id)
            for member in team_members:
                await self.grant_resource_permission(
                    resource_type, resource_id,
                    member['user_id'], permissions,
                    shared_by
                )
            
            return True
            
        except Exception as e:
            print(f"Error sharing resource with team: {e}")
            return False
    
    # Resource Permissions
    async def grant_resource_permission(self, resource_type: str, resource_id: str,
                                       user_id: str, permissions: Set[str],
                                       granted_by: str,
                                       expires_at: Optional[datetime] = None) -> bool:
        """
        Grant specific permissions for a resource to a user
        """
        try:
            # Create resource permission
            resource_perm = ResourcePermission(
                resource_type=resource_type,
                resource_id=resource_id,
                user_id=user_id,
                permissions=permissions,
                granted_at=datetime.utcnow(),
                expires_at=expires_at
            )
            
            # Store permission
            await self._store_resource_permission(resource_perm)
            
            # Clear cache
            await self._clear_user_cache(user_id)
            
            # Log event
            await self._log_rbac_event(
                user_id, "resource_permission_granted",
                {
                    "resource_type": resource_type,
                    "resource_id": resource_id,
                    "permissions": list(permissions),
                    "granted_by": granted_by
                }
            )
            
            return True
            
        except Exception as e:
            print(f"Error granting resource permission: {e}")
            return False
    
    async def revoke_resource_permission(self, resource_type: str, resource_id: str,
                                        user_id: str, revoked_by: str) -> bool:
        """
        Revoke all permissions for a resource from a user
        """
        try:
            # Remove resource permission
            await self._remove_resource_permission(resource_type, resource_id, user_id)
            
            # Clear cache
            await self._clear_user_cache(user_id)
            
            # Log event
            await self._log_rbac_event(
                user_id, "resource_permission_revoked",
                {
                    "resource_type": resource_type,
                    "resource_id": resource_id,
                    "revoked_by": revoked_by
                }
            )
            
            return True
            
        except Exception as e:
            print(f"Error revoking resource permission: {e}")
            return False
    
    # Limit Checking
    async def check_limit(self, user_id: str, limit_type: str) -> Tuple[bool, int, int]:
        """
        Check if user is within limits
        Returns (within_limit, current_usage, max_limit)
        """
        try:
            # Get user's highest role
            user_roles = await self._get_user_roles(user_id)
            max_limit = 0
            
            for role in user_roles:
                role_def = self.role_definitions.get(role)
                if role_def:
                    role_limit = role_def.limits.get(limit_type, 0)
                    if role_limit == -1:  # Unlimited
                        return (True, 0, -1)
                    max_limit = max(max_limit, role_limit)
            
            # Get current usage
            current_usage = await self._get_usage(user_id, limit_type)
            
            return (current_usage < max_limit, current_usage, max_limit)
            
        except Exception as e:
            print(f"Error checking limit: {e}")
            return (False, 0, 0)
    
    async def get_user_limits(self, user_id: str) -> Dict[str, Dict]:
        """
        Get all limits for a user
        """
        user_roles = await self._get_user_roles(user_id)
        limits = {}
        
        # Get the highest limit for each type
        for role in user_roles:
            role_def = self.role_definitions.get(role)
            if role_def:
                for limit_type, limit_value in role_def.limits.items():
                    if limit_type not in limits or limit_value == -1:
                        limits[limit_type] = {
                            "max": limit_value,
                            "role": role.value
                        }
                    elif limit_value > limits[limit_type]["max"]:
                        limits[limit_type] = {
                            "max": limit_value,
                            "role": role.value
                        }
        
        # Add current usage
        for limit_type in limits:
            usage = await self._get_usage(user_id, limit_type)
            limits[limit_type]["current"] = usage
            limits[limit_type]["remaining"] = (
                -1 if limits[limit_type]["max"] == -1
                else limits[limit_type]["max"] - usage
            )
        
        return limits
    
    # Helper Methods
    async def _get_user_roles(self, user_id: str) -> List[Role]:
        """Get user roles from cache or database"""
        # Check cache first
        cache_key = f"user_roles:{user_id}"
        cached = await self.cache.get(cache_key)
        if cached:
            return [Role(r) for r in json.loads(cached)]
        
        # Query database
        # This is a placeholder - implement based on your database
        roles = [Role.USER]  # Default role
        
        # Cache result
        await self.cache.setex(cache_key, 3600, json.dumps([r.value for r in roles]))
        
        return roles
    
    async def _check_resource_scope(self, user_id: str, resource_id: Optional[str],
                                   resource_type: Optional[str],
                                   scope: ResourceScope) -> bool:
        """Check if user has access based on resource scope"""
        if scope == ResourceScope.ALL:
            return True
        
        if not resource_id:
            return True  # No specific resource, allow based on permission
        
        if scope == ResourceScope.OWN:
            # Check if user owns the resource
            return await self._user_owns_resource(user_id, resource_type, resource_id)
        
        if scope == ResourceScope.TEAM:
            # Check if resource belongs to user's team
            return await self._resource_in_user_team(user_id, resource_type, resource_id)
        
        return False
    
    async def _get_team_permissions(self, user_id: str, team_id: str) -> Set[str]:
        """Get user's permissions within a team"""
        # Implementation depends on your database
        return set()
    
    async def _get_resource_permissions(self, user_id: str, 
                                       resource_type: str,
                                       resource_id: str) -> Set[str]:
        """Get user's permissions for a specific resource"""
        # Implementation depends on your database
        return set()
    
    async def _user_owns_resource(self, user_id: str, 
                                 resource_type: str,
                                 resource_id: str) -> bool:
        """Check if user owns a resource"""
        # Implementation depends on your database
        return False
    
    async def _resource_in_user_team(self, user_id: str,
                                    resource_type: str,
                                    resource_id: str) -> bool:
        """Check if resource belongs to user's team"""
        # Implementation depends on your database
        return False
    
    async def _can_share_resource(self, user_id: str,
                                 resource_type: str,
                                 resource_id: str) -> bool:
        """Check if user can share a resource"""
        # Must own the resource or have share permission
        return await self._user_owns_resource(user_id, resource_type, resource_id)
    
    async def _team_exists(self, team_id: str) -> bool:
        """Check if team exists"""
        # Implementation depends on your database
        return False
    
    async def _get_team_members(self, team_id: str) -> List[Dict]:
        """Get all members of a team"""
        # Implementation depends on your database
        return []
    
    async def _get_usage(self, user_id: str, limit_type: str) -> int:
        """Get current usage for a limit type"""
        # Implementation depends on your database
        return 0
    
    async def _store_role_assignment(self, user_id: str, role: Role, assigned_by: str):
        """Store role assignment in database"""
        pass
    
    async def _remove_role_assignment(self, user_id: str, role: Role):
        """Remove role assignment from database"""
        pass
    
    async def _create_team_record(self, team_name: str, owner_id: str, description: str) -> str:
        """Create team in database"""
        return f"team_{datetime.utcnow().timestamp()}"
    
    async def _store_team_role(self, team_role: TeamRole):
        """Store team role assignment"""
        pass
    
    async def _store_resource_permission(self, resource_perm: ResourcePermission):
        """Store resource permission"""
        pass
    
    async def _remove_resource_permission(self, resource_type: str, resource_id: str, user_id: str):
        """Remove resource permission"""
        pass
    
    async def _clear_user_cache(self, user_id: str):
        """Clear all cached data for a user"""
        keys = [
            f"user_roles:{user_id}",
            f"user_permissions:{user_id}",
            f"user_limits:{user_id}"
        ]
        for key in keys:
            await self.cache.delete(key)
    
    async def _log_rbac_event(self, user_id: str, event_type: str, metadata: Dict):
        """Log RBAC event for audit"""
        pass


# Permission Decorator for API endpoints
def require_permission(permission: Permission, resource_param: Optional[str] = None):
    """
    Decorator to check permissions for API endpoints
    Usage: @require_permission(Permission.MODEL_CREATE)
    """
    def decorator(func):
        async def wrapper(self, request, *args, **kwargs):
            # Get user from request (implement based on your auth system)
            user_id = request.get('user_id')
            
            # Get resource ID if specified
            resource_id = None
            resource_type = None
            if resource_param:
                resource_id = kwargs.get(resource_param)
                # Determine resource type from endpoint
                resource_type = _get_resource_type_from_endpoint(request.path)
            
            # Check permission
            rbac_service = request.app.rbac_service  # Assume service is attached to app
            has_permission = await rbac_service.check_permission(
                user_id, permission, resource_id, resource_type
            )
            
            if not has_permission:
                return {"error": "Permission denied", "status": 403}
            
            return await func(self, request, *args, **kwargs)
        
        return wrapper
    return decorator


def _get_resource_type_from_endpoint(path: str) -> str:
    """Extract resource type from API path"""
    if '/models' in path:
        return 'model'
    elif '/data' in path:
        return 'data'
    elif '/jobs' in path:
        return 'job'
    elif '/rules' in path:
        return 'rule'
    elif '/teams' in path:
        return 'team'
    return 'unknown'