"""
Model Management Service
Comprehensive model lifecycle management for the ADA platform
"""

import os
import json
import shutil
import hashlib
import pickle
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import numpy as np
from pathlib import Path
import uuid


class ModelStatus(Enum):
    """Model lifecycle status"""
    DRAFT = "draft"
    VALIDATING = "validating"
    READY = "ready"
    TRAINING = "training"
    TRAINED = "trained"
    EVALUATING = "evaluating"
    DEPLOYED = "deployed"
    FAILED = "failed"
    ARCHIVED = "archived"
    DEPRECATED = "deprecated"


class ModelType(Enum):
    """Supported model types"""
    NEURAL_NETWORK = "neural_network"
    RANDOM_FOREST = "random_forest"
    GRADIENT_BOOST = "gradient_boost"
    SVM = "svm"
    LINEAR_REGRESSION = "linear_regression"
    LOGISTIC_REGRESSION = "logistic_regression"
    KMEANS = "kmeans"
    DBSCAN = "dbscan"
    AUTOENCODER = "autoencoder"
    TRANSFORMER = "transformer"
    CUSTOM = "custom"


class ModelVisibility(Enum):
    """Model visibility levels"""
    PRIVATE = "private"
    TEAM = "team"
    ORGANIZATION = "organization"
    PUBLIC = "public"
    MARKETPLACE = "marketplace"


@dataclass
class ModelMetadata:
    """Complete model metadata"""
    id: str
    name: str
    description: str
    type: ModelType
    version: str
    status: ModelStatus
    visibility: ModelVisibility
    owner_id: str
    team_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    trained_at: Optional[datetime]
    deployed_at: Optional[datetime]
    
    # Technical details
    framework: str  # tensorflow, pytorch, sklearn, etc.
    architecture: Dict[str, Any]
    hyperparameters: Dict[str, Any]
    input_shape: List[int]
    output_shape: List[int]
    
    # Performance metrics
    training_metrics: Dict[str, float]
    validation_metrics: Dict[str, float]
    test_metrics: Dict[str, float]
    
    # Resource usage
    training_time_seconds: float
    model_size_bytes: int
    memory_requirements_mb: int
    inference_time_ms: float
    
    # Data information
    training_data_hash: str
    training_samples: int
    validation_samples: int
    test_samples: int
    feature_names: List[str]
    target_names: List[str]
    
    # Versioning
    parent_model_id: Optional[str]
    child_models: List[str] = field(default_factory=list)
    version_history: List[Dict] = field(default_factory=list)
    
    # Deployment info
    deployment_endpoints: List[str] = field(default_factory=list)
    api_key: Optional[str] = None
    usage_count: int = 0
    last_used: Optional[datetime] = None
    
    # Marketplace info
    price: Optional[float] = None
    rating: Optional[float] = None
    reviews: List[Dict] = field(default_factory=list)
    downloads: int = 0
    tags: List[str] = field(default_factory=list)


@dataclass
class ModelVersion:
    """Model version information"""
    version_id: str
    model_id: str
    version_number: str
    created_at: datetime
    created_by: str
    commit_message: str
    changes: Dict[str, Any]
    metrics_diff: Dict[str, float]
    file_path: str
    checksum: str
    is_current: bool


