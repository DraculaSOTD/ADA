"""
Training Workspace Manager
Creates isolated temporary workspaces for training jobs with automatic cleanup
"""

import os
import shutil
import logging
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session

from models.data import Upload
from models.job import ModelJob
from models.data_lifecycle import DataLifecycleEvent
from services.data_lifecycle_service import get_lifecycle_manager

logger = logging.getLogger(__name__)


class WorkspaceManager:
    """Manages temporary training workspaces with data isolation"""

    def __init__(self, base_workspace_path: str = None):
        if base_workspace_path is None:
            # Use environment variable or default to ./workspaces in current directory
            base_workspace_path = os.getenv("WORKSPACE_PATH", "./workspaces")
        self.base_workspace_path = Path(base_workspace_path)
        self.base_workspace_path.mkdir(parents=True, exist_ok=True)
    
    def create_training_workspace(self, db: Session, job_id: int, user_id: int, 
                                 data_sources: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create isolated workspace for training job with data copies"""
        try:
            workspace_id = str(uuid.uuid4())
            workspace_path = self.base_workspace_path / f"training_{job_id}_{workspace_id}"
            
            # Create workspace directory structure
            workspace_path.mkdir(parents=True, exist_ok=True)
            data_dir = workspace_path / "data"
            data_dir.mkdir(exist_ok=True)
            models_dir = workspace_path / "models"
            models_dir.mkdir(exist_ok=True)
            logs_dir = workspace_path / "logs"
            logs_dir.mkdir(exist_ok=True)
            
            # Copy training data to workspace
            copied_files = []
            total_size = 0
            
            for data_source in data_sources:
                data_id = data_source.get("data_id")
                if not data_id:
                    continue
                
                # Get the upload record
                upload = db.query(Upload).filter(
                    Upload.id == data_id,
                    Upload.user_id == user_id
                ).first()
                
                if not upload or not upload.file_path or not os.path.exists(upload.file_path):
                    logger.warning(f"Data source {data_id} not found or file missing")
                    continue
                
                # Copy file to workspace
                original_filename = os.path.basename(upload.file_path)
                workspace_filename = f"{data_id}_{original_filename}"
                workspace_file_path = data_dir / workspace_filename
                
                shutil.copy2(upload.file_path, workspace_file_path)
                file_size = os.path.getsize(workspace_file_path)
                total_size += file_size
                
                copied_files.append({
                    "original_id": data_id,
                    "original_path": upload.file_path,
                    "workspace_path": str(workspace_file_path),
                    "filename": workspace_filename,
                    "size_bytes": file_size
                })
                
                # Create temporary upload record for workspace file
                self._create_temporary_upload_record(
                    db, upload, str(workspace_file_path), job_id, workspace_id
                )
            
            # Update job record with workspace path
            job = db.query(ModelJob).filter(ModelJob.id == job_id).first()
            if job:
                job.temporary_workspace_path = str(workspace_path)
                job.workspace_cleanup_status = "active"
            
            db.commit()
            
            # Log workspace creation
            lifecycle_manager = get_lifecycle_manager()
            lifecycle_manager._log_lifecycle_event(
                db, "training_workspace", str(job_id), f"Training Job {job_id}",
                "workspace_created", f"Isolated workspace created with {len(copied_files)} data files",
                user_id, "active"
            )
            
            logger.info(f"Created training workspace {workspace_path} for job {job_id}")
            
            return {
                "success": True,
                "workspace_id": workspace_id,
                "workspace_path": str(workspace_path),
                "data_directory": str(data_dir),
                "models_directory": str(models_dir),
                "logs_directory": str(logs_dir),
                "copied_files": copied_files,
                "total_size_bytes": total_size
            }
            
        except Exception as e:
            logger.error(f"Failed to create training workspace for job {job_id}: {e}")
            # Cleanup partial workspace if created
            if 'workspace_path' in locals() and workspace_path.exists():
                shutil.rmtree(workspace_path, ignore_errors=True)
            
            return {"success": False, "error": str(e)}
    
    def _create_temporary_upload_record(self, db: Session, original_upload: Upload, 
                                      workspace_path: str, job_id: int, workspace_id: str):
        """Create temporary upload record for workspace data file"""
        try:
            temp_upload = Upload(
                user_id=original_upload.user_id,
                team_id=original_upload.team_id,
                model_id=original_upload.model_id,
                filename=f"temp_{workspace_id}_{original_upload.filename}",
                original_filename=original_upload.original_filename,
                file_path=workspace_path,
                file_size=os.path.getsize(workspace_path),
                file_type=original_upload.file_type,
                content_type=original_upload.content_type,
                encoding=original_upload.encoding,
                checksum=original_upload.checksum,
                validation_status=original_upload.validation_status,
                quality_score=original_upload.quality_score,
                visibility="private",
                is_temporary=True,
                temporary_workspace_path=workspace_path,
                lifecycle_status="active",
                data_lineage_id=f"training_job_{job_id}_{workspace_id}",
                source_transformation_id=str(original_upload.id)
            )
            
            db.add(temp_upload)
            
        except Exception as e:
            logger.error(f"Failed to create temporary upload record: {e}")
    
    def cleanup_training_workspace(self, db: Session, job_id: int) -> Dict[str, Any]:
        """Clean up training workspace after job completion"""
        try:
            job = db.query(ModelJob).filter(ModelJob.id == job_id).first()
            if not job or not job.temporary_workspace_path:
                return {"success": False, "error": "Job or workspace not found"}
            
            workspace_path = Path(job.temporary_workspace_path)
            
            # Calculate workspace size before deletion
            total_size = 0
            if workspace_path.exists():
                for file_path in workspace_path.rglob("*"):
                    if file_path.is_file():
                        try:
                            total_size += file_path.stat().st_size
                        except:
                            pass
            
            # Remove workspace directory
            if workspace_path.exists():
                shutil.rmtree(workspace_path, ignore_errors=True)
            
            # Update job record
            job.workspace_cleanup_status = "cleaned"
            job.workspace_cleaned_at = datetime.utcnow()
            job.data_files_cleaned = True
            
            # Clean up temporary upload records
            temp_uploads = db.query(Upload).filter(
                Upload.is_temporary == True,
                Upload.temporary_workspace_path.like(f"{workspace_path}%")
            ).all()
            
            for temp_upload in temp_uploads:
                temp_upload.lifecycle_status = "deleted"
                temp_upload.file_path = None  # Clear file path
                temp_upload.temporary_workspace_path = None
            
            db.commit()
            
            # Log cleanup event
            lifecycle_manager = get_lifecycle_manager()
            lifecycle_manager._log_lifecycle_event(
                db, "training_workspace", str(job_id), f"Training Job {job_id}",
                "workspace_cleaned", f"Workspace cleaned, freed {total_size} bytes",
                job.user_id, "cleaned"
            )
            
            logger.info(f"Cleaned up workspace for job {job_id}, freed {total_size} bytes")
            
            return {
                "success": True,
                "workspace_path": str(workspace_path),
                "bytes_freed": total_size,
                "temp_uploads_cleaned": len(temp_uploads)
            }
            
        except Exception as e:
            logger.error(f"Failed to cleanup workspace for job {job_id}: {e}")
            # Mark as failed but don't raise exception
            if 'job' in locals() and job:
                job.workspace_cleanup_status = "failed"
                db.commit()
            
            return {"success": False, "error": str(e)}
    
    def get_workspace_info(self, db: Session, job_id: int) -> Dict[str, Any]:
        """Get information about a training workspace"""
        try:
            job = db.query(ModelJob).filter(ModelJob.id == job_id).first()
            if not job:
                return {"success": False, "error": "Job not found"}
            
            workspace_info = {
                "success": True,
                "job_id": job_id,
                "workspace_path": job.temporary_workspace_path,
                "cleanup_status": job.workspace_cleanup_status,
                "cleaned_at": job.workspace_cleaned_at.isoformat() if job.workspace_cleaned_at else None,
                "data_files_cleaned": job.data_files_cleaned
            }
            
            # If workspace exists, get current size and file count
            if job.temporary_workspace_path:
                workspace_path = Path(job.temporary_workspace_path)
                if workspace_path.exists():
                    file_count = 0
                    total_size = 0
                    
                    for file_path in workspace_path.rglob("*"):
                        if file_path.is_file():
                            file_count += 1
                            try:
                                total_size += file_path.stat().st_size
                            except:
                                pass
                    
                    workspace_info.update({
                        "workspace_exists": True,
                        "file_count": file_count,
                        "total_size_bytes": total_size,
                        "total_size_mb": round(total_size / 1024 / 1024, 2)
                    })
                else:
                    workspace_info.update({
                        "workspace_exists": False,
                        "file_count": 0,
                        "total_size_bytes": 0
                    })
            
            return workspace_info
            
        except Exception as e:
            logger.error(f"Failed to get workspace info for job {job_id}: {e}")
            return {"success": False, "error": str(e)}
    
    def list_active_workspaces(self, db: Session) -> List[Dict[str, Any]]:
        """List all active training workspaces"""
        try:
            active_jobs = db.query(ModelJob).filter(
                ModelJob.temporary_workspace_path.isnot(None),
                ModelJob.workspace_cleanup_status.in_(["active", "pending"])
            ).all()
            
            workspaces = []
            for job in active_jobs:
                workspace_path = Path(job.temporary_workspace_path)
                workspace_info = {
                    "job_id": job.id,
                    "user_id": job.user_id,
                    "workspace_path": str(workspace_path),
                    "created_at": job.created_at.isoformat() if job.created_at else None,
                    "status": job.status,
                    "cleanup_status": job.workspace_cleanup_status,
                    "exists": workspace_path.exists() if workspace_path else False
                }
                
                # Get size if workspace exists
                if workspace_path.exists():
                    total_size = 0
                    file_count = 0
                    for file_path in workspace_path.rglob("*"):
                        if file_path.is_file():
                            file_count += 1
                            try:
                                total_size += file_path.stat().st_size
                            except:
                                pass
                    
                    workspace_info.update({
                        "file_count": file_count,
                        "size_bytes": total_size,
                        "size_mb": round(total_size / 1024 / 1024, 2)
                    })
                
                workspaces.append(workspace_info)
            
            return workspaces
            
        except Exception as e:
            logger.error(f"Failed to list active workspaces: {e}")
            return []
    
    def force_cleanup_orphaned_workspaces(self) -> Dict[str, Any]:
        """Force cleanup of workspaces that are no longer linked to active jobs"""
        try:
            cleaned_count = 0
            bytes_freed = 0
            errors = []
            
            # Scan workspace directory for orphaned workspaces
            if self.base_workspace_path.exists():
                for workspace_dir in self.base_workspace_path.iterdir():
                    if workspace_dir.is_dir() and workspace_dir.name.startswith("training_"):
                        try:
                            # Extract job ID from directory name
                            parts = workspace_dir.name.split("_")
                            if len(parts) >= 2:
                                job_id = int(parts[1])
                                
                                # Check if job exists and is completed
                                with SessionLocal() as db:
                                    job = db.query(ModelJob).filter(ModelJob.id == job_id).first()
                                    
                                    should_cleanup = False
                                    if not job:
                                        should_cleanup = True  # Orphaned workspace
                                    elif job.status in ["completed", "failed", "cancelled"]:
                                        # Check if cleanup is overdue (more than 24 hours after completion)
                                        if job.completed_at:
                                            hours_since_completion = (datetime.utcnow() - job.completed_at).total_seconds() / 3600
                                            if hours_since_completion > 24:
                                                should_cleanup = True
                                    
                                    if should_cleanup:
                                        # Calculate size before cleanup
                                        dir_size = 0
                                        for file_path in workspace_dir.rglob("*"):
                                            if file_path.is_file():
                                                try:
                                                    dir_size += file_path.stat().st_size
                                                except:
                                                    pass
                                        
                                        # Remove directory
                                        shutil.rmtree(workspace_dir, ignore_errors=True)
                                        
                                        cleaned_count += 1
                                        bytes_freed += dir_size
                                        
                                        logger.info(f"Force cleaned orphaned workspace: {workspace_dir}")
                        
                        except Exception as e:
                            error_msg = f"Failed to cleanup {workspace_dir}: {e}"
                            errors.append(error_msg)
                            logger.error(error_msg)
            
            return {
                "success": True,
                "cleaned_count": cleaned_count,
                "bytes_freed": bytes_freed,
                "errors": errors
            }
            
        except Exception as e:
            logger.error(f"Failed to force cleanup orphaned workspaces: {e}")
            return {"success": False, "error": str(e)}


# Global workspace manager instance
workspace_manager = None

def get_workspace_manager():
    """Get or create the global workspace manager instance"""
    global workspace_manager
    if workspace_manager is None:
        workspace_manager = WorkspaceManager()
    return workspace_manager