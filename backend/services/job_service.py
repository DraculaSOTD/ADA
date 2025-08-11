from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from models.job import ModelJob, JobLog
from models import schemas

def create_job(db: Session, job: schemas.ModelJobCreate, user_id: int):
    """Create a new job."""
    db_job = ModelJob(
        **job.dict(),
        user_id=user_id,
        status="pending",
        created_at=datetime.utcnow()
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

def get_job(db: Session, job_id: int) -> Optional[ModelJob]:
    """Get a job by ID."""
    return db.query(ModelJob).filter(ModelJob.id == job_id).first()

def get_user_jobs(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    job_type: Optional[str] = None
) -> List[ModelJob]:
    """Get all jobs for a user with filtering."""
    query = db.query(ModelJob).filter(ModelJob.user_id == user_id)
    
    if status:
        query = query.filter(ModelJob.status == status)
    
    if job_type:
        query = query.filter(ModelJob.job_type == job_type)
    
    return query.order_by(desc(ModelJob.created_at)).offset(skip).limit(limit).all()

def update_job_status(
    db: Session,
    job_id: int,
    status: str,
    error_message: Optional[str] = None
) -> ModelJob:
    """Update job status."""
    job = get_job(db, job_id)
    if job:
        job.status = status
        
        if status == "running" and not job.started_at:
            job.started_at = datetime.utcnow()
        elif status in ["completed", "failed", "cancelled"]:
            job.completed_at = datetime.utcnow()
            
            # Calculate duration
            if job.started_at:
                duration = (job.completed_at - job.started_at).total_seconds()
                job.duration_seconds = int(duration)
        
        if error_message:
            job.error_message = error_message
        
        db.commit()
        db.refresh(job)
        
        # Create log entry
        create_job_log(
            db,
            job_id=job_id,
            message=f"Status changed to {status}" + (f": {error_message}" if error_message else ""),
            log_level="ERROR" if status == "failed" else "INFO"
        )
    
    return job

def delete_job(db: Session, job_id: int) -> bool:
    """Delete a job and its logs."""
    job = get_job(db, job_id)
    if job:
        # Delete associated logs
        db.query(JobLog).filter(JobLog.job_id == job_id).delete()
        
        # Delete job
        db.delete(job)
        db.commit()
        return True
    return False

def create_job_log(
    db: Session,
    job_id: int,
    message: str,
    log_level: str = "INFO"
) -> JobLog:
    """Create a job log entry."""
    log = JobLog(
        job_id=job_id,
        timestamp=datetime.utcnow(),
        message=message,
        log_level=log_level
    )
    db.add(log)
    db.commit()
    return log

def get_job_logs(
    db: Session,
    job_id: int,
    lines: int = 100,
    offset: int = 0
) -> List[str]:
    """Get job logs."""
    logs = db.query(JobLog).filter(
        JobLog.job_id == job_id
    ).order_by(desc(JobLog.timestamp)).offset(offset).limit(lines).all()
    
    # Format logs
    formatted_logs = []
    for log in reversed(logs):  # Show oldest first
        timestamp = log.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        formatted_logs.append(f"[{timestamp}] [{log.log_level}] {log.message}")
    
    return formatted_logs

def retry_job(db: Session, job_id: int) -> ModelJob:
    """Create a new job based on a failed one."""
    original_job = get_job(db, job_id)
    if not original_job:
        return None
    
    # Create new job with same parameters
    new_job = ModelJob(
        user_id=original_job.user_id,
        model_id=original_job.model_id,
        job_type=original_job.job_type,
        status="pending",
        parameters=original_job.parameters,
        created_at=datetime.utcnow(),
        retry_of_job_id=job_id
    )
    
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    
    # Log the retry
    create_job_log(
        db,
        job_id=new_job.id,
        message=f"Retry of job {job_id}",
        log_level="INFO"
    )
    
    return new_job

def get_user_job_stats(
    db: Session,
    user_id: int,
    days: int = 30
) -> Dict[str, Any]:
    """Get job statistics for a user."""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Get all jobs in the period
    jobs = db.query(ModelJob).filter(
        ModelJob.user_id == user_id,
        ModelJob.created_at >= cutoff_date
    ).all()
    
    # Calculate statistics
    stats = {
        "total": len(jobs),
        "completed": 0,
        "failed": 0,
        "running": 0,
        "pending": 0,
        "cancelled": 0,
        "total_duration": 0,
        "success_rate": 0,
        "avg_duration": 0
    }
    
    for job in jobs:
        stats[job.status] = stats.get(job.status, 0) + 1
        if job.duration_seconds:
            stats["total_duration"] += job.duration_seconds
    
    # Calculate success rate
    if stats["completed"] + stats["failed"] > 0:
        stats["success_rate"] = round(
            stats["completed"] / (stats["completed"] + stats["failed"]) * 100,
            2
        )
    
    # Calculate average duration
    if stats["completed"] > 0:
        stats["avg_duration"] = round(
            stats["total_duration"] / stats["completed"],
            2
        )
    
    return stats

def cleanup_old_jobs(db: Session, days_to_keep: int = 90):
    """Clean up old completed jobs and their logs."""
    cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
    
    # Find old completed jobs
    old_jobs = db.query(ModelJob).filter(
        ModelJob.completed_at < cutoff_date,
        ModelJob.status.in_(["completed", "failed", "cancelled"])
    ).all()
    
    count = 0
    for job in old_jobs:
        # Delete logs
        db.query(JobLog).filter(JobLog.job_id == job.id).delete()
        # Delete job
        db.delete(job)
        count += 1
    
    db.commit()
    return count