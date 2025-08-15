"""
Storage Manager
Unified storage management for files, models, and datasets
"""

import os
import shutil
import hashlib
import mimetypes
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, BinaryIO, Tuple
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import aiofiles
import boto3
from botocore.exceptions import ClientError
import azure.storage.blob as azure_blob
from google.cloud import storage as gcs
import logging
import json
import uuid

logger = logging.getLogger(__name__)


class StorageProvider(Enum):
    """Storage provider types"""
    LOCAL = "local"
    S3 = "s3"
    AZURE = "azure"
    GCS = "gcs"
    HYBRID = "hybrid"


class StorageClass(Enum):
    """Storage classes for optimization"""
    HOT = "hot"          # Frequently accessed
    WARM = "warm"        # Occasionally accessed
    COLD = "cold"        # Rarely accessed
    ARCHIVE = "archive"  # Long-term storage


@dataclass
class StorageObject:
    """Storage object metadata"""
    object_id: str
    path: str
    size: int
    content_type: str
    created_at: datetime
    modified_at: datetime
    storage_class: StorageClass
    provider: StorageProvider
    
    # Optional metadata
    checksum: Optional[str] = None
    encryption: Optional[str] = None
    tags: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # Access control
    owner: Optional[str] = None
    permissions: Dict[str, str] = field(default_factory=dict)
    
    # Lifecycle
    expires_at: Optional[datetime] = None
    archive_after_days: Optional[int] = None


@dataclass
class StorageQuota:
    """Storage quota for users/teams"""
    entity_id: str
    entity_type: str  # user, team, project
    total_bytes: int
    used_bytes: int
    file_count: int
    max_file_size: int
    allowed_types: List[str]


@dataclass
class TransferJob:
    """Data transfer job"""
    job_id: str
    source_path: str
    destination_path: str
    source_provider: StorageProvider
    destination_provider: StorageProvider
    status: str  # pending, running, completed, failed
    progress: float
    bytes_transferred: int
    total_bytes: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


