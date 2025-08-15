from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from models import schemas
from services import upload_service, security
from core.database import get_db

router = APIRouter(prefix="/api/upload", tags=["Upload"])

# Allowed file types and size limits
ALLOWED_EXTENSIONS = {".csv", ".json", ".xlsx", ".xls", ".txt", ".pdf"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

@router.post("/", response_model=schemas.Upload)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Upload a file with validation."""
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_ext} not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Validate file size
    contents = await file.read()
    file_size = len(contents)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    # Reset file position
    await file.seek(0)
    
    # Save file
    return await upload_service.save_upload(db=db, file=file, user_id=current_user.id)

@router.get("/files", response_model=List[schemas.Upload])
def list_user_files(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    file_type: Optional[str] = None
):
    """List all files uploaded by the current user."""
    return upload_service.get_user_uploads(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        file_type=file_type
    )

@router.get("/files/{file_id}/info", response_model=schemas.Upload)
def get_file_info(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Get metadata for a specific file."""
    file_info = upload_service.get_upload_by_id(db=db, upload_id=file_id)
    
    if not file_info:
        raise HTTPException(status_code=404, detail="File not found")
    
    if file_info.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return file_info

@router.get("/files/{file_id}/download")
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Download a file."""
    file_info = upload_service.get_upload_by_id(db=db, upload_id=file_id)
    
    if not file_info:
        raise HTTPException(status_code=404, detail="File not found")
    
    if file_info.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    file_path = file_info.file_path
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=file_path,
        filename=file_info.filename,
        media_type='application/octet-stream'
    )

@router.delete("/files/{file_id}")
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Delete a file."""
    file_info = upload_service.get_upload_by_id(db=db, upload_id=file_id)
    
    if not file_info:
        raise HTTPException(status_code=404, detail="File not found")
    
    if file_info.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete from database and disk
    success = upload_service.delete_upload(db=db, upload_id=file_id)
    
    if success:
        return {"message": "File deleted successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete file")

@router.post("/validate")
async def validate_file(
    file: UploadFile = File(...),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Validate a file before processing."""
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        return {
            "valid": False,
            "error": f"File type {file_ext} not allowed",
            "allowed_types": list(ALLOWED_EXTENSIONS)
        }
    
    # Check file size
    contents = await file.read()
    file_size = len(contents)
    if file_size > MAX_FILE_SIZE:
        return {
            "valid": False,
            "error": f"File size exceeds maximum allowed size",
            "max_size_mb": MAX_FILE_SIZE / 1024 / 1024,
            "file_size_mb": file_size / 1024 / 1024
        }
    
    # Basic content validation based on file type
    await file.seek(0)
    validation_result = await upload_service.validate_file_content(file, file_ext)
    
    return {
        "valid": validation_result["valid"],
        "file_type": file_ext,
        "file_size_mb": file_size / 1024 / 1024,
        "details": validation_result.get("details", {}),
        "error": validation_result.get("error")
    }
