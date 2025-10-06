from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from models import schemas
from services import model_service, security, data_validation_service
from core.database import get_db
import json
import uuid
from typing import Dict, Any

router = APIRouter(prefix="/api/models", tags=["Models"])

@router.post("/", response_model=schemas.Model)
def create_model(model: schemas.ModelCreateRequest, db: Session = Depends(get_db), current_user: schemas.User = Depends(security.get_current_user)):
    return model_service.create_model(db=db, model=model, user_id=current_user.id)

@router.get("/me", response_model=list[schemas.Model])
def get_my_models(db: Session = Depends(get_db), current_user: schemas.User = Depends(security.get_current_user)):
    return model_service.get_models_by_user(db=db, user_id=current_user.id)

@router.get("/community", response_model=list[schemas.Model])
def get_community_models(db: Session = Depends(get_db)):
    return model_service.get_community_models(db=db)

@router.get("/pretrained", response_model=list[schemas.Model])
def get_pretrained_models(db: Session = Depends(get_db)):
    return model_service.get_pretrained_models(db=db)

@router.get("/{model_id}", response_model=schemas.Model)
def get_model_by_id(
    model_id: int, 
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    model = model_service.get_model_by_id(db=db, model_id=model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    # Check if user has access to this model
    if model.visibility != 'public' and model.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return model

@router.post("/{model_id}/add-to-library", response_model=schemas.Model)
def add_model_to_library(model_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(security.get_current_user)):
    new_model = model_service.add_model_to_user_library(db=db, user_id=current_user.id, model_id=model_id)
    if not new_model:
        raise HTTPException(status_code=404, detail="Model not found")
    return new_model

@router.get("/active", response_model=list[schemas.Model])
def get_active_models(db: Session = Depends(get_db), current_user: schemas.User = Depends(security.get_current_user)):
    try:
        # Get all models for now since status might not be in database
        models = model_service.get_models_by_user(db=db, user_id=current_user.id)
        # Filter in memory if status field exists
        active_models = [m for m in models if getattr(m, 'status', 'active') == 'active'] if models else []
        return active_models
    except Exception as e:
        # Return empty list if no models found
        return []

@router.get("/in-progress", response_model=list[schemas.Model])
def get_in_progress_models(db: Session = Depends(get_db), current_user: schemas.User = Depends(security.get_current_user)):
    try:
        # Get all models for now since status might not be in database
        models = model_service.get_models_by_user(db=db, user_id=current_user.id)
        # Filter in memory if status field exists
        progress_models = [m for m in models if getattr(m, 'status', None) == 'in-progress'] if models else []
        return progress_models
    except Exception as e:
        # Return empty list if no models found
        return []

@router.post("/validate-data")
async def validate_training_data(
    file: UploadFile = File(...),
    current_user: schemas.User = Depends(security.get_current_user)
) -> Dict[str, Any]:
    """
    Validate uploaded training data file and return comprehensive analysis
    """
    try:
        # Read file content
        file_content = await file.read()
        
        # Validate file
        validation_result = data_validation_service.validate_uploaded_file(
            file_content, file.filename or "unknown"
        )
        
        # Convert to JSON-serializable format
        return {
            "is_valid": validation_result.is_valid,
            "total_rows": validation_result.total_rows,
            "total_columns": validation_result.total_columns,
            "file_size_mb": validation_result.file_size_mb,
            "encoding": validation_result.encoding,
            "overall_quality_score": validation_result.overall_quality_score,
            "processing_time_seconds": validation_result.processing_time_seconds,
            "columns": [
                {
                    "name": col.name,
                    "data_type": col.data_type.value,
                    "missing_count": col.missing_count,
                    "missing_percentage": col.missing_percentage,
                    "unique_count": col.unique_count,
                    "cardinality_ratio": col.cardinality_ratio,
                    "statistics": col.statistics,
                    "sample_values": col.sample_values,
                    "quality_issues": [issue.value for issue in col.quality_issues],
                    "recommendations": col.recommendations
                }
                for col in validation_result.columns
            ],
            "data_preview": validation_result.data_preview,
            "quality_issues": [issue.value for issue in validation_result.quality_issues],
            "recommendations": validation_result.recommendations
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File validation failed: {str(e)}")

@router.post("/data-statistics")
async def get_data_statistics(
    file: UploadFile = File(...),
    current_user: schemas.User = Depends(security.get_current_user)
) -> Dict[str, Any]:
    """
    Get detailed statistical analysis of uploaded data
    """
    try:
        file_content = await file.read()
        validation_result = data_validation_service.validate_uploaded_file(
            file_content, file.filename or "unknown"
        )
        
        if not validation_result.is_valid:
            raise HTTPException(status_code=400, detail="Invalid data file")
        
        # Return detailed statistics for each column
        return {
            "summary": {
                "total_rows": validation_result.total_rows,
                "total_columns": validation_result.total_columns,
                "quality_score": validation_result.overall_quality_score,
                "missing_data_percentage": sum(col.missing_percentage for col in validation_result.columns) / len(validation_result.columns)
            },
            "columns": [
                {
                    "name": col.name,
                    "data_type": col.data_type.value,
                    "statistics": col.statistics,
                    "missing_percentage": col.missing_percentage,
                    "unique_count": col.unique_count,
                    "sample_values": col.sample_values[:5]  # First 5 samples
                }
                for col in validation_result.columns
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Statistics calculation failed: {str(e)}")

@router.post("/preview-data")
async def preview_uploaded_data(
    file: UploadFile = File(...),
    rows: int = 100,
    current_user: schemas.User = Depends(security.get_current_user)
) -> Dict[str, Any]:
    """
    Get a preview of uploaded data with specified number of rows
    """
    try:
        file_content = await file.read()
        validation_result = data_validation_service.validate_uploaded_file(
            file_content, file.filename or "unknown"
        )
        
        if not validation_result.is_valid:
            raise HTTPException(status_code=400, detail="Invalid data file")
        
        # Limit preview rows
        preview_data = validation_result.data_preview[:rows]
        
        return {
            "preview": preview_data,
            "total_rows": validation_result.total_rows,
            "columns": [col.name for col in validation_result.columns],
            "data_types": {col.name: col.data_type.value for col in validation_result.columns}
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Data preview failed: {str(e)}")

@router.post("/train")
async def start_model_training(
    training_request: dict,
    current_user: schemas.User = Depends(security.get_current_user)
) -> Dict[str, Any]:
    """
    Start training a model with the new ML pipeline
    """
    try:
        from services.train_model import training_pipeline, TrainingConfig
        import pandas as pd
        import io
        import base64
        
        # Extract configuration from request
        config_data = training_request.get('config', {})
        file_data = training_request.get('file_data')  # Base64 encoded file data
        
        if not file_data:
            raise HTTPException(status_code=400, detail="No training data provided")
        
        # Decode file data
        file_content = base64.b64decode(file_data)
        
        # Parse file content to DataFrame
        # This is simplified - in production you'd use the validation service
        try:
            data = pd.read_csv(io.BytesIO(file_content))
        except:
            raise HTTPException(status_code=400, detail="Failed to parse training data")
        
        # Create training configuration
        training_config = TrainingConfig(
            model_id=config_data.get('model_id', str(uuid.uuid4())),
            user_id=current_user.id,
            model_name=config_data.get('model_name', 'Unnamed Model'),
            algorithm=config_data.get('algorithm', 'random_forest_clf'),
            parameters=config_data.get('parameters', {}),
            data_config=config_data.get('data_config', {}),
            preprocessing_config=config_data.get('preprocessing_config', {}),
            training_config=config_data.get('training_config', {}),
            optimization_config=config_data.get('optimization_config', {})
        )
        
        # Start training
        job_id = await training_pipeline.start_training(training_config, data)
        
        return {
            "success": True,
            "job_id": job_id,
            "message": "Model training started successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to start training: {str(e)}")

@router.get("/training-progress/{job_id}")
async def get_training_progress(
    job_id: str,
    current_user: schemas.User = Depends(security.get_current_user)
) -> Dict[str, Any]:
    """
    Get training progress for a specific job
    """
    try:
        from services.train_model import training_pipeline
        
        progress = training_pipeline.get_training_progress(job_id)
        
        if not progress:
            raise HTTPException(status_code=404, detail="Training job not found")
        
        return {
            "job_id": progress.job_id,
            "status": progress.status.value,
            "progress_percentage": progress.progress_percentage,
            "current_stage": progress.current_stage,
            "message": progress.message,
            "metrics": progress.metrics,
            "start_time": progress.start_time.isoformat(),
            "estimated_completion": progress.estimated_completion.isoformat() if progress.estimated_completion else None,
            "logs": progress.logs or []
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get training progress: {str(e)}")

@router.get("/training-result/{job_id}")
async def get_training_result(
    job_id: str,
    current_user: schemas.User = Depends(security.get_current_user)
) -> Dict[str, Any]:
    """
    Get training result for a completed job
    """
    try:
        from services.train_model import training_pipeline
        
        result = training_pipeline.get_training_result(job_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Training result not found")
        
        return {
            "job_id": result.job_id,
            "model_id": result.model_id,
            "success": result.success,
            "model_path": result.model_path,
            "metrics": result.metrics,
            "feature_importance": result.feature_importance,
            "preprocessing_steps": result.preprocessing_steps,
            "training_time_seconds": result.training_time_seconds,
            "error_message": result.error_message
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get training result: {str(e)}")

@router.post("/training-cancel/{job_id}")
async def cancel_training(
    job_id: str,
    current_user: schemas.User = Depends(security.get_current_user)
) -> Dict[str, Any]:
    """
    Cancel a running training job
    """
    try:
        from services.train_model import training_pipeline
        
        success = training_pipeline.cancel_training(job_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Training job not found")
        
        return {
            "success": True,
            "message": "Training job cancelled successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to cancel training: {str(e)}")
