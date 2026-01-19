"""
Enhanced Models API with Data Isolation and Resource Integration
Provides secure, multi-tenant model management with proper access controls
"""

import os
import logging
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Dict, Any, List, Optional
import json
import uuid
from datetime import datetime

from models import schemas
from models.model import Model
from models.user import User
from models.team import Team, TeamMember
from models.data import Upload
from models.job import ModelJob
from services import security
from services.enhanced_training_service import get_training_service, EnhancedTrainingConfig
from middleware.data_isolation import DataIsolationMiddleware, AccessLevel, ResourceType
from core.database import get_db

router = APIRouter(prefix="/api/v2/models", tags=["Enhanced Models"])
logger = logging.getLogger(__name__)

# Initialize data isolation middleware
def get_data_isolation():
    from core.database import SessionLocal
    return DataIsolationMiddleware(SessionLocal)

@router.get("/", response_model=List[schemas.Model])
def get_accessible_models(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    team_id: Optional[str] = Query(None, description="Filter by team ID"),
    visibility: Optional[str] = Query(None, description="Filter by visibility: private, team, public"),
    model_type: Optional[str] = Query(None, description="Filter by model type"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """Get models accessible to the current user with proper data isolation"""
    try:
        # Base query
        query = db.query(Model)
        
        # Apply data isolation filters
        access_filters = []
        
        # User's own models
        user_models = (Model.user_id == current_user.id)
        access_filters.append(user_models)
        
        # Public models
        public_models = (Model.visibility == 'public')
        access_filters.append(public_models)
        
        # Team models (if user is a member)
        if team_id:
            # Verify user is a team member
            team_membership = db.query(TeamMember).filter(
                TeamMember.user_id == current_user.id,
                TeamMember.team_id == team_id,
                TeamMember.status == 'active'
            ).first()
            
            if team_membership:
                team_models = and_(Model.team_id == team_id, Model.visibility.in_(['team', 'public']))
                access_filters.append(team_models)
        else:
            # Get all teams user belongs to
            user_teams = db.query(TeamMember.team_id).filter(
                TeamMember.user_id == current_user.id,
                TeamMember.status == 'active'
            ).subquery()
            
            team_models = and_(
                Model.team_id.in_(user_teams),
                Model.visibility.in_(['team', 'public'])
            )
            access_filters.append(team_models)
        
        # Apply access filters
        query = query.filter(or_(*access_filters))
        
        # Apply additional filters
        if visibility:
            if visibility == 'private':
                query = query.filter(Model.user_id == current_user.id, Model.visibility == 'private')
            else:
                query = query.filter(Model.visibility == visibility)
        
        if model_type:
            query = query.filter(Model.type == model_type)
        
        # Apply ordering and pagination
        query = query.order_by(Model.updated_at.desc())
        models = query.offset(offset).limit(limit).all()
        
        return models
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve models: {str(e)}")

@router.get("/{model_id}", response_model=schemas.Model)
def get_model_by_id(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Get a specific model with access control"""
    try:
        data_isolation = get_data_isolation()
        
        # Check access permissions
        access_result = data_isolation.check_resource_access(
            current_user.id, ResourceType.MODEL, model_id, AccessLevel.READ
        )
        
        if not access_result["allowed"]:
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied: {access_result['reason']}"
            )
        
        model = db.query(Model).filter(Model.id == model_id).first()
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        return model
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve model: {str(e)}")

@router.post("/train")
async def start_enhanced_training(
    training_request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    x_team_context: Optional[str] = Header(None, description="Team context for the operation")
):
    """Start model training with enhanced resource allocation and data isolation"""
    try:
        # Validate required fields
        required_fields = ["model_name", "algorithm", "data_sources", "target_column"]
        for field in required_fields:
            if field not in training_request:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Extract configuration
        data_isolation = get_data_isolation()
        
        # Validate data source access
        data_sources = training_request["data_sources"]
        if not isinstance(data_sources, list) or not data_sources:
            raise HTTPException(status_code=400, detail="At least one data source is required")
        
        validated_sources = []
        for source in data_sources:
            if "data_id" not in source:
                raise HTTPException(status_code=400, detail="Each data source must have a data_id")
            
            # Check access to data source
            access_result = data_isolation.check_resource_access(
                current_user.id, ResourceType.UPLOAD, 
                source["data_id"], AccessLevel.READ, x_team_context
            )
            
            if not access_result["allowed"]:
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied to data source {source['data_id']}: {access_result['reason']}"
                )
            
            validated_sources.append(source)
        
        # Create model record if needed
        model_id = training_request.get("model_id")
        if not model_id:
            model = Model(
                user_id=current_user.id,
                team_id=x_team_context,
                name=training_request["model_name"],
                description=training_request.get("description", ""),
                type=training_request.get("model_type", "classification"),
                visibility=training_request.get("visibility", "private"),
                status="training"
            )
            db.add(model)
            db.commit()
            model_id = str(model.id)
        
        # Prepare training configuration
        config = EnhancedTrainingConfig(
            model_id=model_id,
            user_id=current_user.id,
            team_id=x_team_context,
            model_name=training_request["model_name"],
            algorithm=training_request["algorithm"],
            parameters={
                "algorithm_parameters": training_request.get("algorithm_parameters", {}),
                "test_size": training_request.get("test_size", 0.2),
                "random_state": training_request.get("random_state", 42),
                "scale_features": training_request.get("scale_features", True)
            },
            data_config={
                "target_column": training_request["target_column"]
            },
            training_data_sources=validated_sources,
            resource_requirements={
                "cpu_cores": training_request.get("cpu_cores", 2),
                "memory_gb": training_request.get("memory_gb", 4),
                "gpu_count": training_request.get("gpu_count", 0),
                "max_duration_hours": training_request.get("max_duration_hours", 2)
            },
            isolation_level=training_request.get("isolation_level", "standard"),
            priority=training_request.get("priority", 1)
        )
        
        # Submit training job
        training_service = get_training_service()
        result = await training_service.submit_training_job(config)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "job_id": result["job_id"],
            "model_id": model_id,
            "message": "Training job submitted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start training: {str(e)}")

@router.get("/training/{job_id}/status")
async def get_training_status(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Get training job status with resource usage details"""
    try:
        training_service = get_training_service()
        result = await training_service.get_job_status(job_id, current_user.id)
        
        if not result["success"]:
            raise HTTPException(status_code=404, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get training status: {str(e)}")


# Additional endpoints would continue here...
# For brevity, I'm including the key endpoints that demonstrate the enhanced integration