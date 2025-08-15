"""
Data Management API Routes
"""

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
import io

from .auth_routes import get_current_user, require_permission
from ..services.data_generator_service import SyntheticDataGenerator, DataGenerationConfig
from ..storage.storage_manager import StorageManager, StorageClass, StorageProvider
from ..jobs.job_queue_manager import JobQueueManager, JobDefinition, JobPriority
from ..models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/data", tags=["data"])

# Service instances
data_generator = None
storage_manager = None
job_queue = None


def get_data_generator():
    """Get data generator instance"""
    global data_generator
    if not data_generator:
        data_generator = SyntheticDataGenerator({})
    return data_generator


def get_storage_manager():
    """Get storage manager instance"""
    global storage_manager
    if not storage_manager:
        storage_manager = StorageManager({
            'enable_local': True,
            'local_path': '/data/storage'
        })
    return storage_manager


def get_job_queue():
    """Get job queue instance"""
    global job_queue
    if not job_queue:
        job_queue = JobQueueManager({'redis_url': 'redis://localhost:6379'})
    return job_queue


# Request/Response Models
class GenerateDataRequest(BaseModel):
    rows: int = Field(default=1000, ge=1, le=1000000)
    complexity: str = Field(default="moderate", pattern="^(simple|moderate|complex|very_complex)$")
    dataset_type: Optional[str] = None
    
    # Pattern learning
    learn_from_sample: bool = False
    sample_data_id: Optional[str] = None
    preserve_distributions: bool = True
    preserve_correlations: bool = True
    
    # Privacy settings
    apply_differential_privacy: bool = False
    epsilon: float = Field(default=1.0, ge=0.1, le=10.0)
    apply_k_anonymity: bool = False
    k_value: int = Field(default=5, ge=2, le=100)
    
    # Output
    output_format: str = Field(default="csv", pattern="^(csv|json|parquet)$")
    include_metadata: bool = True


class UploadDataRequest(BaseModel):
    name: str
    description: Optional[str] = None
    tags: List[str] = []
    storage_class: str = "hot"
    auto_process: bool = False


class ProcessDataRequest(BaseModel):
    dataset_id: str
    processing_type: str = Field(default="clean", pattern="^(clean|normalize|transform|augment)$")
    operations: List[Dict[str, Any]] = []
    output_name: Optional[str] = None


class DatasetResponse(BaseModel):
    dataset_id: str
    name: str
    description: Optional[str]
    size_bytes: int
    row_count: Optional[int]
    column_count: Optional[int]
    created_at: datetime
    owner_id: str
    storage_class: str
    tags: List[str]
    metadata: Dict[str, Any]


# Routes
@router.post("/generate", response_model=DatasetResponse)
async def generate_synthetic_data(
    request: GenerateDataRequest,
    user: User = Depends(get_current_user)
):
    """Generate synthetic data"""
    try:
        generator = get_data_generator()
        storage = get_storage_manager()
        await storage.initialize()
        
        # Create generation config
        config = DataGenerationConfig(
            rows=request.rows,
            complexity=request.complexity,
            learn_from_sample=request.learn_from_sample,
            preserve_distributions=request.preserve_distributions,
            preserve_correlations=request.preserve_correlations,
            apply_differential_privacy=request.apply_differential_privacy,
            epsilon=request.epsilon,
            apply_k_anonymity=request.apply_k_anonymity,
            k_value=request.k_value,
            output_format=request.output_format,
            include_metadata=request.include_metadata
        )
        
        # If learning from sample, load the sample data
        if request.learn_from_sample and request.sample_data_id:
            sample_file, sample_metadata = await storage.download_file(
                request.sample_data_id,
                user.id
            )
            config.sample_data_path = f"/tmp/{request.sample_data_id}.csv"
            
            # Save sample to temp file
            with open(config.sample_data_path, 'wb') as f:
                f.write(sample_file.read())
        
        # Generate data based on type
        if request.dataset_type:
            result = await generator.generate_specific_dataset(
                request.dataset_type,
                config
            )
        else:
            result = await generator.generate_data(config)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Data generation failed')
            )
        
        # Convert dataframe to file
        data_df = result['data']
        
        if request.output_format == "csv":
            output = io.BytesIO()
            data_df.to_csv(output, index=False)
            output.seek(0)
            content_type = "text/csv"
            extension = "csv"
        elif request.output_format == "json":
            output = io.BytesIO()
            data_df.to_json(output, orient='records')
            output.seek(0)
            content_type = "application/json"
            extension = "json"
        else:  # parquet
            output = io.BytesIO()
            data_df.to_parquet(output, index=False)
            output.seek(0)
            content_type = "application/octet-stream"
            extension = "parquet"
        
        # Store generated data
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        file_name = f"synthetic_{request.complexity}_{timestamp}.{extension}"
        
        storage_obj = await storage.upload_file(
            file_data=output,
            path=f"datasets/{user.id}/{file_name}",
            user_id=user.id,
            storage_class=StorageClass.HOT,
            metadata={
                'generation_config': config.__dict__,
                'statistics': result.get('metadata', {}).get('statistics', {}),
                'row_count': len(data_df),
                'column_count': len(data_df.columns),
                'columns': list(data_df.columns)
            }
        )
        
        return DatasetResponse(
            dataset_id=storage_obj.object_id,
            name=file_name,
            description=f"Synthetic {request.complexity} dataset",
            size_bytes=storage_obj.size,
            row_count=len(data_df),
            column_count=len(data_df.columns),
            created_at=storage_obj.created_at,
            owner_id=user.id,
            storage_class=storage_obj.storage_class.value,
            tags=['synthetic', request.complexity],
            metadata=storage_obj.metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generate data error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate data"
        )


