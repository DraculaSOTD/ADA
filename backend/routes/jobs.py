from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from models import schemas
from services import job_service, security
from core.database import get_db

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

@router.post("/", response_model=schemas.ModelJob)
def create_job(
    job: schemas.ModelJobCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Create a new job."""
    return job_service.create_job(db=db, job=job, user_id=current_user.id)

@router.get("/", response_model=List[schemas.ModelJob])
def list_jobs(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = None,
    job_type: Optional[str] = None
):
    """List all jobs for the current user with filtering options."""
    return job_service.get_user_jobs(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        status=status,
        job_type=job_type
    )

@router.get("/{job_id}", response_model=schemas.ModelJob)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Get a specific job by ID."""
    job = job_service.get_job(db=db, job_id=job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return job

@router.put("/{job_id}/status")
def update_job_status(
    job_id: int,
    status: str,
    error_message: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Update job status."""
    job = job_service.get_job(db=db, job_id=job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate status transition
    valid_statuses = ["pending", "running", "completed", "failed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    # Update job
    updated_job = job_service.update_job_status(
        db=db,
        job_id=job_id,
        status=status,
        error_message=error_message
    )
    
    return {
        "message": f"Job status updated to {status}",
        "job_id": job_id,
        "status": updated_job.status
    }

@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Cancel or delete a job."""
    job = job_service.get_job(db=db, job_id=job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Only allow deletion of completed, failed, or cancelled jobs
    if job.status in ["pending", "running"]:
        # Cancel the job instead of deleting
        job_service.update_job_status(db=db, job_id=job_id, status="cancelled")
        return {"message": "Job cancelled", "job_id": job_id}
    else:
        # Delete the job
        job_service.delete_job(db=db, job_id=job_id)
        return {"message": "Job deleted", "job_id": job_id}

@router.get("/{job_id}/logs")
def get_job_logs(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    lines: int = Query(100, ge=1, le=10000),
    offset: int = Query(0, ge=0)
):
    """Get execution logs for a job."""
    job = job_service.get_job(db=db, job_id=job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get logs from job service
    logs = job_service.get_job_logs(db=db, job_id=job_id, lines=lines, offset=offset)
    
    return {
        "job_id": job_id,
        "status": job.status,
        "logs": logs,
        "line_count": len(logs),
        "offset": offset
    }

@router.post("/{job_id}/retry")
def retry_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Retry a failed job."""
    job = job_service.get_job(db=db, job_id=job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Only allow retry of failed or cancelled jobs
    if job.status not in ["failed", "cancelled"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot retry job with status '{job.status}'. Only failed or cancelled jobs can be retried."
        )
    
    # Create a new job based on the failed one
    new_job = job_service.retry_job(db=db, job_id=job_id)
    
    return {
        "message": "Job retry initiated",
        "original_job_id": job_id,
        "new_job_id": new_job.id,
        "status": new_job.status
    }

@router.get("/stats/summary")
def get_job_stats(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    days: int = Query(30, ge=1, le=365)
):
    """Get job statistics for the user."""
    stats = job_service.get_user_job_stats(db=db, user_id=current_user.id, days=days)
    
    return {
        "period_days": days,
        "total_jobs": stats["total"],
        "completed": stats["completed"],
        "failed": stats["failed"],
        "running": stats["running"],
        "pending": stats["pending"],
        "cancelled": stats["cancelled"],
        "success_rate": stats["success_rate"],
        "average_duration_seconds": stats["avg_duration"]
    }
