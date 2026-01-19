"""
Enhanced Download API with Data Lifecycle Management
Tracks downloads, manages retention policies, and handles automatic cleanup
"""

import os
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from datetime import datetime
import json

from models.data import Upload
from models.job import GeneratedData, PredictionResult
from models.data_lifecycle import DataDownload, DataLifecycleEvent, DataLifecycleStatus
from services.data_lifecycle_service import get_lifecycle_manager
from services import security
from core.database import get_db

router = APIRouter(prefix="/api/v2/downloads", tags=["Enhanced Downloads"])
logger = logging.getLogger(__name__)


@router.get("/generated-data/{data_id}")
async def download_generated_data_with_tracking(
    data_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(security.get_current_user),
    format: str = Query("original", description="Download format: original, csv, json, excel")
):
    """Download generated data with retention tracking"""
    try:
        # Get generated data record
        data_record = db.query(GeneratedData).filter(
            GeneratedData.id == data_id,
            GeneratedData.user_id == current_user.id
        ).first()
        
        if not data_record:
            raise HTTPException(status_code=404, detail="Generated data not found")
        
        # Check if data has been deleted
        if data_record.lifecycle_status == DataLifecycleStatus.DELETED.value:
            raise HTTPException(status_code=410, detail="Data has been automatically deleted due to retention policy")
        
        # Check if file exists
        if not data_record.file_path or not os.path.exists(data_record.file_path):
            raise HTTPException(status_code=404, detail="Data file not found on disk")
        
        # Track the download
        lifecycle_manager = get_lifecycle_manager()
        download_result = lifecycle_manager.track_download(
            db, current_user.id, "generated_data", str(data_id),
            data_record.instance_name, data_record.file_path, 
            os.path.getsize(data_record.file_path)
        )
        
        # Send notification if this is the first download
        if download_result.get("is_first_download"):
            background_tasks.add_task(
                _send_retention_notification, 
                current_user.email, data_record.instance_name, 
                data_record.expires_at
            )
        
        # Determine media type and filename
        file_ext = os.path.splitext(data_record.file_path)[1].lower()
        media_type = {
            '.csv': 'text/csv',
            '.json': 'application/json', 
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.zip': 'application/zip'
        }.get(file_ext, 'application/octet-stream')
        
        filename = f"{data_record.instance_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_ext}"
        
        # Stream the file
        def iterfile():
            with open(data_record.file_path, 'rb') as f:
                yield from f
        
        return StreamingResponse(
            iterfile(),
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "X-Download-Info": json.dumps({
                    "download_id": download_result.get("download_id"),
                    "is_first_download": download_result.get("is_first_download"),
                    "expires_at": data_record.expires_at.isoformat() if data_record.expires_at else None,
                    "retention_hours": 24
                })
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading generated data {data_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/predictions/{prediction_id}")
async def download_prediction_with_tracking(
    prediction_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(security.get_current_user)
):
    """Download prediction results with retention tracking"""
    try:
        # Get prediction record
        prediction = db.query(PredictionResult).filter(
            PredictionResult.id == prediction_id,
            PredictionResult.user_id == current_user.id
        ).first()
        
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction result not found")
        
        # Check if prediction has been deleted
        if prediction.lifecycle_status == DataLifecycleStatus.DELETED.value:
            raise HTTPException(status_code=410, detail="Prediction result has been automatically deleted")
        
        # Check if file exists
        if not prediction.result_file_path or not os.path.exists(prediction.result_file_path):
            raise HTTPException(status_code=404, detail="Prediction file not found on disk")
        
        # Track the download
        lifecycle_manager = get_lifecycle_manager()
        download_result = lifecycle_manager.track_download(
            db, current_user.id, "prediction", str(prediction_id),
            f"Prediction {prediction_id}", prediction.result_file_path,
            os.path.getsize(prediction.result_file_path)
        )
        
        # Send notification if this is the first download
        if download_result.get("is_first_download"):
            background_tasks.add_task(
                _send_retention_notification,
                current_user.email, f"Prediction {prediction_id}",
                prediction.expires_at
            )
        
        # Return file
        filename = f"prediction_{prediction_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        return FileResponse(
            prediction.result_file_path,
            filename=filename,
            media_type='application/json',
            headers={
                "X-Download-Info": json.dumps({
                    "download_id": download_result.get("download_id"),
                    "is_first_download": download_result.get("is_first_download"),
                    "expires_at": prediction.expires_at.isoformat() if prediction.expires_at else None,
                    "retention_hours": 24
                })
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading prediction {prediction_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/uploads/{upload_id}")  
async def download_upload_with_tracking(
    upload_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(security.get_current_user)
):
    """Download upload with tracking (for temporary training data)"""
    try:
        # Get upload record
        upload = db.query(Upload).filter(
            Upload.id == upload_id,
            Upload.user_id == current_user.id
        ).first()
        
        if not upload:
            raise HTTPException(status_code=404, detail="Upload not found")
        
        # Check if upload has been deleted
        if upload.lifecycle_status == DataLifecycleStatus.DELETED.value:
            raise HTTPException(status_code=410, detail="Upload has been automatically deleted")
        
        # Check if file exists
        file_path = upload.file_path
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Upload file not found on disk")
        
        # Track the download only for temporary files
        if upload.is_temporary:
            lifecycle_manager = get_lifecycle_manager()
            download_result = lifecycle_manager.track_download(
                db, current_user.id, "upload", str(upload_id),
                upload.filename, upload.file_path,
                upload.file_size
            )
        else:
            download_result = {"download_id": None, "is_first_download": False}
        
        # Return file
        filename = upload.original_filename or upload.filename
        
        return FileResponse(
            file_path,
            filename=filename,
            media_type=upload.content_type or 'application/octet-stream',
            headers={
                "X-Download-Info": json.dumps({
                    "download_id": download_result.get("download_id"),
                    "is_temporary": upload.is_temporary,
                    "expires_at": upload.expires_at.isoformat() if upload.expires_at else None
                })
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading upload {upload_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
def get_download_history(
    db: Session = Depends(get_db),
    current_user = Depends(security.get_current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    resource_type: Optional[str] = Query(None, description="Filter by resource type")
):
    """Get user's download history"""
    try:
        query = db.query(DataDownload).filter(
            DataDownload.user_id == current_user.id
        )
        
        if resource_type:
            query = query.filter(DataDownload.resource_type == resource_type)
        
        downloads = query.order_by(DataDownload.created_at.desc()).offset(offset).limit(limit).all()
        
        history = []
        for download in downloads:
            history.append({
                "download_id": download.id,
                "resource_type": download.resource_type,
                "resource_id": download.resource_id,
                "resource_name": download.resource_name,
                "download_method": download.download_method,
                "file_size_mb": round(download.file_size_bytes / 1024 / 1024, 2) if download.file_size_bytes else None,
                "downloaded_at": download.download_started_at.isoformat(),
                "is_first_download": download.is_first_download,
                "retention_timer_started": download.retention_timer_started
            })
        
        return {
            "downloads": history,
            "total_count": query.count(),
            "showing": len(history)
        }
        
    except Exception as e:
        logger.error(f"Error getting download history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/expiring-data")
def get_expiring_data(
    db: Session = Depends(get_db),
    current_user = Depends(security.get_current_user)
):
    """Get user's data that will expire soon"""
    try:
        expiring_data = []
        
        # Check generated data
        generated_data = db.query(GeneratedData).filter(
            GeneratedData.user_id == current_user.id,
            GeneratedData.lifecycle_status == DataLifecycleStatus.DOWNLOADED.value,
            GeneratedData.expires_at.isnot(None)
        ).all()
        
        for data in generated_data:
            hours_until_expiry = (data.expires_at - datetime.utcnow()).total_seconds() / 3600
            if hours_until_expiry > 0:
                expiring_data.append({
                    "resource_type": "generated_data",
                    "resource_id": data.id,
                    "name": data.instance_name,
                    "expires_at": data.expires_at.isoformat(),
                    "hours_until_expiry": round(hours_until_expiry, 1),
                    "download_count": data.download_count,
                    "can_extend": False  # Generated data cannot be extended
                })
        
        # Check predictions
        predictions = db.query(PredictionResult).filter(
            PredictionResult.user_id == current_user.id,
            PredictionResult.lifecycle_status == DataLifecycleStatus.DOWNLOADED.value,
            PredictionResult.expires_at.isnot(None)
        ).all()
        
        for prediction in predictions:
            hours_until_expiry = (prediction.expires_at - datetime.utcnow()).total_seconds() / 3600
            if hours_until_expiry > 0:
                expiring_data.append({
                    "resource_type": "prediction",
                    "resource_id": prediction.id,
                    "name": f"Prediction {prediction.id}",
                    "expires_at": prediction.expires_at.isoformat(),
                    "hours_until_expiry": round(hours_until_expiry, 1),
                    "download_count": prediction.download_count,
                    "can_extend": False  # Predictions cannot be extended
                })
        
        # Sort by expiry time
        expiring_data.sort(key=lambda x: x["expires_at"])
        
        return {
            "expiring_data": expiring_data,
            "total_count": len(expiring_data)
        }
        
    except Exception as e:
        logger.error(f"Error getting expiring data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extend-retention/{resource_type}/{resource_id}")
def extend_data_retention(
    resource_type: str,
    resource_id: int,
    extension_hours: int = Query(24, ge=1, le=168, description="Hours to extend (max 168 = 7 days)"),
    db: Session = Depends(get_db),
    current_user = Depends(security.get_current_user)
):
    """Extend data retention period (premium feature)"""
    try:
        # For demo purposes, this is disabled since retention is fixed at 24 hours
        # In a real system, this could be a premium feature
        
        raise HTTPException(
            status_code=403, 
            detail="Data retention extension is not available. Generated data and predictions are automatically deleted 24 hours after first download."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extending retention: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _send_retention_notification(email: str, data_name: str, expires_at: datetime):
    """Send retention timer notification (placeholder for email integration)"""
    logger.info(f"RETENTION NOTIFICATION: Sending to {email} - {data_name} expires at {expires_at}")
    # In a real system, this would integrate with an email service
    # For now, we just log the notification