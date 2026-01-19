"""
Team Management API Routes
Provides comprehensive team management with proper access control and resource sharing
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from models import schemas
from models.team import Team, TeamMember, TeamInvitation, TeamResource
from models.compute import ResourceQuota
from models.user import User
from services import security
from core.database import get_db
from middleware.data_isolation import (
    DataIsolationMiddleware,
    TeamContextMiddleware,
    AccessLevel,
    ResourceType
)

router = APIRouter(prefix="/api/teams", tags=["Teams"])

# Initialize middleware
def get_data_isolation_middleware():
    from core.database import SessionLocal
    return DataIsolationMiddleware(SessionLocal)

def get_team_context_middleware():
    from core.database import SessionLocal
    return TeamContextMiddleware(SessionLocal)


@router.post("/", response_model=schemas.Team)
async def create_team(
    team_data: schemas.TeamCreateRequest,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    isolation_middleware: DataIsolationMiddleware = Depends(get_data_isolation_middleware)
):
    """Create a new team"""
    
    try:
        # Create team
        team = Team(
            name=team_data.name,
            description=team_data.description,
            owner_id=current_user.id,
            visibility=team_data.visibility or "private",
            settings=team_data.settings or {}
        )
        
        db.add(team)
        db.flush()  # Get team ID
        
        # Add owner as admin member
        owner_membership = TeamMember(
            team_id=team.id,
            user_id=current_user.id,
            role="owner",
            permissions=["read", "write", "admin", "invite", "manage_members", "manage_resources"],
            status="active"
        )
        
        db.add(owner_membership)
        
        # Create default resource quota for team
        default_quota = ResourceQuota(
            entity_type="team",
            entity_id=team.id,
            max_cpu_hours=100,  # Default limits
            max_memory_gb_hours=200,
            max_storage_gb=50,
            max_concurrent_jobs=5,
            max_models=10,
            max_uploads=100
        )
        
        db.add(default_quota)
        db.commit()
        db.refresh(team)
        
        # Log team creation
        isolation_middleware._log_access_attempt(
            db, current_user.id, ResourceType.TEAM, team.id,
            "create", True, "team_created"
        )
        
        return team
        
    except Exception as e:
        db.rollback()
        isolation_middleware._log_security_event(
            current_user.id, "team_creation_failed", "medium",
            f"Failed to create team: {str(e)}"
        )
        raise HTTPException(status_code=500, detail="Team creation failed")


@router.get("/", response_model=List[schemas.Team])
async def get_user_teams(
    include_public: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    team_middleware: TeamContextMiddleware = Depends(get_team_context_middleware)
):
    """Get teams user belongs to or can access"""
    
    try:
        # Get teams user is a member of
        user_teams = db.query(Team).join(TeamMember).filter(
            TeamMember.user_id == current_user.id,
            TeamMember.status == "active"
        ).all()
        
        teams = user_teams
        
        # Add public teams if requested
        if include_public:
            public_teams = db.query(Team).filter(
                Team.visibility == "public",
                ~Team.id.in_([t.id for t in user_teams])  # Exclude already included teams
            ).all()
            teams.extend(public_teams)
        
        return teams
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve teams")


@router.get("/{team_id}", response_model=schemas.TeamDetails)
async def get_team(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    isolation_middleware: DataIsolationMiddleware = Depends(get_data_isolation_middleware)
):
    """Get team details with access control"""
    
    # Check read access
    access_result = isolation_middleware.check_resource_access(
        current_user.id, ResourceType.TEAM, team_id, AccessLevel.READ
    )
    
    if not access_result["allowed"]:
        raise HTTPException(status_code=403, detail=f"Access denied: {access_result['reason']}")
    
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Get team members
    members = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.status == "active"
    ).join(User).all()
    
    # Get resource quota
    quota = db.query(ResourceQuota).filter(
        ResourceQuota.entity_type == "team",
        ResourceQuota.entity_id == team_id
    ).first()
    
    return {
        **team.__dict__,
        "members": members,
        "resource_quota": quota
    }


@router.put("/{team_id}", response_model=schemas.Team)
async def update_team(
    team_id: str,
    team_update: schemas.TeamUpdateRequest,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    isolation_middleware: DataIsolationMiddleware = Depends(get_data_isolation_middleware)
):
    """Update team with admin access control"""
    
    # Check admin access
    access_result = isolation_middleware.check_resource_access(
        current_user.id, ResourceType.TEAM, team_id, AccessLevel.ADMIN
    )
    
    if not access_result["allowed"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    try:
        # Update team fields
        for field, value in team_update.dict(exclude_unset=True).items():
            setattr(team, field, value)
        
        team.updated_at = datetime.utcnow()
        db.commit()
        
        return team
        
    except Exception as e:
        db.rollback()
        isolation_middleware._log_security_event(
            current_user.id, "team_update_failed", "medium",
            f"Failed to update team {team_id}: {str(e)}"
        )
        raise HTTPException(status_code=500, detail="Team update failed")


@router.post("/{team_id}/invite")
async def invite_user_to_team(
    team_id: str,
    invite_request: schemas.TeamInviteRequest,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    isolation_middleware: DataIsolationMiddleware = Depends(get_data_isolation_middleware)
):
    """Invite user to team"""
    
    # Check if user can invite (admin or has invite permission)
    access_result = isolation_middleware.check_resource_access(
        current_user.id, ResourceType.TEAM, team_id, AccessLevel.ADMIN
    )
    
    if not access_result["allowed"]:
        # Check if user has invite permission
        membership = db.query(TeamMember).filter(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id,
            TeamMember.status == "active"
        ).first()
        
        if not membership or "invite" not in membership.permissions:
            raise HTTPException(status_code=403, detail="Invite permission required")
    
    try:
        # Check if user exists
        invitee = db.query(User).filter(User.email == invite_request.email).first()
        if not invitee:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user is already a member
        existing_membership = db.query(TeamMember).filter(
            TeamMember.team_id == team_id,
            TeamMember.user_id == invitee.id
        ).first()
        
        if existing_membership:
            if existing_membership.status == "active":
                raise HTTPException(status_code=400, detail="User is already a team member")
            else:
                # Reactivate membership
                existing_membership.status = "active"
                existing_membership.role = invite_request.role
                existing_membership.updated_at = datetime.utcnow()
                db.commit()
                return {"message": "User re-added to team"}
        
        # Check if invitation already exists
        existing_invitation = db.query(TeamInvitation).filter(
            TeamInvitation.team_id == team_id,
            TeamInvitation.invitee_id == invitee.id,
            TeamInvitation.status == "pending"
        ).first()
        
        if existing_invitation:
            raise HTTPException(status_code=400, detail="Invitation already pending")
        
        # Create invitation
        invitation = TeamInvitation(
            team_id=team_id,
            invitee_id=invitee.id,
            invited_by=current_user.id,
            role=invite_request.role,
            message=invite_request.message,
            expires_at=datetime.utcnow() + timedelta(days=7)  # 7 day expiry
        )
        
        db.add(invitation)
        db.commit()
        
        # TODO: Send invitation email
        
        return {"message": "Invitation sent successfully"}
        
    except Exception as e:
        db.rollback()
        isolation_middleware._log_security_event(
            current_user.id, "team_invitation_failed", "medium",
            f"Failed to invite user to team {team_id}: {str(e)}"
        )
        raise HTTPException(status_code=500, detail="Invitation failed")


@router.post("/{team_id}/invitations/{invitation_id}/respond")
async def respond_to_invitation(
    team_id: str,
    invitation_id: str,
    response: schemas.InvitationResponse,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Accept or decline team invitation"""
    
    invitation = db.query(TeamInvitation).filter(
        TeamInvitation.id == invitation_id,
        TeamInvitation.team_id == team_id,
        TeamInvitation.invitee_id == current_user.id,
        TeamInvitation.status == "pending"
    ).first()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if invitation.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invitation has expired")
    
    try:
        invitation.status = response.action  # "accepted" or "declined"
        invitation.responded_at = datetime.utcnow()
        
        if response.action == "accepted":
            # Create team membership
            membership = TeamMember(
                team_id=team_id,
                user_id=current_user.id,
                role=invitation.role,
                permissions=TeamMember.get_default_permissions(invitation.role),
                status="active"
            )
            db.add(membership)
        
        db.commit()
        
        return {"message": f"Invitation {response.action} successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to respond to invitation")