class StorageManager:
    """
    Unified storage management system supporting multiple providers
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.providers: Dict[StorageProvider, Any] = {}
        self.quotas: Dict[str, StorageQuota] = {}
        self.transfer_jobs: Dict[str, TransferJob] = {}
        
        # Initialize storage providers
        self._initialize_providers()
        
        # Cache for frequently accessed objects
        self.metadata_cache: Dict[str, StorageObject] = {}
        
        # Statistics
        self.stats = {
            'total_storage_used': 0,
            'total_files': 0,
            'provider_usage': {}
        }
    
    def _initialize_providers(self):
        """Initialize configured storage providers"""
        # Local storage
        if self.config.get('enable_local', True):
            local_path = Path(self.config.get('local_path', '/data/storage'))
            local_path.mkdir(parents=True, exist_ok=True)
            self.providers[StorageProvider.LOCAL] = {
                'path': local_path,
                'max_size': self.config.get('local_max_size', 100 * 1024**3)  # 100GB
            }
        
        # AWS S3
        if self.config.get('enable_s3', False):
            self.providers[StorageProvider.S3] = boto3.client(
                's3',
                aws_access_key_id=self.config.get('aws_access_key'),
                aws_secret_access_key=self.config.get('aws_secret_key'),
                region_name=self.config.get('aws_region', 'us-east-1')
            )
        
        # Azure Blob Storage
        if self.config.get('enable_azure', False):
            self.providers[StorageProvider.AZURE] = azure_blob.BlobServiceClient(
                account_url=self.config.get('azure_account_url'),
                credential=self.config.get('azure_credential')
            )
        
        # Google Cloud Storage
        if self.config.get('enable_gcs', False):
            self.providers[StorageProvider.GCS] = gcs.Client(
                project=self.config.get('gcp_project')
            )
    
    async def initialize(self):
        """Initialize storage manager"""
        # Start background tasks
        asyncio.create_task(self._lifecycle_manager_loop())
        asyncio.create_task(self._quota_monitor_loop())
        asyncio.create_task(self._transfer_worker_loop())
        
        logger.info("Storage manager initialized")
    
    # File Operations
    async def upload_file(self, 
                         file_data: BinaryIO,
                         path: str,
                         user_id: str,
                         storage_class: StorageClass = StorageClass.HOT,
                         provider: Optional[StorageProvider] = None,
                         metadata: Optional[Dict] = None) -> StorageObject:
        """Upload a file to storage"""
        try:
            # Check quota
            if not await self._check_quota(user_id, file_data):
                raise ValueError("Storage quota exceeded")
            
            # Determine provider
            if not provider:
                provider = await self._select_provider(storage_class)
            
            # Generate object ID
            object_id = str(uuid.uuid4())
            
            # Calculate checksum
            checksum = await self._calculate_checksum(file_data)
            file_data.seek(0)
            
            # Get file info
            file_size = self._get_file_size(file_data)
            content_type = mimetypes.guess_type(path)[0] or 'application/octet-stream'
            
            # Upload based on provider
            if provider == StorageProvider.LOCAL:
                stored_path = await self._upload_local(file_data, path)
            elif provider == StorageProvider.S3:
                stored_path = await self._upload_s3(file_data, path)
            elif provider == StorageProvider.AZURE:
                stored_path = await self._upload_azure(file_data, path)
            elif provider == StorageProvider.GCS:
                stored_path = await self._upload_gcs(file_data, path)
            else:
                raise ValueError(f"Unsupported provider: {provider}")
            
            # Create storage object
            storage_obj = StorageObject(
                object_id=object_id,
                path=stored_path,
                size=file_size,
                content_type=content_type,
                created_at=datetime.utcnow(),
                modified_at=datetime.utcnow(),
                storage_class=storage_class,
                provider=provider,
                checksum=checksum,
                owner=user_id,
                metadata=metadata or {}
            )
            
            # Store metadata
            await self._store_metadata(storage_obj)
            
            # Update quota
            await self._update_quota(user_id, file_size, 1)
            
            # Update statistics
            self.stats['total_storage_used'] += file_size
            self.stats['total_files'] += 1
            
            logger.info(f"File uploaded: {path} ({file_size} bytes) to {provider.value}")
            
            return storage_obj
            
        except Exception as e:
            logger.error(f"Failed to upload file: {e}")
            raise
    
    async def download_file(self, 
                          object_id: str,
                          user_id: str) -> Tuple[BinaryIO, StorageObject]:
        """Download a file from storage"""
        try:
            # Get metadata
            storage_obj = await self._get_metadata(object_id)
            if not storage_obj:
                raise FileNotFoundError(f"Object not found: {object_id}")
            
            # Check permissions
            if not await self._check_permission(storage_obj, user_id, 'read'):
                raise PermissionError("Access denied")
            
            # Download based on provider
            if storage_obj.provider == StorageProvider.LOCAL:
                file_data = await self._download_local(storage_obj.path)
            elif storage_obj.provider == StorageProvider.S3:
                file_data = await self._download_s3(storage_obj.path)
            elif storage_obj.provider == StorageProvider.AZURE:
                file_data = await self._download_azure(storage_obj.path)
            elif storage_obj.provider == StorageProvider.GCS:
                file_data = await self._download_gcs(storage_obj.path)
            else:
                raise ValueError(f"Unsupported provider: {storage_obj.provider}")
            
            # Verify checksum
            if storage_obj.checksum:
                calculated_checksum = await self._calculate_checksum(file_data)
                file_data.seek(0)
                if calculated_checksum != storage_obj.checksum:
                    raise ValueError("Checksum verification failed")
            
            logger.info(f"File downloaded: {storage_obj.path}")
            
            return file_data, storage_obj
            
        except Exception as e:
            logger.error(f"Failed to download file: {e}")
            raise
    
    async def delete_file(self, object_id: str, user_id: str) -> bool:
        """Delete a file from storage"""
        try:
            # Get metadata
            storage_obj = await self._get_metadata(object_id)
            if not storage_obj:
                raise FileNotFoundError(f"Object not found: {object_id}")
            
            # Check permissions
            if not await self._check_permission(storage_obj, user_id, 'delete'):
                raise PermissionError("Access denied")
            
            # Delete based on provider
            if storage_obj.provider == StorageProvider.LOCAL:
                await self._delete_local(storage_obj.path)
            elif storage_obj.provider == StorageProvider.S3:
                await self._delete_s3(storage_obj.path)
            elif storage_obj.provider == StorageProvider.AZURE:
                await self._delete_azure(storage_obj.path)
            elif storage_obj.provider == StorageProvider.GCS:
                await self._delete_gcs(storage_obj.path)
            
            # Remove metadata
            await self._delete_metadata(object_id)
            
            # Update quota
            await self._update_quota(user_id, -storage_obj.size, -1)
            
            # Update statistics
            self.stats['total_storage_used'] -= storage_obj.size
            self.stats['total_files'] -= 1
            
            logger.info(f"File deleted: {storage_obj.path}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete file: {e}")
            raise
    
    async def list_files(self, 
                        user_id: str,
                        path_prefix: Optional[str] = None,
                        provider: Optional[StorageProvider] = None,
                        limit: int = 100) -> List[StorageObject]:
        """List files in storage"""
        # This would query the metadata store
        # For now, return cached objects
        results = []
        
        for obj in self.metadata_cache.values():
            # Check permissions
            if not await self._check_permission(obj, user_id, 'read'):
                continue
            
            # Apply filters
            if path_prefix and not obj.path.startswith(path_prefix):
                continue
            if provider and obj.provider != provider:
                continue
            
            results.append(obj)
            
            if len(results) >= limit:
                break
        
        return results
    
    # Provider-specific operations
    async def _upload_local(self, file_data: BinaryIO, path: str) -> str:
        """Upload to local storage"""
        local_config = self.providers[StorageProvider.LOCAL]
        full_path = local_config['path'] / path
        
        # Create directories
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write file
        async with aiofiles.open(full_path, 'wb') as f:
            await f.write(file_data.read())
        
        return str(full_path)
    
    async def _download_local(self, path: str) -> BinaryIO:
        """Download from local storage"""
        async with aiofiles.open(path, 'rb') as f:
            data = await f.read()
        
        import io
        return io.BytesIO(data)
    
    async def _delete_local(self, path: str):
        """Delete from local storage"""
        os.remove(path)
    
    async def _upload_s3(self, file_data: BinaryIO, path: str) -> str:
        """Upload to S3"""
        s3_client = self.providers[StorageProvider.S3]
        bucket = self.config.get('s3_bucket')
        
        s3_client.upload_fileobj(file_data, bucket, path)
        
        return f"s3://{bucket}/{path}"
    
    async def _download_s3(self, path: str) -> BinaryIO:
        """Download from S3"""
        s3_client = self.providers[StorageProvider.S3]
        
        # Parse S3 path
        parts = path.replace('s3://', '').split('/', 1)
        bucket = parts[0]
        key = parts[1]
        
        import io
        file_data = io.BytesIO()
        s3_client.download_fileobj(bucket, key, file_data)
        file_data.seek(0)
        
        return file_data
    
    async def _delete_s3(self, path: str):
        """Delete from S3"""
        s3_client = self.providers[StorageProvider.S3]
        
        # Parse S3 path
        parts = path.replace('s3://', '').split('/', 1)
        bucket = parts[0]
        key = parts[1]
        
        s3_client.delete_object(Bucket=bucket, Key=key)
    
    async def _upload_azure(self, file_data: BinaryIO, path: str) -> str:
        """Upload to Azure Blob Storage"""
        azure_client = self.providers[StorageProvider.AZURE]
        container = self.config.get('azure_container')
        
        blob_client = azure_client.get_blob_client(
            container=container,
            blob=path
        )
        blob_client.upload_blob(file_data, overwrite=True)
        
        return f"azure://{container}/{path}"
    
    async def _download_azure(self, path: str) -> BinaryIO:
        """Download from Azure"""
        azure_client = self.providers[StorageProvider.AZURE]
        
        # Parse Azure path
        parts = path.replace('azure://', '').split('/', 1)
        container = parts[0]
        blob_name = parts[1]
        
        blob_client = azure_client.get_blob_client(
            container=container,
            blob=blob_name
        )
        
        import io
        file_data = io.BytesIO()
        file_data.write(blob_client.download_blob().readall())
        file_data.seek(0)
        
        return file_data
    
    async def _delete_azure(self, path: str):
        """Delete from Azure"""
        azure_client = self.providers[StorageProvider.AZURE]
        
        # Parse Azure path
        parts = path.replace('azure://', '').split('/', 1)
        container = parts[0]
        blob_name = parts[1]
        
        blob_client = azure_client.get_blob_client(
            container=container,
            blob=blob_name
        )
        blob_client.delete_blob()
    
    async def _upload_gcs(self, file_data: BinaryIO, path: str) -> str:
        """Upload to Google Cloud Storage"""
        gcs_client = self.providers[StorageProvider.GCS]
        bucket_name = self.config.get('gcs_bucket')
        
        bucket = gcs_client.bucket(bucket_name)
        blob = bucket.blob(path)
        blob.upload_from_file(file_data)
        
        return f"gcs://{bucket_name}/{path}"
    
    async def _download_gcs(self, path: str) -> BinaryIO:
        """Download from GCS"""
        gcs_client = self.providers[StorageProvider.GCS]
        
        # Parse GCS path
        parts = path.replace('gcs://', '').split('/', 1)
        bucket_name = parts[0]
        blob_name = parts[1]
        
        bucket = gcs_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        
        import io
        file_data = io.BytesIO()
        blob.download_to_file(file_data)
        file_data.seek(0)
        
        return file_data
    
    async def _delete_gcs(self, path: str):
        """Delete from GCS"""
        gcs_client = self.providers[StorageProvider.GCS]
        
        # Parse GCS path
        parts = path.replace('gcs://', '').split('/', 1)
        bucket_name = parts[0]
        blob_name = parts[1]
        
        bucket = gcs_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        blob.delete()
    
    # Data Transfer
    async def transfer_data(self,
                          source_path: str,
                          destination_path: str,
                          source_provider: StorageProvider,
                          destination_provider: StorageProvider) -> str:
        """Transfer data between storage providers"""
        job_id = str(uuid.uuid4())
        
        # Create transfer job
        job = TransferJob(
            job_id=job_id,
            source_path=source_path,
            destination_path=destination_path,
            source_provider=source_provider,
            destination_provider=destination_provider,
            status='pending',
            progress=0,
            bytes_transferred=0,
            total_bytes=0,
            started_at=datetime.utcnow()
        )
        
        self.transfer_jobs[job_id] = job
        
        # Queue for processing
        # The transfer worker will handle it
        
        logger.info(f"Transfer job created: {job_id}")
        
        return job_id
    
    async def _transfer_worker_loop(self):
        """Process data transfer jobs"""
        while True:
            try:
                # Find pending jobs
                pending_jobs = [
                    job for job in self.transfer_jobs.values()
                    if job.status == 'pending'
                ]
                
                for job in pending_jobs:
                    await self._execute_transfer(job)
                
                await asyncio.sleep(5)
                
            except Exception as e:
                logger.error(f"Transfer worker error: {e}")
    
    async def _execute_transfer(self, job: TransferJob):
        """Execute a data transfer job"""
        try:
            job.status = 'running'
            
            # Download from source
            if job.source_provider == StorageProvider.LOCAL:
                data = await self._download_local(job.source_path)
            elif job.source_provider == StorageProvider.S3:
                data = await self._download_s3(job.source_path)
            elif job.source_provider == StorageProvider.AZURE:
                data = await self._download_azure(job.source_path)
            elif job.source_provider == StorageProvider.GCS:
                data = await self._download_gcs(job.source_path)
            else:
                raise ValueError(f"Unsupported source provider: {job.source_provider}")
            
            # Get size
            data.seek(0, 2)
            job.total_bytes = data.tell()
            data.seek(0)
            
            # Upload to destination
            if job.destination_provider == StorageProvider.LOCAL:
                await self._upload_local(data, job.destination_path)
            elif job.destination_provider == StorageProvider.S3:
                await self._upload_s3(data, job.destination_path)
            elif job.destination_provider == StorageProvider.AZURE:
                await self._upload_azure(data, job.destination_path)
            elif job.destination_provider == StorageProvider.GCS:
                await self._upload_gcs(data, job.destination_path)
            else:
                raise ValueError(f"Unsupported destination provider: {job.destination_provider}")
            
            # Update job
            job.status = 'completed'
            job.progress = 100
            job.bytes_transferred = job.total_bytes
            job.completed_at = datetime.utcnow()
            
            logger.info(f"Transfer completed: {job.job_id}")
            
        except Exception as e:
            job.status = 'failed'
            job.error = str(e)
            logger.error(f"Transfer failed: {job.job_id} - {e}")
    
    # Lifecycle Management
    async def _lifecycle_manager_loop(self):
        """Manage storage lifecycle policies"""
        while True:
            try:
                await asyncio.sleep(3600)  # Run hourly
                
                # Check for expired objects
                await self._cleanup_expired_objects()
                
                # Move objects to appropriate storage class
                await self._optimize_storage_classes()
                
            except Exception as e:
                logger.error(f"Lifecycle manager error: {e}")
    
    async def _cleanup_expired_objects(self):
        """Delete expired objects"""
        current_time = datetime.utcnow()
        
        for obj in list(self.metadata_cache.values()):
            if obj.expires_at and obj.expires_at < current_time:
                try:
                    await self.delete_file(obj.object_id, obj.owner)
                    logger.info(f"Expired object deleted: {obj.object_id}")
                except Exception as e:
                    logger.error(f"Failed to delete expired object: {e}")
    
    async def _optimize_storage_classes(self):
        """Move objects to appropriate storage classes based on access patterns"""
        current_time = datetime.utcnow()
        
        for obj in self.metadata_cache.values():
            # Check if should be archived
            if obj.archive_after_days:
                age_days = (current_time - obj.created_at).days
                
                if age_days > obj.archive_after_days and obj.storage_class != StorageClass.ARCHIVE:
                    # Move to archive storage
                    # This would involve transferring to a cold storage provider
                    logger.info(f"Object should be archived: {obj.object_id}")
    
    # Quota Management
    async def set_quota(self, entity_id: str, entity_type: str,
                       total_bytes: int, max_file_size: int,
                       allowed_types: Optional[List[str]] = None):
        """Set storage quota for an entity"""
        quota = StorageQuota(
            entity_id=entity_id,
            entity_type=entity_type,
            total_bytes=total_bytes,
            used_bytes=0,
            file_count=0,
            max_file_size=max_file_size,
            allowed_types=allowed_types or []
        )
        
        self.quotas[entity_id] = quota
        
        logger.info(f"Quota set for {entity_type} {entity_id}: {total_bytes} bytes")
    
    async def _check_quota(self, user_id: str, file_data: BinaryIO) -> bool:
        """Check if upload is within quota"""
        if user_id not in self.quotas:
            return True  # No quota set
        
        quota = self.quotas[user_id]
        file_size = self._get_file_size(file_data)
        
        # Check total storage
        if quota.used_bytes + file_size > quota.total_bytes:
            return False
        
        # Check file size
        if file_size > quota.max_file_size:
            return False
        
        return True
    
    async def _update_quota(self, user_id: str, size_delta: int, count_delta: int):
        """Update quota usage"""
        if user_id in self.quotas:
            quota = self.quotas[user_id]
            quota.used_bytes += size_delta
            quota.file_count += count_delta
    
    async def _quota_monitor_loop(self):
        """Monitor quota usage"""
        while True:
            try:
                await asyncio.sleep(60)
                
                # Check for quota violations
                for entity_id, quota in self.quotas.items():
                    if quota.used_bytes > quota.total_bytes:
                        logger.warning(f"Quota exceeded for {entity_id}: {quota.used_bytes}/{quota.total_bytes}")
                
            except Exception as e:
                logger.error(f"Quota monitor error: {e}")
    
    # Helper Methods
    async def _select_provider(self, storage_class: StorageClass) -> StorageProvider:
        """Select appropriate storage provider based on class"""
        if storage_class in [StorageClass.HOT, StorageClass.WARM]:
            # Use fastest available provider
            if StorageProvider.LOCAL in self.providers:
                return StorageProvider.LOCAL
            elif StorageProvider.S3 in self.providers:
                return StorageProvider.S3
        else:
            # Use cheapest provider for cold/archive
            if StorageProvider.S3 in self.providers:
                return StorageProvider.S3
            elif StorageProvider.AZURE in self.providers:
                return StorageProvider.AZURE
        
        # Fallback to any available
        return list(self.providers.keys())[0]
    
    async def _calculate_checksum(self, file_data: BinaryIO) -> str:
        """Calculate file checksum"""
        hasher = hashlib.sha256()
        
        while True:
            chunk = file_data.read(8192)
            if not chunk:
                break
            hasher.update(chunk)
        
        file_data.seek(0)
        return hasher.hexdigest()
    
    def _get_file_size(self, file_data: BinaryIO) -> int:
        """Get file size"""
        current_pos = file_data.tell()
        file_data.seek(0, 2)
        size = file_data.tell()
        file_data.seek(current_pos)
        return size
    
    async def _check_permission(self, obj: StorageObject, user_id: str, 
                               action: str) -> bool:
        """Check if user has permission for action"""
        # Owner has all permissions
        if obj.owner == user_id:
            return True
        
        # Check specific permissions
        if user_id in obj.permissions:
            allowed_actions = obj.permissions[user_id].split(',')
            return action in allowed_actions
        
        # Check public permissions
        if '*' in obj.permissions:
            allowed_actions = obj.permissions['*'].split(',')
            return action in allowed_actions
        
        return False
    
    async def _store_metadata(self, obj: StorageObject):
        """Store object metadata"""
        self.metadata_cache[obj.object_id] = obj
        
        # Also store in persistent storage (database)
        # This would be implemented based on your database choice
    
    async def _get_metadata(self, object_id: str) -> Optional[StorageObject]:
        """Get object metadata"""
        return self.metadata_cache.get(object_id)
    
    async def _delete_metadata(self, object_id: str):
        """Delete object metadata"""
        self.metadata_cache.pop(object_id, None)
    
    # Statistics
    def get_statistics(self) -> Dict:
        """Get storage statistics"""
        provider_stats = {}
        
        for provider in self.providers:
            provider_objects = [
                obj for obj in self.metadata_cache.values()
                if obj.provider == provider
            ]
            
            provider_stats[provider.value] = {
                'file_count': len(provider_objects),
                'total_size': sum(obj.size for obj in provider_objects)
            }
        
        return {
            'total_storage_used': self.stats['total_storage_used'],
            'total_files': self.stats['total_files'],
            'provider_statistics': provider_stats,
            'active_transfers': len([
                j for j in self.transfer_jobs.values()
                if j.status == 'running'
            ])
        }
    
    async def shutdown(self):
        """Shutdown storage manager"""
        logger.info("Shutting down storage manager")
        
        # Cancel pending transfers
        for job in self.transfer_jobs.values():
            if job.status == 'pending':
                job.status = 'cancelled'