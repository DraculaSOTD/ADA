"""
Enhanced ML Training Service with Resource Allocation Integration
Integrates model training with compute resource allocation, data isolation, and lineage tracking
"""

import pandas as pd
import numpy as np
import joblib
import json
import os
import asyncio
import uuid
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import logging

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

# ML Libraries
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, mean_squared_error, r2_score

# Local imports
from models.job import ModelJob
from models.model import Model
from models.user import User
from models.team import Team, TeamMember
from models.data import Upload
from models.compute import ComputeInstance, ResourceAllocation, TeamResourceQuota, JobResourceAllocation
from models.enhanced_isolation import (
    DataTransformationLog, ResourceBillingLog, DataClassification
)
from services.resource_manager import ResourceManager, ResourceRequirements
from services.workspace_manager import get_workspace_manager
from middleware.data_isolation import DataIsolationMiddleware, AccessLevel, ResourceType
from core.database import get_db

logger = logging.getLogger(__name__)


class TrainingStatus(Enum):
    PENDING = "pending"
    RESOURCE_ALLOCATION = "resource_allocation"
    INITIALIZING = "initializing"
    PREPROCESSING = "preprocessing"
    TRAINING = "training"
    EVALUATING = "evaluating"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class EnhancedTrainingConfig:
    model_id: str
    user_id: int
    team_id: Optional[str]
    model_name: str
    algorithm: str
    parameters: Dict[str, Any]
    data_config: Dict[str, Any]
    training_data_sources: List[Dict[str, Any]]  # List of data sources with permissions
    resource_requirements: Dict[str, Any]
    isolation_level: str = "standard"
    priority: int = 1


@dataclass
class TrainingResult:
    job_id: int
    model_id: str
    success: bool
    model_path: Optional[str]
    metrics: Dict[str, Any]
    resource_usage: Dict[str, Any]
    data_lineage: Dict[str, Any]
    training_time_seconds: float
    total_cost_tokens: int
    error_message: Optional[str] = None