@router.get("/{team_id}/members", response_model=List[schemas.TeamMemberDetails])
async def get_team_members(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    isolation_middleware: DataIsolationMiddleware = Depends(get_data_isolation_middleware)
):
    """Get team members with access control"""
    
    # Check read access
    access_result = isolation_middleware.check_resource_access(
        current_user.id, ResourceType.TEAM, team_id, AccessLevel.READ
    )
    
    if not access_result["allowed"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    members = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.status == "active"
    ).join(User).all()
    
    return [
        {
            **member.__dict__,
            "user": member.user
        }
        for member in members
    ]


@router.put("/{team_id}/members/{user_id}")
async def update_member_role(
    team_id: str,
    user_id: int,
    role_update: schemas.MemberRoleUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    isolation_middleware: DataIsolationMiddleware = Depends(get_data_isolation_middleware)
):
    """Update team member role"""
    
    # Check admin access
    access_result = isolation_middleware.check_resource_access(
        current_user.id, ResourceType.TEAM, team_id, AccessLevel.ADMIN
    )
    
    if not access_result["allowed"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    membership = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id,
        TeamMember.status == "active"
    ).first()
    
    if not membership:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    # Prevent owner from changing their own role
    if membership.role == "owner" and membership.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Owner cannot change their own role")
    
    try:
        membership.role = role_update.role
        membership.permissions = TeamMember.get_default_permissions(role_update.role)
        membership.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {"message": "Member role updated successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update member role")