class ModelManagementService:
    """Comprehensive model management service"""
    
    def __init__(self, db_connection, storage_service, job_queue, config: Dict):
        self.db = db_connection
        self.storage = storage_service
        self.job_queue = job_queue
        self.config = config
        self.model_store_path = Path(config.get('MODEL_STORE_PATH', '/models'))
        self.max_versions = config.get('MAX_MODEL_VERSIONS', 10)
        self.auto_archive_days = config.get('AUTO_ARCHIVE_DAYS', 90)
        
    # Model Creation and Validation
    async def create_model(self, user_id: str, model_config: Dict) -> Dict:
        """
        Create a new model with validation
        """
        try:
            # Validate model configuration
            validation_result = await self._validate_model_config(model_config)
            if not validation_result['valid']:
                return {
                    "success": False,
                    "errors": validation_result['errors']
                }
            
            # Check user quotas
            quota_check = await self._check_user_quota(user_id, 'models')
            if not quota_check['allowed']:
                return {
                    "success": False,
                    "error": f"Model quota exceeded: {quota_check['message']}"
                }
            
            # Generate model ID
            model_id = self._generate_model_id()
            
            # Create model metadata
            metadata = ModelMetadata(
                id=model_id,
                name=model_config['name'],
                description=model_config.get('description', ''),
                type=ModelType(model_config['type']),
                version="1.0.0",
                status=ModelStatus.DRAFT,
                visibility=ModelVisibility(model_config.get('visibility', 'private')),
                owner_id=user_id,
                team_id=model_config.get('team_id'),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                trained_at=None,
                deployed_at=None,
                framework=model_config.get('framework', 'sklearn'),
                architecture=model_config.get('architecture', {}),
                hyperparameters=model_config.get('hyperparameters', {}),
                input_shape=model_config.get('input_shape', []),
                output_shape=model_config.get('output_shape', []),
                training_metrics={},
                validation_metrics={},
                test_metrics={},
                training_time_seconds=0,
                model_size_bytes=0,
                memory_requirements_mb=0,
                inference_time_ms=0,
                training_data_hash='',
                training_samples=0,
                validation_samples=0,
                test_samples=0,
                feature_names=model_config.get('feature_names', []),
                target_names=model_config.get('target_names', []),
                parent_model_id=model_config.get('parent_model_id'),
                tags=model_config.get('tags', [])
            )
            
            # Create model directory structure
            await self._create_model_directory(model_id)
            
            # Store metadata
            await self._store_model_metadata(metadata)
            
            # Initialize version control
            await self._initialize_version_control(model_id)
            
            # Log creation event
            await self._log_model_event(model_id, 'created', {
                'user_id': user_id,
                'config': model_config
            })
            
            return {
                "success": True,
                "model_id": model_id,
                "metadata": self._metadata_to_dict(metadata)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to create model: {str(e)}"
            }
    
    # Model Training Orchestration
    async def train_model(self, model_id: str, training_config: Dict) -> Dict:
        """
        Queue model for training with specified configuration
        """
        try:
            # Get model metadata
            metadata = await self._get_model_metadata(model_id)
            if not metadata:
                return {"success": False, "error": "Model not found"}
            
            # Validate training configuration
            validation = await self._validate_training_config(training_config)
            if not validation['valid']:
                return {"success": False, "errors": validation['errors']}
            
            # Check model status
            if metadata.status not in [ModelStatus.DRAFT, ModelStatus.READY, ModelStatus.TRAINED]:
                return {
                    "success": False,
                    "error": f"Model cannot be trained in status: {metadata.status.value}"
                }
            
            # Estimate resource requirements
            resources = await self._estimate_resources(metadata, training_config)
            
            # Check resource availability
            if not await self._check_resource_availability(resources):
                return {
                    "success": False,
                    "error": "Insufficient resources available",
                    "required_resources": resources
                }
            
            # Update model status
            metadata.status = ModelStatus.TRAINING
            await self._update_model_metadata(metadata)
            
            # Create training job
            job = {
                'type': 'model_training',
                'model_id': model_id,
                'config': training_config,
                'resources': resources,
                'priority': training_config.get('priority', 5),
                'user_id': metadata.owner_id,
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Queue training job
            job_id = await self.job_queue.submit_job(job)
            
            # Log training start
            await self._log_model_event(model_id, 'training_started', {
                'job_id': job_id,
                'config': training_config
            })
            
            return {
                "success": True,
                "job_id": job_id,
                "estimated_time": resources.get('estimated_time_seconds', 0),
                "message": "Model training queued successfully"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to start training: {str(e)}"
            }
    
    async def handle_training_completion(self, model_id: str, training_result: Dict) -> Dict:
        """
        Handle completion of model training
        """
        try:
            # Get model metadata
            metadata = await self._get_model_metadata(model_id)
            if not metadata:
                return {"success": False, "error": "Model not found"}
            
            # Update metadata with training results
            metadata.status = ModelStatus.TRAINED
            metadata.trained_at = datetime.utcnow()
            metadata.training_metrics = training_result.get('training_metrics', {})
            metadata.validation_metrics = training_result.get('validation_metrics', {})
            metadata.test_metrics = training_result.get('test_metrics', {})
            metadata.training_time_seconds = training_result.get('training_time', 0)
            metadata.model_size_bytes = training_result.get('model_size', 0)
            
            # Save trained model file
            model_path = await self._save_trained_model(
                model_id,
                training_result.get('model_data')
            )
            
            # Create new version
            version = await self._create_model_version(
                model_id,
                "Training completed",
                training_result
            )
            
            # Update metadata
            await self._update_model_metadata(metadata)
            
            # Generate model report
            report = await self._generate_training_report(metadata, training_result)
            
            # Log completion
            await self._log_model_event(model_id, 'training_completed', {
                'metrics': metadata.training_metrics,
                'version': version.version_number
            })
            
            return {
                "success": True,
                "model_id": model_id,
                "version": version.version_number,
                "metrics": metadata.training_metrics,
                "report_url": report['url']
            }
            
        except Exception as e:
            # Mark model as failed
            metadata.status = ModelStatus.FAILED
            await self._update_model_metadata(metadata)
            
            return {
                "success": False,
                "error": f"Failed to complete training: {str(e)}"
            }
    
    # Model Versioning
    async def create_model_version(self, model_id: str, message: str, 
                                  changes: Dict = None) -> Dict:
        """
        Create a new version of a model
        """
        try:
            # Get current model
            metadata = await self._get_model_metadata(model_id)
            if not metadata:
                return {"success": False, "error": "Model not found"}
            
            # Create version
            version = await self._create_model_version(model_id, message, changes)
            
            # Update metadata
            metadata.version = version.version_number
            metadata.version_history.append({
                'version': version.version_number,
                'created_at': version.created_at.isoformat(),
                'message': message
            })
            
            await self._update_model_metadata(metadata)
            
            return {
                "success": True,
                "version": version.version_number,
                "version_id": version.version_id
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to create version: {str(e)}"
            }
    
    async def get_model_versions(self, model_id: str) -> List[ModelVersion]:
        """
        Get all versions of a model
        """
        # Implementation depends on your database
        return []
    
    async def rollback_model_version(self, model_id: str, version_id: str) -> Dict:
        """
        Rollback model to a previous version
        """
        try:
            # Get version
            version = await self._get_model_version(version_id)
            if not version or version.model_id != model_id:
                return {"success": False, "error": "Version not found"}
            
            # Load version files
            await self._restore_model_version(model_id, version)
            
            # Update metadata
            metadata = await self._get_model_metadata(model_id)
            metadata.version = version.version_number
            await self._update_model_metadata(metadata)
            
            # Log rollback
            await self._log_model_event(model_id, 'version_rollback', {
                'version': version.version_number
            })
            
            return {
                "success": True,
                "message": f"Model rolled back to version {version.version_number}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to rollback: {str(e)}"
            }
    
    # Model Sharing and Publishing
    async def share_model(self, model_id: str, share_config: Dict) -> Dict:
        """
        Share model with team or make public
        """
        try:
            # Get model
            metadata = await self._get_model_metadata(model_id)
            if not metadata:
                return {"success": False, "error": "Model not found"}
            
            # Update visibility
            new_visibility = ModelVisibility(share_config['visibility'])
            metadata.visibility = new_visibility
            
            # If sharing with team
            if new_visibility == ModelVisibility.TEAM:
                metadata.team_id = share_config.get('team_id')
            
            # If publishing to marketplace
            if new_visibility == ModelVisibility.MARKETPLACE:
                # Validate model for marketplace
                validation = await self._validate_for_marketplace(metadata)
                if not validation['valid']:
                    return {"success": False, "errors": validation['errors']}
                
                # Set marketplace info
                metadata.price = share_config.get('price', 0)
                metadata.tags = share_config.get('tags', [])
                
                # Create marketplace listing
                await self._create_marketplace_listing(metadata)
            
            # Update metadata
            await self._update_model_metadata(metadata)
            
            # Log sharing event
            await self._log_model_event(model_id, 'shared', {
                'visibility': new_visibility.value,
                'team_id': metadata.team_id
            })
            
            return {
                "success": True,
                "message": f"Model shared as {new_visibility.value}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to share model: {str(e)}"
            }
    
    async def fork_model(self, model_id: str, user_id: str, 
                        fork_config: Dict = None) -> Dict:
        """
        Create a fork of an existing model
        """
        try:
            # Get original model
            original = await self._get_model_metadata(model_id)
            if not original:
                return {"success": False, "error": "Model not found"}
            
            # Check if model can be forked
            if original.visibility == ModelVisibility.PRIVATE:
                return {"success": False, "error": "Cannot fork private model"}
            
            # Create new model config
            new_config = {
                'name': fork_config.get('name', f"{original.name} (Fork)"),
                'description': fork_config.get('description', original.description),
                'type': original.type.value,
                'framework': original.framework,
                'architecture': original.architecture,
                'hyperparameters': original.hyperparameters,
                'parent_model_id': model_id,
                'visibility': 'private'
            }
            
            # Create forked model
            result = await self.create_model(user_id, new_config)
            
            if result['success']:
                # Copy model files
                await self._copy_model_files(model_id, result['model_id'])
                
                # Update parent model
                original.child_models.append(result['model_id'])
                await self._update_model_metadata(original)
                
                # Log fork event
                await self._log_model_event(model_id, 'forked', {
                    'forked_by': user_id,
                    'fork_id': result['model_id']
                })
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to fork model: {str(e)}"
            }
    
    # Model Deployment
    async def deploy_model(self, model_id: str, deployment_config: Dict) -> Dict:
        """
        Deploy model for inference
        """
        try:
            # Get model
            metadata = await self._get_model_metadata(model_id)
            if not metadata:
                return {"success": False, "error": "Model not found"}
            
            # Check if model is trained
            if metadata.status != ModelStatus.TRAINED:
                return {
                    "success": False,
                    "error": "Model must be trained before deployment"
                }
            
            # Create deployment endpoint
            endpoint = await self._create_deployment_endpoint(model_id, deployment_config)
            
            # Update metadata
            metadata.status = ModelStatus.DEPLOYED
            metadata.deployed_at = datetime.utcnow()
            metadata.deployment_endpoints.append(endpoint['url'])
            metadata.api_key = endpoint['api_key']
            
            await self._update_model_metadata(metadata)
            
            # Log deployment
            await self._log_model_event(model_id, 'deployed', {
                'endpoint': endpoint['url'],
                'config': deployment_config
            })
            
            return {
                "success": True,
                "endpoint": endpoint['url'],
                "api_key": endpoint['api_key'],
                "message": "Model deployed successfully"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to deploy model: {str(e)}"
            }
    
    # Model Performance and Monitoring
    async def get_model_metrics(self, model_id: str) -> Dict:
        """
        Get comprehensive model metrics
        """
        try:
            metadata = await self._get_model_metadata(model_id)
            if not metadata:
                return {"success": False, "error": "Model not found"}
            
            metrics = {
                'training_metrics': metadata.training_metrics,
                'validation_metrics': metadata.validation_metrics,
                'test_metrics': metadata.test_metrics,
                'performance': {
                    'training_time': metadata.training_time_seconds,
                    'model_size': metadata.model_size_bytes,
                    'memory_requirements': metadata.memory_requirements_mb,
                    'inference_time': metadata.inference_time_ms
                },
                'usage': {
                    'total_predictions': metadata.usage_count,
                    'last_used': metadata.last_used.isoformat() if metadata.last_used else None,
                    'rating': metadata.rating,
                    'downloads': metadata.downloads
                }
            }
            
            # Get recent performance data
            recent_performance = await self._get_recent_performance(model_id)
            metrics['recent_performance'] = recent_performance
            
            return {
                "success": True,
                "metrics": metrics
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get metrics: {str(e)}"
            }
    
    async def update_model_metrics(self, model_id: str, new_metrics: Dict) -> bool:
        """
        Update model metrics after evaluation or production use
        """
        try:
            metadata = await self._get_model_metadata(model_id)
            if not metadata:
                return False
            
            # Update metrics
            if 'test_metrics' in new_metrics:
                metadata.test_metrics.update(new_metrics['test_metrics'])
            
            if 'inference_time' in new_metrics:
                # Update rolling average
                alpha = 0.1  # Exponential moving average factor
                metadata.inference_time_ms = (
                    alpha * new_metrics['inference_time'] +
                    (1 - alpha) * metadata.inference_time_ms
                )
            
            # Update usage stats
            metadata.usage_count += new_metrics.get('predictions_made', 0)
            metadata.last_used = datetime.utcnow()
            
            await self._update_model_metadata(metadata)
            return True
            
        except Exception as e:
            print(f"Failed to update metrics: {e}")
            return False
    
    # Model Search and Discovery
    async def search_models(self, search_criteria: Dict) -> List[Dict]:
        """
        Search for models based on criteria
        """
        try:
            # Build search query
            query = self._build_search_query(search_criteria)
            
            # Execute search
            results = await self._execute_model_search(query)
            
            # Filter by permissions
            filtered_results = []
            for model in results:
                if await self._can_access_model(
                    search_criteria.get('user_id'),
                    model['id']
                ):
                    filtered_results.append(model)
            
            # Sort results
            sorted_results = self._sort_search_results(
                filtered_results,
                search_criteria.get('sort_by', 'relevance')
            )
            
            return sorted_results
            
        except Exception as e:
            print(f"Search failed: {e}")
            return []
    
    # Helper Methods
    def _generate_model_id(self) -> str:
        """Generate unique model ID"""
        return f"model_{uuid.uuid4().hex}"
    
    async def _validate_model_config(self, config: Dict) -> Dict:
        """Validate model configuration"""
        errors = []
        
        # Required fields
        if not config.get('name'):
            errors.append("Model name is required")
        
        if not config.get('type'):
            errors.append("Model type is required")
        elif config['type'] not in [t.value for t in ModelType]:
            errors.append(f"Invalid model type: {config['type']}")
        
        # Validate architecture if provided
        if config.get('architecture'):
            arch_validation = self._validate_architecture(
                config['type'],
                config['architecture']
            )
            if not arch_validation['valid']:
                errors.extend(arch_validation['errors'])
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
    
    def _validate_architecture(self, model_type: str, architecture: Dict) -> Dict:
        """Validate model architecture based on type"""
        errors = []
        
        # Type-specific validation
        if model_type == 'neural_network':
            if not architecture.get('layers'):
                errors.append("Neural network requires layers definition")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
    
    async def _validate_training_config(self, config: Dict) -> Dict:
        """Validate training configuration"""
        errors = []
        
        # Check required fields
        if not config.get('data_path'):
            errors.append("Training data path is required")
        
        # Validate hyperparameters
        if config.get('hyperparameters'):
            hp_validation = self._validate_hyperparameters(config['hyperparameters'])
            if not hp_validation['valid']:
                errors.extend(hp_validation['errors'])
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
    
    def _validate_hyperparameters(self, hyperparameters: Dict) -> Dict:
        """Validate hyperparameters"""
        errors = []
        
        # Check common hyperparameters
        if 'learning_rate' in hyperparameters:
            lr = hyperparameters['learning_rate']
            if not (0 < lr < 1):
                errors.append("Learning rate must be between 0 and 1")
        
        if 'batch_size' in hyperparameters:
            bs = hyperparameters['batch_size']
            if bs <= 0 or bs > 10000:
                errors.append("Batch size must be between 1 and 10000")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
    
    async def _check_user_quota(self, user_id: str, resource_type: str) -> Dict:
        """Check if user has quota for resource"""
        # Implementation depends on your quota system
        return {'allowed': True, 'message': ''}
    
    async def _create_model_directory(self, model_id: str) -> None:
        """Create directory structure for model"""
        model_path = self.model_store_path / model_id
        model_path.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        (model_path / 'checkpoints').mkdir(exist_ok=True)
        (model_path / 'versions').mkdir(exist_ok=True)
        (model_path / 'data').mkdir(exist_ok=True)
        (model_path / 'logs').mkdir(exist_ok=True)
        (model_path / 'reports').mkdir(exist_ok=True)
    
    async def _store_model_metadata(self, metadata: ModelMetadata) -> None:
        """Store model metadata in database"""
        # Implementation depends on your database
        pass
    
    async def _get_model_metadata(self, model_id: str) -> Optional[ModelMetadata]:
        """Retrieve model metadata"""
        # Implementation depends on your database
        return None
    
    async def _update_model_metadata(self, metadata: ModelMetadata) -> None:
        """Update model metadata"""
        metadata.updated_at = datetime.utcnow()
        # Implementation depends on your database
    
    def _metadata_to_dict(self, metadata: ModelMetadata) -> Dict:
        """Convert metadata to dictionary"""
        return {
            'id': metadata.id,
            'name': metadata.name,
            'description': metadata.description,
            'type': metadata.type.value,
            'version': metadata.version,
            'status': metadata.status.value,
            'visibility': metadata.visibility.value,
            'owner_id': metadata.owner_id,
            'created_at': metadata.created_at.isoformat(),
            'updated_at': metadata.updated_at.isoformat(),
            'metrics': {
                'training': metadata.training_metrics,
                'validation': metadata.validation_metrics,
                'test': metadata.test_metrics
            }
        }
    
    async def _initialize_version_control(self, model_id: str) -> None:
        """Initialize version control for model"""
        # Create initial version
        version = ModelVersion(
            version_id=f"v_{uuid.uuid4().hex}",
            model_id=model_id,
            version_number="1.0.0",
            created_at=datetime.utcnow(),
            created_by="system",
            commit_message="Initial version",
            changes={},
            metrics_diff={},
            file_path="",
            checksum="",
            is_current=True
        )
        
        # Store version
        await self._store_model_version(version)
    
    async def _create_model_version(self, model_id: str, message: str, 
                                   changes: Dict = None) -> ModelVersion:
        """Create a new model version"""
        # Get current version
        current_version = await self._get_current_version(model_id)
        
        # Calculate new version number
        new_version_number = self._increment_version(current_version.version_number)
        
        # Create version object
        version = ModelVersion(
            version_id=f"v_{uuid.uuid4().hex}",
            model_id=model_id,
            version_number=new_version_number,
            created_at=datetime.utcnow(),
            created_by="system",
            commit_message=message,
            changes=changes or {},
            metrics_diff={},
            file_path="",
            checksum="",
            is_current=True
        )
        
        # Mark previous version as not current
        current_version.is_current = False
        await self._update_model_version(current_version)
        
        # Store new version
        await self._store_model_version(version)
        
        return version
    
    def _increment_version(self, version: str) -> str:
        """Increment version number"""
        parts = version.split('.')
        parts[-1] = str(int(parts[-1]) + 1)
        return '.'.join(parts)
    
    async def _store_model_version(self, version: ModelVersion) -> None:
        """Store model version"""
        # Implementation depends on your database
        pass
    
    async def _get_current_version(self, model_id: str) -> Optional[ModelVersion]:
        """Get current version of model"""
        # Implementation depends on your database
        return None
    
    async def _get_model_version(self, version_id: str) -> Optional[ModelVersion]:
        """Get specific model version"""
        # Implementation depends on your database
        return None
    
    async def _update_model_version(self, version: ModelVersion) -> None:
        """Update model version"""
        # Implementation depends on your database
        pass
    
    async def _estimate_resources(self, metadata: ModelMetadata, 
                                 training_config: Dict) -> Dict:
        """Estimate resources required for training"""
        # Basic estimation logic
        model_complexity = self._estimate_model_complexity(metadata)
        data_size = training_config.get('data_size', 1000)
        
        resources = {
            'cpu_cores': min(model_complexity * 2, 16),
            'memory_gb': min(model_complexity * 4, 64),
            'gpu_required': metadata.type in [
                ModelType.NEURAL_NETWORK,
                ModelType.TRANSFORMER
            ],
            'gpu_memory_gb': 8 if metadata.type == ModelType.TRANSFORMER else 4,
            'estimated_time_seconds': model_complexity * data_size / 100,
            'storage_gb': max(1, data_size / 1000)
        }
        
        return resources
    
    def _estimate_model_complexity(self, metadata: ModelMetadata) -> int:
        """Estimate model complexity score"""
        complexity = 1
        
        # Based on model type
        type_complexity = {
            ModelType.LINEAR_REGRESSION: 1,
            ModelType.LOGISTIC_REGRESSION: 1,
            ModelType.RANDOM_FOREST: 3,
            ModelType.GRADIENT_BOOST: 4,
            ModelType.NEURAL_NETWORK: 5,
            ModelType.TRANSFORMER: 10
        }
        
        complexity = type_complexity.get(metadata.type, 3)
        
        # Adjust based on architecture
        if metadata.architecture:
            if 'layers' in metadata.architecture:
                complexity += len(metadata.architecture['layers'])
        
        return complexity
    
    async def _check_resource_availability(self, resources: Dict) -> bool:
        """Check if required resources are available"""
        # Implementation depends on your resource manager
        return True
    
    async def _save_trained_model(self, model_id: str, model_data: Any) -> str:
        """Save trained model to storage"""
        model_path = self.model_store_path / model_id / 'model.pkl'
        
        # Save model
        with open(model_path, 'wb') as f:
            pickle.dump(model_data, f)
        
        # Calculate checksum
        checksum = hashlib.sha256(open(model_path, 'rb').read()).hexdigest()
        
        return str(model_path)
    
    async def _generate_training_report(self, metadata: ModelMetadata, 
                                       training_result: Dict) -> Dict:
        """Generate comprehensive training report"""
        report_path = self.model_store_path / metadata.id / 'reports' / 'training_report.json'
        
        report = {
            'model_id': metadata.id,
            'model_name': metadata.name,
            'training_completed': datetime.utcnow().isoformat(),
            'metrics': {
                'training': metadata.training_metrics,
                'validation': metadata.validation_metrics,
                'test': metadata.test_metrics
            },
            'performance': {
                'training_time': metadata.training_time_seconds,
                'model_size': metadata.model_size_bytes,
                'memory_requirements': metadata.memory_requirements_mb
            },
            'configuration': {
                'architecture': metadata.architecture,
                'hyperparameters': metadata.hyperparameters
            }
        }
        
        # Save report
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        return {'url': str(report_path)}
    
    async def _restore_model_version(self, model_id: str, version: ModelVersion) -> None:
        """Restore model to a specific version"""
        # Implementation depends on your storage system
        pass
    
    async def _validate_for_marketplace(self, metadata: ModelMetadata) -> Dict:
        """Validate model for marketplace publishing"""
        errors = []
        
        # Check model is trained
        if metadata.status != ModelStatus.TRAINED:
            errors.append("Model must be trained")
        
        # Check performance metrics
        if not metadata.test_metrics:
            errors.append("Model must have test metrics")
        
        # Check documentation
        if not metadata.description or len(metadata.description) < 100:
            errors.append("Model must have detailed description (min 100 chars)")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
    
    async def _create_marketplace_listing(self, metadata: ModelMetadata) -> None:
        """Create marketplace listing for model"""
        # Implementation depends on your marketplace system
        pass
    
    async def _copy_model_files(self, source_id: str, target_id: str) -> None:
        """Copy model files from source to target"""
        source_path = self.model_store_path / source_id
        target_path = self.model_store_path / target_id
        
        # Copy files
        shutil.copytree(source_path, target_path, dirs_exist_ok=True)
    
    async def _create_deployment_endpoint(self, model_id: str, 
                                         deployment_config: Dict) -> Dict:
        """Create deployment endpoint for model"""
        # Implementation depends on your deployment system
        endpoint = {
            'url': f"https://api.ada-platform.com/models/{model_id}/predict",
            'api_key': secrets.token_hex(32)
        }
        return endpoint
    
    async def _get_recent_performance(self, model_id: str) -> Dict:
        """Get recent performance metrics"""
        # Implementation depends on your monitoring system
        return {
            'last_24h': {
                'predictions': 0,
                'avg_latency_ms': 0,
                'error_rate': 0
            }
        }
    
    def _build_search_query(self, criteria: Dict) -> Dict:
        """Build search query from criteria"""
        query = {}
        
        if 'name' in criteria:
            query['name'] = {'$regex': criteria['name'], '$options': 'i'}
        
        if 'type' in criteria:
            query['type'] = criteria['type']
        
        if 'visibility' in criteria:
            query['visibility'] = criteria['visibility']
        
        if 'tags' in criteria:
            query['tags'] = {'$in': criteria['tags']}
        
        return query
    
    async def _execute_model_search(self, query: Dict) -> List[Dict]:
        """Execute model search query"""
        # Implementation depends on your database
        return []
    
    async def _can_access_model(self, user_id: str, model_id: str) -> bool:
        """Check if user can access model"""
        # Implementation depends on your permission system
        return True
    
    def _sort_search_results(self, results: List[Dict], sort_by: str) -> List[Dict]:
        """Sort search results"""
        if sort_by == 'relevance':
            # Already sorted by relevance from search
            return results
        elif sort_by == 'rating':
            return sorted(results, key=lambda x: x.get('rating', 0), reverse=True)
        elif sort_by == 'downloads':
            return sorted(results, key=lambda x: x.get('downloads', 0), reverse=True)
        elif sort_by == 'created':
            return sorted(results, key=lambda x: x.get('created_at'), reverse=True)
        
        return results
    
    async def _log_model_event(self, model_id: str, event_type: str, metadata: Dict) -> None:
        """Log model event for audit"""
        event = {
            'model_id': model_id,
            'event_type': event_type,
            'metadata': metadata,
            'timestamp': datetime.utcnow().isoformat()
        }
        # Store in event log
        pass