@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    storage_class: str = Form("hot"),
    auto_process: bool = Form(False),
    user: User = Depends(get_current_user)
):
    """Upload a dataset"""
    try:
        storage = get_storage_manager()
        await storage.initialize()
        
        # Parse tags
        tag_list = tags.split(',') if tags else []
        
        # Read file
        content = await file.read()
        file_obj = io.BytesIO(content)
        
        # Determine file type and validate
        if file.filename.endswith('.csv'):
            import pandas as pd
            df = pd.read_csv(io.BytesIO(content))
            metadata = {
                'row_count': len(df),
                'column_count': len(df.columns),
                'columns': list(df.columns),
                'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()}
            }
        elif file.filename.endswith('.json'):
            import pandas as pd
            df = pd.read_json(io.BytesIO(content))
            metadata = {
                'row_count': len(df),
                'column_count': len(df.columns),
                'columns': list(df.columns)
            }
        elif file.filename.endswith('.parquet'):
            import pandas as pd
            df = pd.read_parquet(io.BytesIO(content))
            metadata = {
                'row_count': len(df),
                'column_count': len(df.columns),
                'columns': list(df.columns)
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file format. Use CSV, JSON, or Parquet"
            )
        
        # Store file
        storage_obj = await storage.upload_file(
            file_data=file_obj,
            path=f"datasets/{user.id}/{name}",
            user_id=user.id,
            storage_class=StorageClass[storage_class.upper()],
            metadata=metadata
        )
        
        # Queue processing job if requested
        if auto_process:
            queue = get_job_queue()
            await queue.initialize()
            
            job_def = JobDefinition(
                job_id="",
                job_type="data_processing",
                payload={
                    'dataset_id': storage_obj.object_id,
                    'processing_type': 'clean',
                    'user_id': user.id
                },
                priority=JobPriority.NORMAL
            )
            
            job_id = await queue.submit_job(job_def)
            metadata['processing_job_id'] = job_id
        
        return DatasetResponse(
            dataset_id=storage_obj.object_id,
            name=name,
            description=description,
            size_bytes=storage_obj.size,
            row_count=metadata.get('row_count'),
            column_count=metadata.get('column_count'),
            created_at=storage_obj.created_at,
            owner_id=user.id,
            storage_class=storage_obj.storage_class.value,
            tags=tag_list,
            metadata=metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload dataset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload dataset"
        )


@router.get("/list", response_model=List[DatasetResponse])
async def list_datasets(
    owner_id: Optional[str] = None,
    tags: Optional[List[str]] = Query(None),
    storage_class: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    user: User = Depends(get_current_user)
):
    """List datasets"""
    try:
        storage = get_storage_manager()
        await storage.initialize()
        
        # List files
        files = await storage.list_files(
            user_id=owner_id or user.id,
            path_prefix="datasets/",
            limit=limit + offset
        )
        
        # Filter and paginate
        datasets = []
        for file in files[offset:]:
            # Apply filters
            if tags:
                file_tags = file.metadata.get('tags', [])
                if not any(tag in file_tags for tag in tags):
                    continue
            
            if storage_class and file.storage_class.value != storage_class:
                continue
            
            datasets.append(DatasetResponse(
                dataset_id=file.object_id,
                name=file.path.split('/')[-1],
                description=file.metadata.get('description'),
                size_bytes=file.size,
                row_count=file.metadata.get('row_count'),
                column_count=file.metadata.get('column_count'),
                created_at=file.created_at,
                owner_id=file.owner,
                storage_class=file.storage_class.value,
                tags=file.tags,
                metadata=file.metadata
            ))
            
            if len(datasets) >= limit:
                break
        
        return datasets
        
    except Exception as e:
        logger.error(f"List datasets error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list datasets"
        )


