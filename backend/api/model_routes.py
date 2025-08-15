"""
Model Management API Routes
"""

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
import json

from .auth_routes import get_current_user, require_permission
from ..services.model_management_service import ModelManagementService, ModelMetadata
from ..services.training_pipeline import TrainingPipeline, TrainingConfig, TaskType
from ..models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/models", tags=["models"])

# Service instances
model_service = None
training_pipeline = None


def get_model_service():
    """Get model management service instance"""
    global model_service
    if not model_service:
        model_service = ModelManagementService("/data/models", {})
    return model_service


def get_training_pipeline():
    """Get training pipeline instance"""
    global training_pipeline
    if not training_pipeline:
        training_pipeline = TrainingPipeline("/data/models", {})
    return training_pipeline


# Request/Response Models
class CreateModelRequest(BaseModel):
    name: str
    description: str
    model_type: str
    task_type: str
    framework: str = "sklearn"
    tags: List[str] = []
    is_public: bool = False


class UpdateModelRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None


class TrainModelRequest(BaseModel):
    model_id: str
    dataset_path: str
    target_column: str
    feature_columns: Optional[List[str]] = None
    hyperparameters: Optional[Dict[str, Any]] = None
    test_size: float = 0.2
    validation_size: float = 0.2
    cross_validation: bool = True
    optimization_metric: str = "accuracy"


class DeployModelRequest(BaseModel):
    model_id: str
    version: str
    endpoint_name: str
    instance_type: str = "ml.t2.medium"
    min_instances: int = 1
    max_instances: int = 3
    auto_scaling: bool = True


class PredictRequest(BaseModel):
    data: Dict[str, Any]
    return_probabilities: bool = False


class BatchPredictRequest(BaseModel):
    input_path: str
    output_path: str
    batch_size: int = 100


class ModelResponse(BaseModel):
    model_id: str
    name: str
    description: str
    model_type: str
    task_type: str
    framework: str
    owner_id: str
    created_at: datetime
    updated_at: datetime
    version_count: int
    is_public: bool
    tags: List[str]
    metrics: Optional[Dict[str, float]] = None


# Routes
@router.post("/create", response_model=ModelResponse)
async def create_model(
    request: CreateModelRequest,
    user: User = Depends(get_current_user)
):
    """Create a new model"""
    try:
        service = get_model_service()
        
        # Create model metadata
        metadata = ModelMetadata(
            model_id="",  # Will be generated
            name=request.name,
            description=request.description,
            model_type=request.model_type,
            task_type=request.task_type,
            framework=request.framework,
            owner_id=user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            tags=request.tags,
            is_public=request.is_public
        )
        
        # Register model
        await service.initialize()
        model_id = await service.register_model(metadata)
        
        if not model_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create model"
            )
        
        # Get created model
        model = await service.get_model(model_id)
        
        return ModelResponse(
            model_id=model.model_id,
            name=model.name,
            description=model.description,
            model_type=model.model_type,
            task_type=model.task_type,
            framework=model.framework,
            owner_id=model.owner_id,
            created_at=model.created_at,
            updated_at=model.updated_at,
            version_count=len(model.versions),
            is_public=model.is_public,
            tags=model.tags
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create model error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create model"
        )


