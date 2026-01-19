"""
Data Isolation Middleware for ADA Platform
Ensures proper data separation and access control for multi-tenant environment
"""

import logging
from functools import wraps
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
import traceback

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from models.user import User
from models.team import Team, TeamMember
from models.model import Model
from models.data import Upload
from models.job import ModelJob, GeneratedData
from models.security import DataAccessLog, DataPermission, SecurityEvent
from core.database import get_db

logger = logging.getLogger(__name__)
security = HTTPBearer()


class AccessLevel:
    """Access level constants"""
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"
    OWNER = "owner"


class ResourceType:
    """Resource type constants"""
    MODEL = "model"
    UPLOAD = "upload"
    JOB = "job"
    GENERATED_DATA = "generated_data"
    TEAM = "team"


class DataIsolationMiddleware:
    """Middleware for enforcing data isolation and access control"""
    
    def __init__(self, db_session_factory):
        self.db_session_factory = db_session_factory
    
    def check_resource_access(
        self,
        user_id: int,
        resource_type: str,
        resource_id: Union[int, str],
        required_access: str = AccessLevel.READ,
        team_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Check if user has required access to a resource
        
        Args:
            user_id: ID of the user requesting access
            resource_type: Type of resource (model, upload, job, etc.)
            resource_id: ID of the resource
            required_access: Required access level (read, write, admin, owner)
            team_id: Optional team context
            
        Returns:
            Dict containing access decision and metadata
        """
        try:
            with self.db_session_factory() as db:
                # Get user
                user = db.query(User).filter(User.id == user_id).first()
                if not user:
                    return {"allowed": False, "reason": "User not found"}
                
                # Check if user account is active
                if user.account_status != "active":
                    return {"allowed": False, "reason": f"Account status: {user.account_status}"}
                
                # Get resource and check ownership/permissions
                resource_info = self._get_resource_info(db, resource_type, resource_id)
                if not resource_info:
                    return {"allowed": False, "reason": "Resource not found"}
                
                # Check access based on resource type and ownership
                access_result = self._evaluate_access(
                    db, user, resource_info, required_access, team_id
                )
                
                # Log access attempt
                self._log_access_attempt(
                    db, user_id, resource_type, resource_id, 
                    required_access, access_result["allowed"], 
                    access_result.get("reason", ""), team_id
                )
                
                return access_result
                
        except Exception as e:
            logger.error(f"Error checking resource access: {e}")
            self._log_security_event(
                user_id, "access_check_error", "high",
                f"Error checking access to {resource_type}:{resource_id}: {str(e)}"
            )
            return {"allowed": False, "reason": "Access check failed"}
    
    def _get_resource_info(self, db: Session, resource_type: str, resource_id: Union[int, str]) -> Optional[Dict]:
        """Get information about the requested resource"""
        try:
            resource_id = int(resource_id) if str(resource_id).isdigit() else resource_id
            
            if resource_type == ResourceType.MODEL:
                resource = db.query(Model).filter(Model.id == resource_id).first()
                if resource:
                    return {
                        "id": resource.id,
                        "owner_id": resource.user_id,
                        "team_id": resource.team_id,
                        "visibility": resource.visibility,
                        "share_settings": resource.share_settings,
                        "access_permissions": resource.access_permissions
                    }
            
            elif resource_type == ResourceType.UPLOAD:
                resource = db.query(Upload).filter(Upload.id == resource_id).first()
                if resource:
                    return {
                        "id": resource.id,
                        "owner_id": resource.user_id,
                        "team_id": resource.team_id,
                        "visibility": resource.visibility,
                        "access_permissions": resource.access_permissions,
                        "is_sensitive": resource.is_sensitive
                    }
            
            elif resource_type == ResourceType.JOB:
                resource = db.query(ModelJob).filter(ModelJob.id == resource_id).first()
                if resource:
                    return {
                        "id": resource.id,
                        "owner_id": resource.user_id,
                        "team_id": resource.team_id,
                        "model_id": resource.model_id
                    }
            
            elif resource_type == ResourceType.GENERATED_DATA:
                resource = db.query(GeneratedData).filter(GeneratedData.id == resource_id).first()
                if resource:
                    return {
                        "id": resource.id,
                        "owner_id": resource.user_id,
                        "team_id": None  # Generated data doesn't have team ownership
                    }
            
            elif resource_type == ResourceType.TEAM:
                resource = db.query(Team).filter(Team.id == resource_id).first()
                if resource:
                    return {
                        "id": resource.id,
                        "owner_id": resource.owner_id,
                        "team_id": resource.id,
                        "visibility": resource.visibility
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting resource info for {resource_type}:{resource_id}: {e}")
            return None
    
    def _evaluate_access(
        self, 
        db: Session, 
        user: User, 
        resource_info: Dict, 
        required_access: str,
        team_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """Evaluate if user has required access to resource"""
        
        # Owner always has full access
        if resource_info["owner_id"] == user.id:
            return {"allowed": True, "reason": "owner", "access_level": AccessLevel.OWNER}
        
        # Check team membership if resource belongs to a team
        if resource_info.get("team_id"):
            team_access = self._check_team_access(
                db, user.id, resource_info["team_id"], required_access
            )
            if team_access["allowed"]:
                return team_access
        
        # Check explicit permissions
        permission_access = self._check_explicit_permissions(
            db, user.id, resource_info, required_access
        )
        if permission_access["allowed"]:
            return permission_access
        
        # Check public visibility
        if resource_info.get("visibility") == "public" and required_access == AccessLevel.READ:
            return {"allowed": True, "reason": "public", "access_level": AccessLevel.READ}
        
        # Check share settings for models
        if "share_settings" in resource_info:
            share_access = self._check_share_settings(resource_info, required_access)
            if share_access["allowed"]:
                return share_access
        
        return {"allowed": False, "reason": "insufficient_permissions"}
    
    def _check_team_access(self, db: Session, user_id: int, team_id: str, required_access: str) -> Dict[str, Any]:
        """Check if user has access through team membership"""
        try:
            membership = db.query(TeamMember).filter(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user_id,
                TeamMember.status == "active"
            ).first()
            
            if not membership:
                return {"allowed": False, "reason": "not_team_member"}
            
            # Check if member role provides required access
            role_permissions = {
                "viewer": [AccessLevel.READ],
                "member": [AccessLevel.READ, AccessLevel.WRITE],
                "admin": [AccessLevel.READ, AccessLevel.WRITE, AccessLevel.ADMIN],
                "owner": [AccessLevel.READ, AccessLevel.WRITE, AccessLevel.ADMIN, AccessLevel.OWNER]
            }
            
            allowed_permissions = role_permissions.get(membership.role, [])
            if required_access in allowed_permissions:
                return {
                    "allowed": True, 
                    "reason": f"team_{membership.role}", 
                    "access_level": required_access,
                    "team_id": team_id
                }
            
            return {"allowed": False, "reason": f"insufficient_team_role_{membership.role}"}
            
        except Exception as e:
            logger.error(f"Error checking team access: {e}")
            return {"allowed": False, "reason": "team_access_check_failed"}
    
    def _check_explicit_permissions(self, db: Session, user_id: int, resource_info: Dict, required_access: str) -> Dict[str, Any]:
        """Check explicit data permissions"""
        try:
            permission = db.query(DataPermission).filter(
                DataPermission.data_id == str(resource_info["id"]),
                DataPermission.user_id == user_id,
                DataPermission.is_revoked == False,
                or_(
                    DataPermission.expires_at.is_(None),
                    DataPermission.expires_at > datetime.utcnow()
                )
            ).first()
            
            if permission and required_access in permission.permissions:
                return {
                    "allowed": True,
                    "reason": "explicit_permission",
                    "access_level": required_access,
                    "permission_id": permission.id
                }
            
            return {"allowed": False, "reason": "no_explicit_permission"}
            
        except Exception as e:
            logger.error(f"Error checking explicit permissions: {e}")
            return {"allowed": False, "reason": "permission_check_failed"}
    
    def _check_share_settings(self, resource_info: Dict, required_access: str) -> Dict[str, Any]:
        """Check share settings for models"""
        try:
            share_settings = resource_info.get("share_settings", {})
            
            # Check if public sharing is enabled for read access
            if share_settings.get("public", False) and required_access == AccessLevel.READ:
                return {"allowed": True, "reason": "public_share", "access_level": AccessLevel.READ}
            
            # Check if link sharing is enabled for read access
            if share_settings.get("link_sharing", False) and required_access == AccessLevel.READ:
                return {"allowed": True, "reason": "link_share", "access_level": AccessLevel.READ}
            
            return {"allowed": False, "reason": "share_settings_insufficient"}
            
        except Exception as e:
            logger.error(f"Error checking share settings: {e}")
            return {"allowed": False, "reason": "share_check_failed"}
    
    def _log_access_attempt(
        self, 
        db: Session, 
        user_id: int, 
        resource_type: str, 
        resource_id: Union[int, str],
        access_level: str,
        success: bool,
        reason: str,
        team_id: Optional[str] = None
    ):
        """Log data access attempt for audit purposes"""
        try:
            access_log = DataAccessLog(
                user_id=user_id,
                team_id=team_id,
                resource_type=resource_type,
                resource_id=str(resource_id),
                action=access_level,
                authorization_level=access_level,
                success=success,
                details={"reason": reason}
            )
            db.add(access_log)
            db.commit()
            
        except Exception as e:
            logger.error(f"Error logging access attempt: {e}")
    
    def _log_security_event(
        self, 
        user_id: Optional[int], 
        event_type: str, 
        severity: str, 
        description: str,
        additional_data: Optional[Dict] = None
    ):
        """Log security events"""
        try:
            with self.db_session_factory() as db:
                security_event = SecurityEvent(
                    user_id=user_id,
                    event_type=event_type,
                    severity=severity,
                    description=description,
                    system_state=additional_data or {},
                    detected_by="data_isolation_middleware"
                )
                db.add(security_event)
                db.commit()
                
        except Exception as e:
            logger.error(f"Error logging security event: {e}")
    
    def get_user_accessible_resources(
        self, 
        user_id: int, 
        resource_type: str,
        access_level: str = AccessLevel.READ,
        team_id: Optional[str] = None
    ) -> List[int]:
        """
        Get list of resource IDs that user can access
        
        Args:
            user_id: User requesting access
            resource_type: Type of resources to check
            access_level: Required access level
            team_id: Optional team context filter
            
        Returns:
            List of accessible resource IDs
        """
        try:
            with self.db_session_factory() as db:
                accessible_ids = []
                
                if resource_type == ResourceType.MODEL:
                    query = db.query(Model.id)
                    
                    # Get user's own models
                    own_models = query.filter(Model.user_id == user_id)
                    if team_id:
                        own_models = own_models.filter(Model.team_id == team_id)
                    accessible_ids.extend([m[0] for m in own_models.all()])
                    
                    # Get public models
                    public_models = query.filter(Model.visibility == "public")
                    accessible_ids.extend([m[0] for m in public_models.all()])
                    
                    # Get team models
                    if not team_id:  # If no specific team, check all teams user belongs to
                        user_teams = db.query(TeamMember.team_id).filter(
                            TeamMember.user_id == user_id,
                            TeamMember.status == "active"
                        ).all()
                        team_ids = [t[0] for t in user_teams]
                        
                        team_models = query.filter(Model.team_id.in_(team_ids))
                        accessible_ids.extend([m[0] for m in team_models.all()])
                
                # Remove duplicates and return
                return list(set(accessible_ids))
                
        except Exception as e:
            logger.error(f"Error getting accessible resources: {e}")
            return []


def require_access(resource_type: str, access_level: str = AccessLevel.READ):
    """
    Decorator to require specific access to a resource
    
    Usage:
        @require_access(ResourceType.MODEL, AccessLevel.WRITE)
        def update_model(model_id: int, user: User = Depends(get_current_user)):
            # Function implementation
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract resource_id from kwargs or path parameters
            resource_id = kwargs.get('model_id') or kwargs.get('upload_id') or kwargs.get('job_id')
            user = kwargs.get('user') or kwargs.get('current_user')
            
            if not resource_id or not user:
                raise HTTPException(status_code=400, detail="Missing resource_id or user")
            
            # Initialize middleware (you'll need to inject db_session_factory)
            from core.database import SessionLocal
            middleware = DataIsolationMiddleware(SessionLocal)
            
            # Check access
            access_result = middleware.check_resource_access(
                user.id, resource_type, resource_id, access_level
            )
            
            if not access_result["allowed"]:
                raise HTTPException(
                    status_code=403, 
                    detail=f"Access denied: {access_result['reason']}"
                )
            
            # Add access info to kwargs for use in the function
            kwargs['access_info'] = access_result
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


class TeamContextMiddleware:
    """Middleware for handling team context in requests"""
    
    def __init__(self, db_session_factory):
        self.db_session_factory = db_session_factory
    
    def get_user_teams(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all teams user belongs to"""
        try:
            with self.db_session_factory() as db:
                memberships = db.query(TeamMember).filter(
                    TeamMember.user_id == user_id,
                    TeamMember.status == "active"
                ).join(Team).all()
                
                return [
                    {
                        "team_id": membership.team_id,
                        "team_name": membership.team.name,
                        "role": membership.role,
                        "permissions": membership.permissions
                    }
                    for membership in memberships
                ]
                
        except Exception as e:
            logger.error(f"Error getting user teams: {e}")
            return []
    
    def validate_team_context(self, user_id: int, team_id: str) -> bool:
        """Validate that user belongs to the specified team"""
        try:
            with self.db_session_factory() as db:
                membership = db.query(TeamMember).filter(
                    TeamMember.user_id == user_id,
                    TeamMember.team_id == team_id,
                    TeamMember.status == "active"
                ).first()
                
                return membership is not None
                
        except Exception as e:
            logger.error(f"Error validating team context: {e}")
            return False