@router.get("/{dataset_id}")
async def get_dataset(
    dataset_id: str,
    user: User = Depends(get_current_user)
):
    """Get dataset details"""
    try:
        storage = get_storage_manager()
        await storage.initialize()
        
        # Get file metadata
        file_data, storage_obj = await storage.download_file(
            dataset_id,
            user.id
        )
        
        return DatasetResponse(
            dataset_id=storage_obj.object_id,
            name=storage_obj.path.split('/')[-1],
            description=storage_obj.metadata.get('description'),
            size_bytes=storage_obj.size,
            row_count=storage_obj.metadata.get('row_count'),
            column_count=storage_obj.metadata.get('column_count'),
            created_at=storage_obj.created_at,
            owner_id=storage_obj.owner,
            storage_class=storage_obj.storage_class.value,
            tags=storage_obj.tags,
            metadata=storage_obj.metadata
        )
        
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    except Exception as e:
        logger.error(f"Get dataset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get dataset"
        )


@router.get("/{dataset_id}/download")
async def download_dataset(
    dataset_id: str,
    user: User = Depends(get_current_user)
):
    """Download dataset"""
    try:
        storage = get_storage_manager()
        await storage.initialize()
        
        # Download file
        file_data, storage_obj = await storage.download_file(
            dataset_id,
            user.id
        )
        
        # Determine content type
        filename = storage_obj.path.split('/')[-1]
        if filename.endswith('.csv'):
            content_type = "text/csv"
        elif filename.endswith('.json'):
            content_type = "application/json"
        elif filename.endswith('.parquet'):
            content_type = "application/octet-stream"
        else:
            content_type = "application/octet-stream"
        
        return StreamingResponse(
            file_data,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    except Exception as e:
        logger.error(f"Download dataset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to download dataset"
        )


@router.delete("/{dataset_id}")
async def delete_dataset(
    dataset_id: str,
    user: User = Depends(get_current_user)
):
    """Delete dataset"""
    try:
        storage = get_storage_manager()
        await storage.initialize()
        
        # Delete file
        success = await storage.delete_file(dataset_id, user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete dataset"
            )
        
        return {"message": "Dataset deleted successfully"}
        
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete dataset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete dataset"
        )


@router.post("/process")
async def process_dataset(
    request: ProcessDataRequest,
    user: User = Depends(get_current_user)
):
    """Process dataset with specified operations"""
    try:
        queue = get_job_queue()
        await queue.initialize()
        
        # Create processing job
        job_def = JobDefinition(
            job_id="",
            job_type="data_processing",
            payload={
                'dataset_id': request.dataset_id,
                'processing_type': request.processing_type,
                'operations': request.operations,
                'output_name': request.output_name,
                'user_id': user.id
            },
            priority=JobPriority.NORMAL
        )
        
        job_id = await queue.submit_job(job_def)
        
        return {
            "message": "Processing job submitted",
            "job_id": job_id,
            "status": "queued"
        }
        
    except Exception as e:
        logger.error(f"Process dataset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process dataset"
        )


@router.get("/{dataset_id}/preview")
async def preview_dataset(
    dataset_id: str,
    rows: int = Query(10, ge=1, le=100),
    user: User = Depends(get_current_user)
):
    """Preview dataset (first N rows)"""
    try:
        storage = get_storage_manager()
        await storage.initialize()
        
        # Download file
        file_data, storage_obj = await storage.download_file(
            dataset_id,
            user.id
        )
        
        # Load data
        import pandas as pd
        
        filename = storage_obj.path.split('/')[-1]
        if filename.endswith('.csv'):
            df = pd.read_csv(file_data, nrows=rows)
        elif filename.endswith('.json'):
            df = pd.read_json(file_data)
            df = df.head(rows)
        elif filename.endswith('.parquet'):
            df = pd.read_parquet(file_data)
            df = df.head(rows)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot preview this file type"
            )
        
        return {
            "dataset_id": dataset_id,
            "rows": df.to_dict(orient='records'),
            "columns": list(df.columns),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "shape": df.shape
        }
        
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Preview dataset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to preview dataset"
        )