"""
Data Cleaning API Routes
Endpoints for data cleaning operations
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
import os
import tempfile
import json
from datetime import datetime
import asyncio
from pathlib import Path

from models import schemas, CleaningJob, DataProfile, CleaningReport, CleaningTier, CleaningStatus
from services.data_cleaning_service import DataCleaningService, CleaningConfig
from core.database import get_db
from services.security import get_current_user

router = APIRouter(prefix="/api/cleaning", tags=["Data Cleaning"])

# Initialize service
cleaning_service = DataCleaningService()

# Store active cleaning jobs
active_jobs = {}


@router.post("/upload")
async def upload_for_cleaning(
    file: UploadFile = File(...),
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a file for cleaning and get initial profiling"""
    try:
        # Validate file type
        valid_extensions = ['.csv', '.json', '.xlsx', '.xls', '.parquet']
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in valid_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Supported types: {', '.join(valid_extensions)}"
            )
        
        # Check file size (limit to 100MB for now)
        file_size = 0
        chunk_size = 1024 * 1024  # 1MB chunks
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                file_size += len(chunk)
                if file_size > 100 * 1024 * 1024:  # 100MB limit
                    os.unlink(tmp_file.name)
                    raise HTTPException(
                        status_code=413,
                        detail="File too large. Maximum size is 100MB"
                    )
                tmp_file.write(chunk)
            tmp_file_path = tmp_file.name
        
        # Profile the data
        profile = await cleaning_service.profile_data(tmp_file_path)
        
        # Store file path in session/cache for later use
        profile["file_path"] = tmp_file_path
        profile["filename"] = file.filename
        profile["file_size"] = file_size
        
        return JSONResponse(content=profile)
        
    except HTTPException:
        raise
    except Exception as e:
        if 'tmp_file_path' in locals():
            os.unlink(tmp_file_path)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze")