@router.get("/list", response_model=List[ModelResponse])
async def list_models(
    owner_id: Optional[str] = None,
    task_type: Optional[str] = None,
    framework: Optional[str] = None,
    tags: Optional[List[str]] = None,
    include_public: bool = True,
    limit: int = 100,
    offset: int = 0,
    user: User = Depends(get_current_user)
):
    """List models"""
    try:
        service = get_model_service()
        await service.initialize()
        
        # Build filters
        filters = {}
        if owner_id:
            filters['owner_id'] = owner_id
        if task_type:
            filters['task_type'] = task_type
        if framework:
            filters['framework'] = framework
        if tags:
            filters['tags'] = tags
        
        # List models
        models = await service.list_models(
            owner_id=user.id if not include_public else None,
            filters=filters
        )
        
        # Paginate
        models = models[offset:offset + limit]
        
        # Convert to response
        return [
            ModelResponse(
                model_id=m.model_id,
                name=m.name,
                description=m.description,
                model_type=m.model_type,
                task_type=m.task_type,
                framework=m.framework,
                owner_id=m.owner_id,
                created_at=m.created_at,
                updated_at=m.updated_at,
                version_count=len(m.versions),
                is_public=m.is_public,
                tags=m.tags,
                metrics=m.versions[-1].metrics if m.versions else None
            )
            for m in models
        ]
        
    except Exception as e:
        logger.error(f"List models error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list models"
        )


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(
    model_id: str,
    user: User = Depends(get_current_user)
):
    """Get model details"""
    try:
        service = get_model_service()
        await service.initialize()
        
        # Get model
        model = await service.get_model(model_id)
        
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
        
        # Check access
        if not model.is_public and model.owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        return ModelResponse(
            model_id=model.model_id,
            name=model.name,
            description=model.description,
            model_type=model.model_type,
            task_type=model.task_type,
            framework=model.framework,
            owner_id=model.owner_id,
            created_at=model.created_at,
            updated_at=model.updated_at,
            version_count=len(model.versions),
            is_public=model.is_public,
            tags=model.tags,
            metrics=model.versions[-1].metrics if model.versions else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get model error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get model"
        )


@router.put("/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: str,
    request: UpdateModelRequest,
    user: User = Depends(get_current_user)
):
    """Update model metadata"""
    try:
        service = get_model_service()
        await service.initialize()
        
        # Get model
        model = await service.get_model(model_id)
        
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
        
        # Check ownership
        if model.owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only model owner can update"
            )
        
        # Update fields
        updates = {}
        if request.name is not None:
            updates['name'] = request.name
        if request.description is not None:
            updates['description'] = request.description
        if request.tags is not None:
            updates['tags'] = request.tags
        if request.is_public is not None:
            updates['is_public'] = request.is_public
        
        # Update model
        success = await service.update_model(model_id, updates)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update model"
            )
        
        # Get updated model
        model = await service.get_model(model_id)
        
        return ModelResponse(
            model_id=model.model_id,
            name=model.name,
            description=model.description,
            model_type=model.model_type,
            task_type=model.task_type,
            framework=model.framework,
            owner_id=model.owner_id,
            created_at=model.created_at,
            updated_at=model.updated_at,
            version_count=len(model.versions),
            is_public=model.is_public,
            tags=model.tags,
            metrics=model.versions[-1].metrics if model.versions else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update model error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update model"
        )


@router.delete("/{model_id}")
async def delete_model(
    model_id: str,
    user: User = Depends(get_current_user)
):
    """Delete a model"""
    try:
        service = get_model_service()
        await service.initialize()
        
        # Get model
        model = await service.get_model(model_id)
        
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
        
        # Check ownership
        if model.owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only model owner can delete"
            )
        
        # Delete model
        success = await service.delete_model(model_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete model"
            )
        
        return {"message": "Model deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete model error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete model"
        )


@router.post("/{model_id}/train")
async def train_model(
    model_id: str,
    request: TrainModelRequest,
    user: User = Depends(get_current_user)
):
    """Train a model"""
    try:
        service = get_model_service()
        pipeline = get_training_pipeline()
        
        await service.initialize()
        
        # Get model
        model = await service.get_model(model_id)
        
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
        
        # Check ownership
        if model.owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only model owner can train"
            )
        
        # Create training config
        training_config = TrainingConfig(
            model_id=model_id,
            model_type=model.model_type,
            task_type=TaskType[model.task_type.upper()],
            data_path=request.dataset_path,
            target_column=request.target_column,
            feature_columns=request.feature_columns,
            test_size=request.test_size,
            validation_size=request.validation_size,
            hyperparameters=request.hyperparameters,
            cross_validation=request.cross_validation,
            optimization_metric=request.optimization_metric
        )
        
        # Start training
        result = await pipeline.train_model(training_config)
        
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Training failed: {result.error_message}"
            )
        
        # Create new version with training results
        version_id = await service.create_version(
            model_id,
            model_path=result.model_path,
            metrics=result.test_metrics,
            hyperparameters=result.best_hyperparameters,
            training_data={
                'dataset': request.dataset_path,
                'target': request.target_column,
                'features': request.feature_columns
            }
        )
        
        return {
            "message": "Model trained successfully",
            "version_id": version_id,
            "metrics": result.test_metrics,
            "training_time": result.training_time
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Train model error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to train model"
        )