class EnhancedTrainingService:
    """Enhanced training service with resource allocation and data isolation"""
    
    def __init__(self, db_session_factory):
        self.db_session_factory = db_session_factory
        self.resource_manager = ResourceManager(db_session_factory)
        self.data_isolation = DataIsolationMiddleware(db_session_factory)
        self.workspace_manager = get_workspace_manager()
        self.models_dir = "models"
        self.active_trainings = {}
        
        # Create models directory
        os.makedirs(self.models_dir, exist_ok=True)
        
        # Algorithm registry
        self.algorithms = {
            'random_forest_clf': RandomForestClassifier,
            'logistic_regression': LogisticRegression,
            'random_forest_reg': RandomForestRegressor,
            'linear_regression': LinearRegression
        }
    
    async def submit_training_job(self, config: EnhancedTrainingConfig) -> Dict[str, Any]:
        """Submit a training job with resource allocation and data validation"""
        try:
            # Validate user permissions and data access
            validation_result = await self._validate_training_submission(config)
            if not validation_result["valid"]:
                return {"success": False, "error": validation_result["error"]}
            
            # Create job record
            with self.db_session_factory() as db:
                job = ModelJob(
                    user_id=config.user_id,
                    team_id=config.team_id,
                    model_id=int(config.model_id) if config.model_id.isdigit() else None,
                    job_type="training",
                    parameters=config.parameters,
                    resource_requirements=config.resource_requirements,
                    priority=config.priority,
                    status=TrainingStatus.PENDING.value,
                    isolation_level=config.isolation_level,
                    data_sources=config.training_data_sources,
                    # Enhanced resource estimation
                    requires_gpu=config.resource_requirements.get("gpu_count", 0) > 0,
                    estimated_memory_gb=config.resource_requirements.get("memory_gb", 4),
                    estimated_cpu_cores=config.resource_requirements.get("cpu_cores", 2),
                    estimated_duration_hours=config.resource_requirements.get("max_duration_hours", 1),
                    resource_allocation_status="pending"
                )
                db.add(job)
                db.commit()
                job_id = job.id
            
            # Submit to resource manager for allocation
            resource_job_config = {
                "job_type": "training",
                "model_id": config.model_id,
                "resource_requirements": config.resource_requirements,
                "priority": config.priority,
                "isolation_level": config.isolation_level
            }
            
            allocation_result = await self.resource_manager.submit_job(
                resource_job_config, config.user_id, config.team_id
            )
            
            if not allocation_result["success"]:
                # Update job status to failed
                with self.db_session_factory() as db:
                    job = db.query(ModelJob).filter(ModelJob.id == job_id).first()
                    if job:
                        job.status = TrainingStatus.FAILED.value
                        job.error_message = f"Resource allocation failed: {allocation_result['error']}"
                        db.commit()
                
                return {"success": False, "error": allocation_result["error"]}
            
            # Start training process
            asyncio.create_task(self._execute_training_job(job_id, config))
            
            logger.info(f"Training job {job_id} submitted successfully")
            return {"success": True, "job_id": job_id}
            
        except Exception as e:
            logger.error(f"Failed to submit training job: {e}")
            return {"success": False, "error": str(e)}
    
    async def _validate_training_submission(self, config: EnhancedTrainingConfig) -> Dict[str, Any]:
        """Validate user permissions and resource quotas for training"""
        try:
            with self.db_session_factory() as db:
                # Check user account status
                user = db.query(User).filter(User.id == config.user_id).first()
                if not user or user.account_status != "active":
                    return {"valid": False, "error": "User account not active"}
                
                # Validate data access permissions
                for data_source in config.training_data_sources:
                    access_result = self.data_isolation.check_resource_access(
                        config.user_id,
                        ResourceType.UPLOAD,
                        data_source["data_id"],
                        AccessLevel.READ,
                        config.team_id
                    )
                    if not access_result["allowed"]:
                        return {
                            "valid": False, 
                            "error": f"Access denied to data source {data_source['data_id']}: {access_result['reason']}"
                        }
                
                # Check resource quotas
                quota_check = await self._check_resource_quotas(config.user_id, config.team_id, config.resource_requirements)
                if not quota_check["allowed"]:
                    return {"valid": False, "error": quota_check["reason"]}
                
                # Validate algorithm and parameters
                if config.algorithm not in self.algorithms:
                    return {"valid": False, "error": f"Unsupported algorithm: {config.algorithm}"}
                
                return {"valid": True}
                
        except Exception as e:
            logger.error(f"Error validating training submission: {e}")
            return {"valid": False, "error": "Validation failed"}
    
    async def _check_resource_quotas(self, user_id: int, team_id: Optional[str], requirements: Dict[str, Any]) -> Dict[str, Any]:
        """Check if user/team has sufficient quota for requested resources"""
        try:
            with self.db_session_factory() as db:
                # Get user's current active jobs
                active_jobs = db.query(ModelJob).filter(
                    ModelJob.user_id == user_id,
                    ModelJob.status.in_(["pending", "resource_allocation", "running"])
                ).count()
                
                # Check team quotas if applicable
                if team_id:
                    team_quota = db.query(TeamResourceQuota).filter(
                        TeamResourceQuota.team_id == team_id
                    ).first()
                    
                    if team_quota:
                        if active_jobs >= team_quota.max_concurrent_jobs:
                            return {
                                "allowed": False,
                                "reason": f"Team concurrent job limit exceeded ({team_quota.max_concurrent_jobs})"
                            }
                        
                        # Check GPU requirements
                        if requirements.get("gpu_count", 0) > 0 and not team_quota.can_use_gpu:
                            return {
                                "allowed": False,
                                "reason": "Team not authorized for GPU usage"
                            }
                        
                        # Check daily token usage
                        team = db.query(Team).filter(Team.id == team_id).first()
                        if team and team.daily_token_usage >= team_quota.daily_token_limit:
                            return {
                                "allowed": False,
                                "reason": "Team daily token limit exceeded"
                            }
                
                # Check user limits (default limits if no specific quotas)
                max_concurrent = 5  # Default user limit
                if active_jobs >= max_concurrent:
                    return {
                        "allowed": False,
                        "reason": f"User concurrent job limit exceeded ({max_concurrent})"
                    }
                
                return {"allowed": True}
                
        except Exception as e:
            logger.error(f"Error checking resource quotas: {e}")
            return {"allowed": False, "reason": "Quota check failed"}
    
    async def _execute_training_job(self, job_id: int, config: EnhancedTrainingConfig):
        """Execute the training job with proper resource allocation and tracking"""
        transformation_id = str(uuid.uuid4())
        start_time = datetime.utcnow()
        
        try:
            # Update job status
            with self.db_session_factory() as db:
                job = db.query(ModelJob).filter(ModelJob.id == job_id).first()
                job.status = TrainingStatus.RESOURCE_ALLOCATION.value
                job.started_at = start_time
                db.commit()
            
            # Wait for resource allocation
            allocation_result = await self._wait_for_resource_allocation(job_id)
            if not allocation_result["success"]:
                await self._mark_job_failed(job_id, f"Resource allocation failed: {allocation_result['error']}")
                return
            
            # Create temporary workspace for training data isolation
            with self.db_session_factory() as db:
                job = db.query(ModelJob).filter(ModelJob.id == job_id).first()
                job.status = TrainingStatus.INITIALIZING.value
                db.commit()
                
                # Create isolated workspace for training data
                workspace_result = self.workspace_manager.create_training_workspace(
                    db, job_id, config.user_id, config.training_data_sources
                )
                
                if not workspace_result["success"]:
                    await self._mark_job_failed(job_id, f"Workspace creation failed: {workspace_result['error']}")
                    return
            
            # Load and validate data from workspace
            data_result = await self._load_and_validate_training_data(config, transformation_id, workspace_result)
            if not data_result["success"]:
                await self._mark_job_failed(job_id, f"Data loading failed: {data_result['error']}")
                await self._cleanup_training_workspace(job_id)
                return
            
            training_data = data_result["data"]
            data_metadata = data_result["metadata"]
            
            # Preprocess data
            with self.db_session_factory() as db:
                job = db.query(ModelJob).filter(ModelJob.id == job_id).first()
                job.status = TrainingStatus.PREPROCESSING.value
                job.progress = 25
                db.commit()
            
            preprocessing_result = await self._preprocess_data(training_data, config)
            if not preprocessing_result["success"]:
                await self._mark_job_failed(job_id, f"Preprocessing failed: {preprocessing_result['error']}")
                return
            
            X_train, X_test, y_train, y_test = preprocessing_result["data"]
            preprocessing_steps = preprocessing_result["steps"]
            
            # Train model
            with self.db_session_factory() as db:
                job = db.query(ModelJob).filter(ModelJob.id == job_id).first()
                job.status = TrainingStatus.TRAINING.value
                job.progress = 50
                db.commit()
            
            training_result = await self._train_model(X_train, y_train, config)
            if not training_result["success"]:
                await self._mark_job_failed(job_id, f"Training failed: {training_result['error']}")
                return
            
            trained_model = training_result["model"]
            
            # Evaluate model
            with self.db_session_factory() as db:
                job = db.query(ModelJob).filter(ModelJob.id == job_id).first()
                job.status = TrainingStatus.EVALUATING.value
                job.progress = 75
                db.commit()
            
            evaluation_result = await self._evaluate_model(trained_model, X_test, y_test, config)
            metrics = evaluation_result["metrics"]
            
            # Save model and update database
            model_path = await self._save_model(trained_model, config, job_id)
            
            # Calculate resource usage and costs
            resource_usage, total_cost = await self._calculate_resource_usage(job_id)
            
            # Create complete data lineage record
            await self._create_data_lineage_record(
                transformation_id, config, data_metadata, 
                preprocessing_steps, metrics, job_id
            )
            
            # Update job and model records
            end_time = datetime.utcnow()
            training_duration = (end_time - start_time).total_seconds()
            
            with self.db_session_factory() as db:
                # Update job
                job = db.query(ModelJob).filter(ModelJob.id == job_id).first()
                job.status = TrainingStatus.COMPLETED.value
                job.progress = 100
                job.completed_at = end_time
                job.duration_seconds = int(training_duration)
                job.actual_resource_cost = total_cost
                
                # Update model
                if config.model_id and config.model_id.isdigit():
                    model = db.query(Model).filter(Model.id == int(config.model_id)).first()
                    if model:
                        model.status = "trained"
                        model.performance = metrics
                        model.model_artifacts_path = model_path
                        model.training_data_lineage = [transformation_id]
                        model.model_validation_metrics = metrics
                        model.updated_at = end_time
                
                # Update usage statistics
                user = db.query(User).filter(User.id == config.user_id).first()
                if user:
                    user.total_models_created += 1
                    user.monthly_token_usage += total_cost
                    user.daily_token_usage += total_cost
                
                if config.team_id:
                    team = db.query(Team).filter(Team.id == config.team_id).first()
                    if team:
                        team.daily_token_usage += total_cost
                        team.monthly_token_usage += total_cost
                
                db.commit()
            
            # Release resources and cleanup workspace
            await self._release_job_resources(job_id)
            await self._cleanup_training_workspace(job_id)
            
            logger.info(f"Training job {job_id} completed successfully in {training_duration:.2f}s")
            
        except Exception as e:
            logger.error(f"Training job {job_id} failed: {e}")
            await self._mark_job_failed(job_id, str(e))
            await self._release_job_resources(job_id)
            await self._cleanup_training_workspace(job_id)
    
    async def _wait_for_resource_allocation(self, job_id: int, timeout_seconds: int = 3600) -> Dict[str, Any]:
        """Wait for resource allocation with timeout"""
        start_time = datetime.utcnow()
        
        while (datetime.utcnow() - start_time).total_seconds() < timeout_seconds:
            with self.db_session_factory() as db:
                job = db.query(ModelJob).filter(ModelJob.id == job_id).first()
                if job.allocated_instance_id:
                    return {"success": True, "instance_id": job.allocated_instance_id}
                
                if job.status == TrainingStatus.FAILED.value:
                    return {"success": False, "error": job.error_message or "Resource allocation failed"}
            
            await asyncio.sleep(5)  # Check every 5 seconds
        
        return {"success": False, "error": "Resource allocation timeout"}
    
    async def _load_and_validate_training_data(self, config: EnhancedTrainingConfig, transformation_id: str, workspace_result: Dict[str, Any] = None) -> Dict[str, Any]:
        """Load training data from temporary workspace with access validation and lineage tracking"""
        try:
            combined_data = None
            data_sources_info = []
            
            # Use workspace files if workspace was created, otherwise fall back to original files
            if workspace_result and workspace_result["success"]:
                # Load data from workspace directory
                workspace_data_dir = workspace_result["data_directory"]
                copied_files = workspace_result["copied_files"]
                
                logger.info(f"Loading training data from workspace: {workspace_data_dir}")
                
                for file_info in copied_files:
                    workspace_file_path = file_info["workspace_path"]
                    
                    # Load data based on file extension
                    if workspace_file_path.endswith('.csv'):
                        df = pd.read_csv(workspace_file_path)
                    elif workspace_file_path.endswith(('.xlsx', '.xls')):
                        df = pd.read_excel(workspace_file_path)
                    else:
                        logger.warning(f"Unsupported file type for workspace file: {workspace_file_path}")
                        continue
                    
                    # Combine data
                    if combined_data is None:
                        combined_data = df
                    else:
                        combined_data = pd.concat([combined_data, df], ignore_index=True)
                    
                    # Track data source info for lineage
                    data_sources_info.append({
                        "original_upload_id": file_info["original_id"],
                        "workspace_filename": file_info["filename"],
                        "original_path": file_info["original_path"],
                        "workspace_path": workspace_file_path,
                        "size_bytes": file_info["size_bytes"],
                        "rows": len(df),
                        "columns": list(df.columns)
                    })
            else:
                # Fall back to loading original files (legacy behavior)
                logger.warning("No workspace available, loading original files directly")
                
                with self.db_session_factory() as db:
                    for data_source in config.training_data_sources:
                        # Verify access permissions again (double-check)
                        access_result = self.data_isolation.check_resource_access(
                            config.user_id, ResourceType.UPLOAD, 
                            data_source["data_id"], AccessLevel.READ, config.team_id
                        )
                        if not access_result["allowed"]:
                            return {"success": False, "error": f"Access denied to data source {data_source['data_id']}"}
                        
                        # Load data file
                        upload = db.query(Upload).filter(Upload.id == data_source["data_id"]).first()
                        if not upload:
                            return {"success": False, "error": f"Data source {data_source['data_id']} not found"}
                        
                        # Load data based on file type
                        if upload.file_type in ['.csv']:
                            df = pd.read_csv(upload.file_path or upload.path)
                        elif upload.file_type in ['.xlsx', '.xls']:
                            df = pd.read_excel(upload.file_path or upload.path)
                        else:
                            return {"success": False, "error": f"Unsupported file type: {upload.file_type}"}
                        
                        # Update usage tracking
                        upload.usage_count += 1
                        upload.last_used_at = datetime.utcnow()
                        
                        # Combine data
                        if combined_data is None:
                            combined_data = df
                        else:
                            combined_data = pd.concat([combined_data, df], ignore_index=True)
                        
                        # Track data source info for lineage
                        data_sources_info.append({
                            "upload_id": upload.id,
                            "filename": upload.filename,
                            "checksum": upload.checksum,
                            "rows": len(df),
                            "columns": list(df.columns)
                        })
                    
                    db.commit()
            
            # Validate data quality
            if combined_data.empty:
                return {"success": False, "error": "No data loaded"}
            
            # Check for required columns
            target_column = config.data_config.get("target_column")
            if target_column and target_column not in combined_data.columns:
                return {"success": False, "error": f"Target column '{target_column}' not found"}
            
            return {
                "success": True,
                "data": combined_data,
                "metadata": {
                    "total_rows": len(combined_data),
                    "total_columns": len(combined_data.columns),
                    "columns": list(combined_data.columns),
                    "sources": data_sources_info,
                    "transformation_id": transformation_id
                }
            }
            
        except Exception as e:
            logger.error(f"Error loading training data: {e}")
            return {"success": False, "error": str(e)}
    
    async def _preprocess_data(self, data: pd.DataFrame, config: EnhancedTrainingConfig) -> Dict[str, Any]:
        """Preprocess data with tracking of all transformations"""
        try:
            preprocessing_steps = []
            
            # Separate features and target
            target_column = config.data_config.get("target_column")
            if not target_column:
                return {"success": False, "error": "No target column specified"}
            
            X = data.drop(columns=[target_column])
            y = data[target_column]
            
            preprocessing_steps.append(f"Separated features ({X.shape[1]} cols) and target")
            
            # Handle missing values
            if X.isnull().sum().sum() > 0:
                X = X.fillna(X.mean() if X.select_dtypes(include=[np.number]).shape[1] > 0 else X.mode().iloc[0])
                preprocessing_steps.append("Filled missing values")
            
            # Encode categorical variables
            categorical_columns = X.select_dtypes(include=['object']).columns
            if len(categorical_columns) > 0:
                for col in categorical_columns:
                    le = LabelEncoder()
                    X[col] = le.fit_transform(X[col].astype(str))
                preprocessing_steps.append(f"Encoded {len(categorical_columns)} categorical columns")
            
            # Scale features if specified
            if config.parameters.get("scale_features", True):
                scaler = StandardScaler()
                X_scaled = scaler.fit_transform(X)
                X = pd.DataFrame(X_scaled, columns=X.columns)
                preprocessing_steps.append("Scaled features using StandardScaler")
            
            # Split data
            test_size = config.parameters.get("test_size", 0.2)
            random_state = config.parameters.get("random_state", 42)
            
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=random_state, stratify=y
            )
            preprocessing_steps.append(f"Split data: {len(X_train)} train, {len(X_test)} test")
            
            return {
                "success": True,
                "data": (X_train, X_test, y_train, y_test),
                "steps": preprocessing_steps
            }
            
        except Exception as e:
            logger.error(f"Error preprocessing data: {e}")
            return {"success": False, "error": str(e)}
    
    async def _train_model(self, X_train: pd.DataFrame, y_train: pd.Series, config: EnhancedTrainingConfig) -> Dict[str, Any]:
        """Train the ML model"""
        try:
            algorithm_class = self.algorithms[config.algorithm]
            
            # Get algorithm parameters
            algo_params = config.parameters.get("algorithm_parameters", {})
            
            # Set random state for reproducibility
            if "random_state" not in algo_params:
                algo_params["random_state"] = config.parameters.get("random_state", 42)
            
            # Create and train model
            model = algorithm_class(**algo_params)
            model.fit(X_train, y_train)
            
            return {"success": True, "model": model}
            
        except Exception as e:
            logger.error(f"Error training model: {e}")
            return {"success": False, "error": str(e)}
    
    async def _evaluate_model(self, model, X_test: pd.DataFrame, y_test: pd.Series, config: EnhancedTrainingConfig) -> Dict[str, Any]:
        """Evaluate the trained model"""
        try:
            predictions = model.predict(X_test)
            
            # Determine if classification or regression
            is_classification = hasattr(model, "predict_proba")
            
            if is_classification:
                metrics = {
                    "accuracy": float(accuracy_score(y_test, predictions)),
                    "precision": float(precision_score(y_test, predictions, average="weighted", zero_division=0)),
                    "recall": float(recall_score(y_test, predictions, average="weighted", zero_division=0)),
                    "f1_score": float(f1_score(y_test, predictions, average="weighted", zero_division=0))
                }
            else:
                metrics = {
                    "mse": float(mean_squared_error(y_test, predictions)),
                    "r2_score": float(r2_score(y_test, predictions))
                }
            
            return {"success": True, "metrics": metrics}
            
        except Exception as e:
            logger.error(f"Error evaluating model: {e}")
            return {"success": False, "metrics": {}}
    
    async def _save_model(self, model, config: EnhancedTrainingConfig, job_id: int) -> str:
        """Save the trained model to disk"""
        try:
            model_filename = f"model_{config.model_id}_{job_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.joblib"
            model_path = os.path.join(self.models_dir, model_filename)
            
            # Save model
            joblib.dump(model, model_path)
            
            return model_path
            
        except Exception as e:
            logger.error(f"Error saving model: {e}")
            return ""
    
    async def _calculate_resource_usage(self, job_id: int) -> Tuple[Dict[str, Any], int]:
        """Calculate actual resource usage and cost for the job"""
        try:
            with self.db_session_factory() as db:
                # Get job resource allocations
                job_allocations = db.query(JobResourceAllocation).filter(
                    JobResourceAllocation.job_id == job_id
                ).all()
                
                total_cost = 0
                resource_usage = {
                    "cpu_hours": 0,
                    "memory_gb_hours": 0,
                    "gpu_hours": 0,
                    "storage_gb_hours": 0
                }
                
                for allocation in job_allocations:
                    if allocation.cost_breakdown:
                        total_cost += allocation.cost_breakdown.get("total_tokens", 0)
                        
                        # Extract usage details
                        usage = allocation.resource_usage_summary or {}
                        resource_usage["cpu_hours"] += usage.get("cpu_hours", 0)
                        resource_usage["memory_gb_hours"] += usage.get("memory_gb_hours", 0)
                        resource_usage["gpu_hours"] += usage.get("gpu_hours", 0)
                        resource_usage["storage_gb_hours"] += usage.get("storage_gb_hours", 0)
                
                return resource_usage, total_cost
                
        except Exception as e:
            logger.error(f"Error calculating resource usage: {e}")
            return {}, 0
    
    async def _create_data_lineage_record(self, transformation_id: str, config: EnhancedTrainingConfig, 
                                        data_metadata: Dict, preprocessing_steps: List[str], 
                                        metrics: Dict, job_id: int):
        """Create comprehensive data lineage record"""
        try:
            with self.db_session_factory() as db:
                lineage_record = DataTransformationLog(
                    transformation_id=transformation_id,
                    source_data=[{"type": "upload", "id": str(src["data_id"])} for src in config.training_data_sources],
                    target_data=[{"type": "model", "id": config.model_id}],
                    source_checksums={str(src["data_id"]): src.get("checksum", "") for src in data_metadata["sources"]},
                    transformation_type="model_training",
                    algorithm=config.algorithm,
                    parameters=config.parameters,
                    user_id=config.user_id,
                    team_id=config.team_id,
                    job_id=job_id,
                    input_data_quality=data_metadata,
                    performance_metrics=metrics,
                    started_at=datetime.utcnow() - timedelta(seconds=300),  # Approximate start
                    completed_at=datetime.utcnow(),
                    processing_time_seconds=300  # Approximate processing time
                )
                db.add(lineage_record)
                db.commit()
                
        except Exception as e:
            logger.error(f"Error creating data lineage record: {e}")
    
    async def _mark_job_failed(self, job_id: int, error_message: str):
        """Mark job as failed and clean up resources"""
        try:
            with self.db_session_factory() as db:
                job = db.query(ModelJob).filter(ModelJob.id == job_id).first()
                if job:
                    job.status = TrainingStatus.FAILED.value
                    job.error_message = error_message
                    job.completed_at = datetime.utcnow()
                    db.commit()
            
            await self._release_job_resources(job_id)
            
        except Exception as e:
            logger.error(f"Error marking job as failed: {e}")
    
    async def _release_job_resources(self, job_id: int):
        """Release allocated resources for the job"""
        try:
            with self.db_session_factory() as db:
                job_allocations = db.query(JobResourceAllocation).filter(
                    JobResourceAllocation.job_id == job_id,
                    JobResourceAllocation.status == "active"
                ).all()
                
                for allocation in job_allocations:
                    allocation.status = "released"
                    allocation.released_at = datetime.utcnow()
                    
                    # Release the underlying resource allocation
                    await self.resource_manager._release_allocation(allocation.allocation_id)
                
                db.commit()
                
        except Exception as e:
            logger.error(f"Error releasing job resources: {e}")
    
    async def _cleanup_training_workspace(self, job_id: int):
        """Clean up temporary training workspace after job completion"""
        try:
            with self.db_session_factory() as db:
                cleanup_result = self.workspace_manager.cleanup_training_workspace(db, job_id)
                if cleanup_result["success"]:
                    logger.info(f"Cleaned up training workspace for job {job_id}, freed {cleanup_result.get('bytes_freed', 0)} bytes")
                else:
                    logger.error(f"Failed to cleanup workspace for job {job_id}: {cleanup_result.get('error')}")
                    
        except Exception as e:
            logger.error(f"Error cleaning up training workspace for job {job_id}: {e}")
    
    async def get_job_status(self, job_id: int, user_id: int) -> Dict[str, Any]:
        """Get detailed status of a training job"""
        try:
            with self.db_session_factory() as db:
                job = db.query(ModelJob).filter(
                    ModelJob.id == job_id,
                    ModelJob.user_id == user_id
                ).first()
                
                if not job:
                    return {"success": False, "error": "Job not found"}
                
                # Get resource allocation details
                resource_info = {}
                if job.allocated_instance_id:
                    instance = db.query(ComputeInstance).filter(
                        ComputeInstance.id == job.allocated_instance_id
                    ).first()
                    if instance:
                        resource_info = {
                            "instance_name": instance.name,
                            "instance_type": instance.instance_type,
                            "cpu_cores": job.estimated_cpu_cores,
                            "memory_gb": job.estimated_memory_gb,
                            "gpu_count": job.estimated_cpu_cores if job.requires_gpu else 0
                        }
                
                return {
                    "success": True,
                    "job_id": job.id,
                    "status": job.status,
                    "progress": job.progress,
                    "resource_allocation_status": job.resource_allocation_status,
                    "resource_info": resource_info,
                    "estimated_cost": job.estimated_token_cost,
                    "actual_cost": job.actual_resource_cost,
                    "created_at": job.created_at.isoformat(),
                    "started_at": job.started_at.isoformat() if job.started_at else None,
                    "completed_at": job.completed_at.isoformat() if job.completed_at else None,
                    "error_message": job.error_message
                }
                
        except Exception as e:
            logger.error(f"Error getting job status: {e}")
            return {"success": False, "error": str(e)}


# Global training service instance
training_service = None

def get_training_service():
    """Get or create the global training service instance"""
    global training_service
    if training_service is None:
        from core.database import SessionLocal
        training_service = EnhancedTrainingService(SessionLocal)
    return training_service