async def analyze_data(
    file_path: str,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Perform detailed analysis on uploaded data"""
    try:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Perform detailed analysis
        profile = await cleaning_service.profile_data(file_path)
        
        return JSONResponse(content=profile)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process")
async def process_cleaning(
    request: Dict[str, Any],
    background_tasks: BackgroundTasks,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start data cleaning process"""
    try:
        # Extract parameters
        file_path = request.get("file_path")
        filename = request.get("filename", "data.csv")
        tier = request.get("tier", "basic")
        template = request.get("template")
        config_dict = request.get("config", {})
        
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Create cleaning configuration
        config = CleaningConfig(
            tier=tier,
            template=template,
            **config_dict
        )
        
        # Calculate token cost (simplified)
        file_size = os.path.getsize(file_path)
        rows_estimate = file_size // 100  # Rough estimate
        token_cost = calculate_token_cost(tier, rows_estimate, config_dict)
        
        # Check user token balance
        if current_user.token_balance < token_cost:
            raise HTTPException(
                status_code=402,
                detail=f"Insufficient tokens. Required: {token_cost}, Available: {current_user.token_balance}"
            )
        
        # Create cleaning job record
        job = CleaningJob(
            user_id=current_user.id,
            filename=filename,
            original_file_path=file_path,
            tier=CleaningTier(tier),
            template=template,
            cleaning_config=config_dict,
            token_cost=token_cost,
            status=CleaningStatus.PENDING,
            created_at=datetime.utcnow()
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        
        # Start cleaning in background
        background_tasks.add_task(
            run_cleaning_job,
            job.id,
            file_path,
            config,
            db
        )
        
        # Deduct tokens
        current_user.token_balance -= token_cost
        db.commit()
        
        return {
            "job_id": job.id,
            "status": "processing",
            "token_cost": token_cost,
            "message": "Cleaning job started successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def run_cleaning_job(job_id: int, file_path: str, config: CleaningConfig, db: Session):
    """Run cleaning job in background"""
    try:
        # Update job status
        job = db.query(CleaningJob).filter(CleaningJob.id == job_id).first()
        if not job:
            return
        
        job.status = CleaningStatus.PROCESSING
        job.started_at = datetime.utcnow()
        db.commit()
        
        # Store in active jobs
        active_jobs[job_id] = {
            "progress": 0,
            "status": "processing",
            "message": "Starting data cleaning..."
        }
        
        # Perform cleaning
        result = await cleaning_service.clean_data(file_path, config, job_id)
        
        if result["success"]:
            # Update job with results
            job.status = CleaningStatus.COMPLETED
            job.cleaned_file_path = result["output_path"]
            job.rows_cleaned = result["rows_cleaned"]
            job.quality_score_after = result.get("quality_improvement", 0)
            
            # Create cleaning report
            report = CleaningReport(
                cleaning_job_id=job_id,
                summary=result["report"],
                operations_performed=result["report"].get("operations_performed", []),
                quality_improvements={
                    "before": result["report"].get("quality_before", 0),
                    "after": result["report"].get("quality_after", 0),
                    "improvement": result.get("quality_improvement", 0)
                }
            )
            db.add(report)
        else:
            job.status = CleaningStatus.FAILED
            job.error_message = result.get("error", "Unknown error")
        
        job.completed_at = datetime.utcnow()
        db.commit()
        
        # Update active jobs
        active_jobs[job_id] = {
            "progress": 100,
            "status": "completed" if result["success"] else "failed",
            "message": "Cleaning completed" if result["success"] else result.get("error")
        }
        
    except Exception as e:
        # Update job status on error
        job = db.query(CleaningJob).filter(CleaningJob.id == job_id).first()
        if job:
            job.status = CleaningStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            db.commit()
        
        active_jobs[job_id] = {
            "progress": 0,
            "status": "failed",
            "message": str(e)
        }


@router.get("/status/{job_id}")
async def get_cleaning_status(
    job_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get status of a cleaning job"""
    job = db.query(CleaningJob).filter(
        CleaningJob.id == job_id,
        CleaningJob.user_id == current_user.id
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check active jobs for real-time status
    if job_id in active_jobs:
        active_status = active_jobs[job_id]
        return {
            "job_id": job_id,
            "status": job.status.value,
            "progress": active_status.get("progress", 0),
            "message": active_status.get("message", ""),
            "filename": job.filename,
            "tier": job.tier.value
        }
    
    return {
        "job_id": job_id,
        "status": job.status.value,
        "progress": 100 if job.status == CleaningStatus.COMPLETED else 0,
        "message": job.error_message if job.status == CleaningStatus.FAILED else "Job completed",
        "filename": job.filename,
        "tier": job.tier.value,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None
    }


@router.get("/history")
async def get_cleaning_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's cleaning job history"""
    jobs = db.query(CleaningJob).filter(
        CleaningJob.user_id == current_user.id
    ).order_by(CleaningJob.created_at.desc()).offset(skip).limit(limit).all()
    
    history = []
    for job in jobs:
        history.append({
            "id": job.id,
            "filename": job.filename,
            "date": job.created_at.isoformat(),
            "rows": job.total_rows or 0,
            "tier": job.tier.value,
            "status": job.status.value,
            "tokens": job.token_cost,
            "quality_improvement": job.quality_score_after - job.quality_score_before if job.quality_score_after and job.quality_score_before else 0
        })
    
    total = db.query(CleaningJob).filter(CleaningJob.user_id == current_user.id).count()
    
    return {
        "history": history,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/download/{job_id}")
async def download_cleaned_data(
    job_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download cleaned data file"""
    job = db.query(CleaningJob).filter(
        CleaningJob.id == job_id,
        CleaningJob.user_id == current_user.id
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != CleaningStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Job not completed")
    
    if not job.cleaned_file_path or not os.path.exists(job.cleaned_file_path):
        raise HTTPException(status_code=404, detail="Cleaned file not found")
    
    # Determine content type based on file extension
    ext = Path(job.cleaned_file_path).suffix.lower()
    content_types = {
        '.csv': 'text/csv',
        '.json': 'application/json',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
        '.parquet': 'application/octet-stream'
    }
    content_type = content_types.get(ext, 'application/octet-stream')
    
    # Generate download filename
    timestamp = job.completed_at.strftime('%Y%m%d_%H%M%S') if job.completed_at else 'cleaned'
    download_name = f"{Path(job.filename).stem}_{timestamp}_cleaned{ext}"
    
    return FileResponse(
        path=job.cleaned_file_path,
        media_type=content_type,
        filename=download_name
    )


@router.get("/report/{job_id}")
async def get_cleaning_report(
    job_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed cleaning report"""
    job = db.query(CleaningJob).filter(
        CleaningJob.id == job_id,
        CleaningJob.user_id == current_user.id
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    report = db.query(CleaningReport).filter(
        CleaningReport.cleaning_job_id == job_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {
        "job_id": job_id,
        "filename": job.filename,
        "tier": job.tier.value,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "summary": report.summary,
        "operations": report.operations_performed,
        "quality_improvements": report.quality_improvements,
        "recommendations": report.recommendations
    }


@router.delete("/job/{job_id}")
async def delete_cleaning_job(
    job_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a cleaning job and its associated files"""
    job = db.query(CleaningJob).filter(
        CleaningJob.id == job_id,
        CleaningJob.user_id == current_user.id
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Delete associated files
    try:
        if job.original_file_path and os.path.exists(job.original_file_path):
            os.unlink(job.original_file_path)
        if job.cleaned_file_path and os.path.exists(job.cleaned_file_path):
            os.unlink(job.cleaned_file_path)
    except:
        pass  # Ignore file deletion errors
    
    # Delete from database
    db.delete(job)
    db.commit()
    
    return {"message": "Job deleted successfully"}


def calculate_token_cost(tier: str, rows: int, config: Dict) -> int:
    """Calculate token cost for cleaning operation"""
    # Base cost per tier
    base_costs = {
        "basic": 1,  # 1 token per million rows
        "advanced": 3,  # 3 tokens per million rows
        "ai-powered": 10  # 10 tokens per million rows
    }
    
    base_cost = base_costs.get(tier, 1)
    
    # Calculate based on rows (in millions)
    rows_in_millions = rows / 1_000_000
    cost = int(base_cost * rows_in_millions)
    
    # Add extra cost for special features
    if config.get("differential_privacy"):
        cost += int(rows_in_millions * 2)
    if config.get("gpt_correction"):
        cost += int(rows_in_millions * 5)
    if config.get("industry_ml_models"):
        cost += int(rows_in_millions * 3)
    
    return max(1, cost)  # Minimum 1 token