@router.post("/{model_id}/predict")
async def predict(
    model_id: str,
    request: PredictRequest,
    version: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Make prediction with model"""
    try:
        service = get_model_service()
        pipeline = get_training_pipeline()
        
        await service.initialize()
        
        # Get model
        model = await service.get_model(model_id)
        
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
        
        # Check access
        if not model.is_public and model.owner_id != user.id:
            # Check if user has been granted access
            # This would check sharing permissions
            pass
        
        # Get version
        if not version:
            version = model.versions[-1].version if model.versions else None
        
        if not version:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No trained version available"
            )
        
        # Prepare data
        import pandas as pd
        import numpy as np
        
        if isinstance(request.data, dict):
            # Single prediction
            df = pd.DataFrame([request.data])
        else:
            # Batch prediction
            df = pd.DataFrame(request.data)
        
        data_array = df.values
        
        # Make prediction
        if request.return_probabilities:
            predictions = await pipeline.predict_proba(model_id, data_array)
        else:
            predictions = await pipeline.predict(model_id, data_array)
        
        return {
            "predictions": predictions.tolist(),
            "model_id": model_id,
            "version": version
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Predict error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Prediction failed"
        )


@router.post("/{model_id}/deploy")
async def deploy_model(
    model_id: str,
    request: DeployModelRequest,
    user: User = Depends(require_permission("model.deploy"))
):
    """Deploy model to production"""
    try:
        service = get_model_service()
        await service.initialize()
        
        # Get model
        model = await service.get_model(model_id)
        
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
        
        # Check ownership
        if model.owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only model owner can deploy"
            )
        
        # Deploy model
        deployment_config = {
            'endpoint_name': request.endpoint_name,
            'instance_type': request.instance_type,
            'min_instances': request.min_instances,
            'max_instances': request.max_instances,
            'auto_scaling': request.auto_scaling
        }
        
        deployment_id = await service.deploy_model(
            model_id,
            request.version,
            deployment_config
        )
        
        if not deployment_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Deployment failed"
            )
        
        return {
            "message": "Model deployed successfully",
            "deployment_id": deployment_id,
            "endpoint": f"/api/models/{model_id}/predict"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deploy model error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deploy model"
        )


@router.get("/{model_id}/versions")
async def get_model_versions(
    model_id: str,
    user: User = Depends(get_current_user)
):
    """Get model versions"""
    try:
        service = get_model_service()
        await service.initialize()
        
        # Get model
        model = await service.get_model(model_id)
        
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
        
        # Check access
        if not model.is_public and model.owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        return {
            "model_id": model_id,
            "versions": [
                {
                    "version": v.version,
                    "created_at": v.created_at,
                    "metrics": v.metrics,
                    "hyperparameters": v.hyperparameters,
                    "model_size": v.model_size
                }
                for v in model.versions
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get versions error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get versions"
        )


@router.post("/{model_id}/share")
async def share_model(
    model_id: str,
    user_ids: List[str],
    permission: str = "read",
    user: User = Depends(get_current_user)
):
    """Share model with other users"""
    try:
        service = get_model_service()
        await service.initialize()
        
        # Get model
        model = await service.get_model(model_id)
        
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
        
        # Check ownership
        if model.owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only model owner can share"
            )
        
        # Share model
        for user_id in user_ids:
            success = await service.share_model(
                model_id,
                user_id,
                permission
            )
        
        return {
            "message": f"Model shared with {len(user_ids)} users"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Share model error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to share model"
        )