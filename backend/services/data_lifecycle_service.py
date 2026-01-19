"""
Data Lifecycle Management Service
Handles automatic data cleanup, retention policies, and background scheduling
"""

import asyncio
import os
import shutil
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from models.data_lifecycle import (
    DataDownload, DataRetentionPolicy, CleanupJob, DataLifecycleEvent, 
    UserRetentionPreference, DataLifecycleStatus, RetentionPolicyType
)
from models.data import Upload
from models.job import GeneratedData, PredictionResult, ModelJob
from models.user import User
from core.database import SessionLocal

logger = logging.getLogger(__name__)


class DataLifecycleManager:
    """Manages data lifecycle, retention policies, and automatic cleanup"""
    
    def __init__(self):
        self.cleanup_running = False
        self.last_cleanup_run = None
        self.default_policies = self._load_default_policies()
        
    def _load_default_policies(self) -> Dict[str, Dict]:
        """Load default retention policies for different data types"""
        return {
            "generated_data": {
                "retention_type": RetentionPolicyType.HOURS_24,
                "retention_hours": 24,
                "trigger_on_first_download": True,
                "send_notifications": True,
                "notification_hours_before": 2
            },
            "prediction": {
                "retention_type": RetentionPolicyType.HOURS_24,
                "retention_hours": 24,
                "trigger_on_first_download": True,
                "send_notifications": True,
                "notification_hours_before": 2
            },
            "upload": {
                "retention_type": RetentionPolicyType.TRAINING_COMPLETE,
                "trigger_on_job_completion": True,
                "send_notifications": False
            }
        }
    
    async def start_background_cleanup(self):
        """Start the background cleanup process"""
        logger.info("Starting background data lifecycle cleanup service")
        
        while True:
            try:
                if not self.cleanup_running:
                    await self._run_scheduled_cleanup()
                
                # Wait 1 hour between cleanup runs
                await asyncio.sleep(3600)
                
            except Exception as e:
                logger.error(f"Error in background cleanup: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes on error
    
    async def _run_scheduled_cleanup(self):
        """Run scheduled cleanup for expired data"""
        self.cleanup_running = True
        cleanup_start = datetime.utcnow()
        
        try:
            with SessionLocal() as db:
                # Create cleanup job record
                cleanup_job = CleanupJob(
                    job_type="scheduled_cleanup",
                    cleanup_reason="retention_expired",
                    scheduled_at=cleanup_start,
                    started_at=cleanup_start
                )
                db.add(cleanup_job)
                db.commit()
                job_id = cleanup_job.id
            
            # Run cleanup for each data type
            results = {
                "uploads": await self._cleanup_expired_uploads(),
                "generated_data": await self._cleanup_expired_generated_data(),
                "predictions": await self._cleanup_expired_predictions(),
                "training_workspaces": await self._cleanup_training_workspaces()
            }
            
            # Update cleanup job with results
            with SessionLocal() as db:
                cleanup_job = db.query(CleanupJob).filter(CleanupJob.id == job_id).first()
                if cleanup_job:
                    cleanup_job.completed_at = datetime.utcnow()
                    cleanup_job.status = "completed"
                    cleanup_job.items_processed = sum(r.get("processed", 0) for r in results.values())
                    cleanup_job.items_deleted = sum(r.get("deleted", 0) for r in results.values())
                    cleanup_job.items_failed = sum(r.get("failed", 0) for r in results.values())
                    cleanup_job.bytes_freed = sum(r.get("bytes_freed", 0) for r in results.values())
                    cleanup_job.execution_log = [f"{k}: {v}" for k, v in results.items()]
                    db.commit()
            
            self.last_cleanup_run = datetime.utcnow()
            logger.info(f"Scheduled cleanup completed: {results}")
            
        except Exception as e:
            logger.error(f"Scheduled cleanup failed: {e}")
            # Mark cleanup job as failed
            with SessionLocal() as db:
                cleanup_job = db.query(CleanupJob).filter(CleanupJob.id == job_id).first()
                if cleanup_job:
                    cleanup_job.completed_at = datetime.utcnow()
                    cleanup_job.status = "failed"
                    cleanup_job.last_error = str(e)
                    db.commit()
        
        finally:
            self.cleanup_running = False
    
    async def _cleanup_expired_uploads(self) -> Dict[str, int]:
        """Clean up expired upload files"""
        processed = deleted = failed = bytes_freed = 0
        
        with SessionLocal() as db:
            # Find uploads that are expired and scheduled for deletion
            expired_uploads = db.query(Upload).filter(
                Upload.lifecycle_status == DataLifecycleStatus.EXPIRED.value,
                Upload.scheduled_deletion_at <= datetime.utcnow()
            ).all()
            
            for upload in expired_uploads:
                processed += 1
                try:
                    # Delete file from disk
                    if upload.file_path and os.path.exists(upload.file_path):
                        file_size = os.path.getsize(upload.file_path)
                        os.remove(upload.file_path)
                        bytes_freed += file_size
                    
                    # Delete temporary workspace if exists
                    if upload.temporary_workspace_path and os.path.exists(upload.temporary_workspace_path):
                        workspace_size = self._get_directory_size(upload.temporary_workspace_path)
                        shutil.rmtree(upload.temporary_workspace_path, ignore_errors=True)
                        bytes_freed += workspace_size
                    
                    # Update database record
                    upload.lifecycle_status = DataLifecycleStatus.DELETED.value
                    upload.file_path = None  # Clear file path
                    upload.temporary_workspace_path = None
                    
                    # Log lifecycle event
                    self._log_lifecycle_event(
                        db, "upload", str(upload.id), upload.filename,
                        "deleted", "Automatic cleanup - retention expired",
                        upload.user_id, upload.lifecycle_status
                    )
                    
                    deleted += 1
                    
                except Exception as e:
                    logger.error(f"Failed to delete upload {upload.id}: {e}")
                    failed += 1
            
            db.commit()
        
        return {"processed": processed, "deleted": deleted, "failed": failed, "bytes_freed": bytes_freed}
    
    async def _cleanup_expired_generated_data(self) -> Dict[str, int]:
        """Clean up expired generated data files"""
        processed = deleted = failed = bytes_freed = 0
        
        with SessionLocal() as db:
            # Find generated data that is expired and scheduled for deletion
            expired_data = db.query(GeneratedData).filter(
                GeneratedData.lifecycle_status == DataLifecycleStatus.EXPIRED.value,
                GeneratedData.scheduled_deletion_at <= datetime.utcnow()
            ).all()
            
            for data in expired_data:
                processed += 1
                try:
                    # Delete file from disk
                    if data.file_path and os.path.exists(data.file_path):
                        file_size = os.path.getsize(data.file_path)
                        os.remove(data.file_path)
                        bytes_freed += file_size
                    
                    # Update database record
                    data.lifecycle_status = DataLifecycleStatus.DELETED.value
                    data.file_path = None
                    
                    # Log lifecycle event
                    self._log_lifecycle_event(
                        db, "generated_data", str(data.id), data.instance_name,
                        "deleted", "Automatic cleanup - 24h after download expired",
                        data.user_id, data.lifecycle_status
                    )
                    
                    deleted += 1
                    
                except Exception as e:
                    logger.error(f"Failed to delete generated data {data.id}: {e}")
                    failed += 1
            
            db.commit()
        
        return {"processed": processed, "deleted": deleted, "failed": failed, "bytes_freed": bytes_freed}
    
    async def _cleanup_expired_predictions(self) -> Dict[str, int]:
        """Clean up expired prediction result files"""
        processed = deleted = failed = bytes_freed = 0
        
        with SessionLocal() as db:
            # Find prediction results that are expired and scheduled for deletion
            expired_predictions = db.query(PredictionResult).filter(
                PredictionResult.lifecycle_status == DataLifecycleStatus.EXPIRED.value,
                PredictionResult.scheduled_deletion_at <= datetime.utcnow()
            ).all()
            
            for prediction in expired_predictions:
                processed += 1
                try:
                    # Delete file from disk
                    if prediction.result_file_path and os.path.exists(prediction.result_file_path):
                        file_size = os.path.getsize(prediction.result_file_path)
                        os.remove(prediction.result_file_path)
                        bytes_freed += file_size
                    
                    # Update database record
                    prediction.lifecycle_status = DataLifecycleStatus.DELETED.value
                    prediction.result_file_path = None
                    
                    # Log lifecycle event
                    self._log_lifecycle_event(
                        db, "prediction", str(prediction.id), f"Prediction {prediction.id}",
                        "deleted", "Automatic cleanup - 24h after download expired",
                        prediction.user_id, prediction.lifecycle_status
                    )
                    
                    deleted += 1
                    
                except Exception as e:
                    logger.error(f"Failed to delete prediction {prediction.id}: {e}")
                    failed += 1
            
            db.commit()
        
        return {"processed": processed, "deleted": deleted, "failed": failed, "bytes_freed": bytes_freed}
    
    async def _cleanup_training_workspaces(self) -> Dict[str, int]:
        """Clean up temporary training workspaces from completed jobs"""
        processed = deleted = failed = bytes_freed = 0
        
        with SessionLocal() as db:
            # Find completed training jobs with uncleaned workspaces
            completed_jobs = db.query(ModelJob).filter(
                ModelJob.status.in_(["completed", "failed", "cancelled"]),
                ModelJob.workspace_cleanup_status == "pending",
                ModelJob.temporary_workspace_path.isnot(None),
                ModelJob.completed_at <= datetime.utcnow() - timedelta(hours=1)  # Wait 1 hour before cleanup
            ).all()
            
            for job in completed_jobs:
                processed += 1
                try:
                    workspace_path = job.temporary_workspace_path
                    
                    if workspace_path and os.path.exists(workspace_path):
                        # Calculate workspace size before deletion
                        workspace_size = self._get_directory_size(workspace_path)
                        
                        # Remove the entire temporary workspace
                        shutil.rmtree(workspace_path, ignore_errors=True)
                        bytes_freed += workspace_size
                    
                    # Update job record
                    job.workspace_cleanup_status = "cleaned"
                    job.workspace_cleaned_at = datetime.utcnow()
                    job.data_files_cleaned = True
                    
                    # Log lifecycle event
                    self._log_lifecycle_event(
                        db, "training_workspace", str(job.id), f"Training Job {job.id}",
                        "workspace_cleaned", "Automatic cleanup - training completed",
                        job.user_id, "cleaned"
                    )
                    
                    deleted += 1
                    
                except Exception as e:
                    logger.error(f"Failed to cleanup training workspace for job {job.id}: {e}")
                    job.workspace_cleanup_status = "failed"
                    failed += 1
            
            db.commit()
        
        return {"processed": processed, "deleted": deleted, "failed": failed, "bytes_freed": bytes_freed}
    
    def track_download(self, db: Session, user_id: int, resource_type: str, 
                      resource_id: str, resource_name: str = None, 
                      file_path: str = None, file_size: int = None) -> Dict[str, Any]:
        """Track a data download event and update retention timers"""
        try:
            # Check if this is the first download
            existing_downloads = db.query(DataDownload).filter(
                DataDownload.user_id == user_id,
                DataDownload.resource_type == resource_type,
                DataDownload.resource_id == resource_id
            ).count()
            
            is_first_download = existing_downloads == 0
            
            # Create download record
            download = DataDownload(
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                resource_name=resource_name,
                file_path=file_path,
                file_size_bytes=file_size,
                is_first_download=is_first_download,
                retention_timer_started=is_first_download
            )
            db.add(download)
            
            # If first download, start retention timer
            if is_first_download:
                self._start_retention_timer(db, resource_type, resource_id, user_id)
            
            # Update download count on the resource
            self._update_download_count(db, resource_type, resource_id)
            
            db.commit()
            
            return {
                "success": True,
                "download_id": download.id,
                "is_first_download": is_first_download,
                "retention_timer_started": is_first_download
            }
            
        except Exception as e:
            logger.error(f"Error tracking download: {e}")
            return {"success": False, "error": str(e)}
    
    def _start_retention_timer(self, db: Session, resource_type: str, resource_id: str, user_id: int):
        """Start the retention countdown for a resource after first download"""
        try:
            # Get the appropriate retention policy
            policy = self._get_retention_policy(db, resource_type, user_id)
            if not policy:
                return
            
            # Calculate expiration time
            expires_at = datetime.utcnow() + timedelta(hours=policy["retention_hours"])
            notification_time = expires_at - timedelta(hours=policy.get("notification_hours_before", 2))
            
            # Update the resource with retention information
            if resource_type == "generated_data":
                resource = db.query(GeneratedData).filter(GeneratedData.id == int(resource_id)).first()
            elif resource_type == "prediction":
                resource = db.query(PredictionResult).filter(PredictionResult.id == int(resource_id)).first()
            elif resource_type == "upload":
                resource = db.query(Upload).filter(Upload.id == int(resource_id)).first()
            else:
                return
            
            if resource:
                resource.lifecycle_status = DataLifecycleStatus.DOWNLOADED.value
                resource.first_downloaded_at = datetime.utcnow()
                resource.expires_at = expires_at
                resource.scheduled_deletion_at = expires_at
                
                # Log lifecycle event
                self._log_lifecycle_event(
                    db, resource_type, resource_id, getattr(resource, 'filename', f"{resource_type} {resource_id}"),
                    "download_timer_started", f"24-hour retention timer started",
                    user_id, DataLifecycleStatus.DOWNLOADED.value,
                    new_expiration=expires_at
                )
                
        except Exception as e:
            logger.error(f"Error starting retention timer: {e}")
    
    def _get_retention_policy(self, db: Session, resource_type: str, user_id: int) -> Optional[Dict]:
        """Get the appropriate retention policy for a resource"""
        # First check for user-specific policy
        user_policy = db.query(DataRetentionPolicy).filter(
            DataRetentionPolicy.resource_type == resource_type,
            DataRetentionPolicy.specific_user_id == user_id,
            DataRetentionPolicy.is_active == True
        ).first()
        
        if user_policy:
            return {
                "retention_hours": user_policy.retention_hours,
                "notification_hours_before": user_policy.notification_hours_before,
                "send_notifications": user_policy.send_notifications
            }
        
        # Then check for global policy
        global_policy = db.query(DataRetentionPolicy).filter(
            DataRetentionPolicy.resource_type == resource_type,
            DataRetentionPolicy.applies_to_all_users == True,
            DataRetentionPolicy.is_active == True
        ).first()
        
        if global_policy:
            return {
                "retention_hours": global_policy.retention_hours,
                "notification_hours_before": global_policy.notification_hours_before,
                "send_notifications": global_policy.send_notifications
            }
        
        # Fall back to default policy
        return self.default_policies.get(resource_type)
    
    def _update_download_count(self, db: Session, resource_type: str, resource_id: str):
        """Update the download count on the resource"""
        try:
            resource_id_int = int(resource_id)
            
            if resource_type == "generated_data":
                db.query(GeneratedData).filter(GeneratedData.id == resource_id_int).update(
                    {GeneratedData.download_count: GeneratedData.download_count + 1}
                )
            elif resource_type == "prediction":
                db.query(PredictionResult).filter(PredictionResult.id == resource_id_int).update(
                    {PredictionResult.download_count: PredictionResult.download_count + 1}
                )
            elif resource_type == "upload":
                db.query(Upload).filter(Upload.id == resource_id_int).update(
                    {Upload.download_count: Upload.download_count + 1}
                )
                
        except Exception as e:
            logger.error(f"Error updating download count: {e}")
    
    def _log_lifecycle_event(self, db: Session, resource_type: str, resource_id: str, 
                           resource_name: str, event_type: str, description: str, 
                           user_id: int, new_status: str, previous_status: str = None,
                           new_expiration: datetime = None, previous_expiration: datetime = None):
        """Log a data lifecycle event for audit purposes"""
        try:
            event = DataLifecycleEvent(
                resource_type=resource_type,
                resource_id=resource_id,
                resource_name=resource_name,
                event_type=event_type,
                event_description=description,
                user_id=user_id,
                triggered_by="system",
                previous_status=previous_status,
                new_status=new_status,
                previous_expiration=previous_expiration,
                new_expiration=new_expiration
            )
            db.add(event)
            
        except Exception as e:
            logger.error(f"Error logging lifecycle event: {e}")
    
    def _get_directory_size(self, directory_path: str) -> int:
        """Calculate total size of a directory in bytes"""
        try:
            total_size = 0
            for dirpath, dirnames, filenames in os.walk(directory_path):
                for filename in filenames:
                    file_path = os.path.join(dirpath, filename)
                    if os.path.exists(file_path):
                        total_size += os.path.getsize(file_path)
            return total_size
        except Exception:
            return 0
    
    async def check_expiring_data(self):
        """Check for data that will expire soon and send notifications"""
        try:
            with SessionLocal() as db:
                # Find data expiring in the next 2 hours that hasn't been notified
                upcoming_expiry = datetime.utcnow() + timedelta(hours=2)
                
                # Check generated data
                expiring_generated = db.query(GeneratedData).filter(
                    GeneratedData.lifecycle_status == DataLifecycleStatus.DOWNLOADED.value,
                    GeneratedData.expires_at <= upcoming_expiry,
                    GeneratedData.expires_at > datetime.utcnow(),
                    GeneratedData.expiry_notified_at.is_(None)
                ).all()
                
                # Check predictions
                expiring_predictions = db.query(PredictionResult).filter(
                    PredictionResult.lifecycle_status == DataLifecycleStatus.DOWNLOADED.value,
                    PredictionResult.expires_at <= upcoming_expiry,
                    PredictionResult.expires_at > datetime.utcnow(),
                    PredictionResult.expiry_notified_at.is_(None)
                ).all()
                
                # Send notifications and mark as notified
                for item in expiring_generated + expiring_predictions:
                    await self._send_expiry_notification(db, item)
                    item.expiry_notified_at = datetime.utcnow()
                
                db.commit()
                
        except Exception as e:
            logger.error(f"Error checking expiring data: {e}")
    
    async def _send_expiry_notification(self, db: Session, item):
        """Send notification about upcoming data expiry"""
        # This would integrate with an email service
        # For now, just log the notification
        user = db.query(User).filter(User.id == item.user_id).first()
        if user:
            logger.info(f"NOTIFICATION: Data {item.id} for user {user.email} expires at {item.expires_at}")
            
            # Log notification event
            resource_type = "generated_data" if hasattr(item, 'instance_name') else "prediction"
            resource_name = getattr(item, 'instance_name', f"Prediction {item.id}")
            
            self._log_lifecycle_event(
                db, resource_type, str(item.id), resource_name,
                "expiry_notification_sent", f"User notified of upcoming expiry at {item.expires_at}",
                user.id, item.lifecycle_status
            )


# Global lifecycle manager instance
lifecycle_manager = None

def get_lifecycle_manager():
    """Get or create the global lifecycle manager instance"""
    global lifecycle_manager
    if lifecycle_manager is None:
        lifecycle_manager = DataLifecycleManager()
    return lifecycle_manager

async def start_lifecycle_background_service():
    """Start the background lifecycle management service"""
    manager = get_lifecycle_manager()
    await manager.start_background_cleanup()