@router.delete("/{team_id}/members/{user_id}")
async def remove_team_member(
    team_id: str,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    isolation_middleware: DataIsolationMiddleware = Depends(get_data_isolation_middleware)
):
    """Remove member from team"""
    
    # Check admin access
    access_result = isolation_middleware.check_resource_access(
        current_user.id, ResourceType.TEAM, team_id, AccessLevel.ADMIN
    )
    
    if not access_result["allowed"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    membership = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id,
        TeamMember.status == "active"
    ).first()
    
    if not membership:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    # Prevent removing the owner
    if membership.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove team owner")
    
    try:
        membership.status = "removed"
        membership.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {"message": "Member removed successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to remove member")


@router.get("/{team_id}/resource-usage")
async def get_team_resource_usage(
    team_id: str,
    days: int = Query(30, le=365),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    isolation_middleware: DataIsolationMiddleware = Depends(get_data_isolation_middleware)
):
    """Get team resource usage statistics"""
    
    # Check read access
    access_result = isolation_middleware.check_resource_access(
        current_user.id, ResourceType.TEAM, team_id, AccessLevel.READ
    )
    
    if not access_result["allowed"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        from models.compute import ResourceUsageLog
        from models.job import ModelJob
        
        # Get usage data for the specified period
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get resource usage logs
        usage_logs = db.query(ResourceUsageLog).join(
            TeamMember, ResourceUsageLog.user_id == TeamMember.user_id
        ).filter(
            TeamMember.team_id == team_id,
            ResourceUsageLog.timestamp >= start_date
        ).all()
        
        # Get job statistics
        job_stats = db.query(
            func.count(ModelJob.id).label("total_jobs"),
            func.sum(ModelJob.token_cost).label("total_cost"),
            func.avg(ModelJob.duration_seconds).label("avg_duration")
        ).join(
            TeamMember, ModelJob.user_id == TeamMember.user_id
        ).filter(
            TeamMember.team_id == team_id,
            ModelJob.created_at >= start_date
        ).first()
        
        return {
            "team_id": team_id,
            "period_days": days,
            "resource_usage": {
                "total_jobs": job_stats.total_jobs or 0,
                "total_cost": job_stats.total_cost or 0,
                "average_duration": job_stats.avg_duration or 0,
                "usage_logs": len(usage_logs)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve resource usage")