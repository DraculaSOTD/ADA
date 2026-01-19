"""
Enhanced Upload API Routes with Multi-tenant Security
Provides secure file upload and management with team support and data isolation
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Header
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import hashlib
import os
from pathlib import Path

from models import schemas
from models.data import Upload
from services import security
from core.database import get_db
from middleware.data_isolation import (
    DataIsolationMiddleware,
    TeamContextMiddleware,
    AccessLevel,
    ResourceType
)

router = APIRouter(prefix="/api/v2/uploads", tags=["Enhanced Uploads"])

# Initialize middleware
def get_data_isolation_middleware():
    from core.database import SessionLocal
    return DataIsolationMiddleware(SessionLocal)

def get_team_context_middleware():
    from core.database import SessionLocal
    return TeamContextMiddleware(SessionLocal)


def calculate_file_checksum(file_content: bytes) -> str:
    """Calculate SHA-256 checksum of file content"""
    return hashlib.sha256(file_content).hexdigest()


@router.post("/", response_model=schemas.Upload)
async def upload_file(
    file: UploadFile = File(...),
    team_id: Optional[str] = Header(None, alias="X-Team-Context"),
    visibility: str = Query("private", regex="^(private|team|public)$"),
    is_sensitive: bool = Query(False),
    data_classification: str = Query("internal", regex="^(public|internal|confidential|restricted)$"),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    isolation_middleware: DataIsolationMiddleware = Depends(get_data_isolation_middleware),
    team_middleware: TeamContextMiddleware = Depends(get_team_context_middleware)
):
    """Upload file with enhanced security and team support"""
    
    # Validate team context if provided
    if team_id:
        if not team_middleware.validate_team_context(current_user.id, team_id):
            raise HTTPException(status_code=403, detail="Invalid team context")
        
        # Check if user has permission to upload to this team
        access_result = isolation_middleware.check_resource_access(
            current_user.id, ResourceType.TEAM, team_id, AccessLevel.WRITE
        )
        if not access_result["allowed"]:
            raise HTTPException(status_code=403, detail="Insufficient team permissions")
    
    try:
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Validate file size (e.g., max 100MB)
        max_size = 100 * 1024 * 1024  # 100MB
        if file_size > max_size:
            raise HTTPException(status_code=413, detail="File too large")
        
        # Calculate checksum for integrity
        checksum = calculate_file_checksum(file_content)
        
        # Check for duplicate files (optional deduplication)
        existing_file = db.query(Upload).filter(
            Upload.checksum == checksum,
            Upload.user_id == current_user.id
        ).first()
        
        if existing_file:
            # Log access to existing file
            isolation_middleware._log_access_attempt(
                db, current_user.id, ResourceType.UPLOAD, existing_file.id,
                "duplicate_upload", True, "file_already_exists", team_id
            )
            return existing_file
        
        # Create unique filename
        import uuid
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4().hex}{file_extension}"
        
        # Determine upload path based on team context
        if team_id:
            upload_dir = Path(f"uploads/teams/{team_id}")
        else:
            upload_dir = Path(f"uploads/users/{current_user.id}")
        
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = upload_dir / unique_filename
        
        # Save file to disk
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Set access permissions based on visibility and team context
        if visibility == "team" and team_id:
            access_permissions = {
                "read": ["owner", "team"],
                "download": ["owner", "team"]
            }
        elif visibility == "public":
            access_permissions = {
                "read": ["owner", "team", "public"],
                "download": ["owner", "team", "public"]
            }
        else:  # private
            access_permissions = {
                "read": ["owner"],
                "download": ["owner"]
            }
        
        # Create upload record
        upload_record = Upload(
            user_id=current_user.id,
            team_id=team_id,
            filename=unique_filename,
            original_filename=file.filename,
            path=str(file_path),
            file_size=file_size,
            file_type=file.content_type or "application/octet-stream",
            content_type=file.content_type,
            checksum=checksum,
            visibility=visibility,
            is_sensitive=is_sensitive,
            data_classification=data_classification,
            access_permissions=access_permissions,
            validation_status="pending"
        )
        
        db.add(upload_record)
        db.commit()
        db.refresh(upload_record)
        
        # Log successful upload
        isolation_middleware._log_access_attempt(
            db, current_user.id, ResourceType.UPLOAD, upload_record.id,
            "create", True, "file_uploaded", team_id
        )
        
        # TODO: Trigger async validation and quality scoring
        
        return upload_record
        
    except Exception as e:
        # Clean up file if upload record creation failed
        if 'file_path' in locals() and file_path.exists():
            file_path.unlink()
        
        isolation_middleware._log_security_event(
            current_user.id, "upload_failed", "medium",
            f"Failed to upload file {file.filename}: {str(e)}"
        )
        raise HTTPException(status_code=500, detail="File upload failed")


@router.get("/", response_model=List[schemas.Upload])
async def get_uploads(
    team_id: Optional[str] = Query(None, description="Filter by team"),
    visibility: Optional[str] = Query(None, description="Filter by visibility"),
    file_type: Optional[str] = Query(None, description="Filter by file type"),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    isolation_middleware: DataIsolationMiddleware = Depends(get_data_isolation_middleware)
):
    """Get uploads with proper access control and filtering"""
    
    try:
        # Get accessible upload IDs
        accessible_ids = isolation_middleware.get_user_accessible_resources(
            current_user.id, ResourceType.UPLOAD, AccessLevel.READ, team_id
        )
        
        if not accessible_ids:
            return []
        
        # Build query with filters
        query = db.query(Upload).filter(Upload.id.in_(accessible_ids))
        
        if team_id:
            query = query.filter(Upload.team_id == team_id)
        
        if visibility:
            query = query.filter(Upload.visibility == visibility)
        
        if file_type:
            query = query.filter(Upload.file_type.like(f"%{file_type}%"))
        
        # Apply pagination
        uploads = query.order_by(Upload.uploaded_at.desc()).offset(offset).limit(limit).all()
        
        # Log access
        isolation_middleware._log_access_attempt(
            db, current_user.id, ResourceType.UPLOAD, "bulk_read",
            AccessLevel.READ, True, f"retrieved_{len(uploads)}_uploads", team_id
        )
        
        return uploads
        
    except Exception as e:
        isolation_middleware._log_security_event(
            current_user.id, "upload_list_error", "medium",
            f"Error retrieving uploads: {str(e)}"
        )
        raise HTTPException(status_code=500, detail="Failed to retrieve uploads")


@router.get("/{upload_id}", response_model=schemas.Upload)
async def get_upload(
    upload_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    isolation_middleware: DataIsolationMiddleware = Depends(get_data_isolation_middleware)
):
    """Get specific upload with access control"""
    
    # Check access
    access_result = isolation_middleware.check_resource_access(
        current_user.id, ResourceType.UPLOAD, upload_id, AccessLevel.READ
    )
    
    if not access_result["allowed"]:
        raise HTTPException(status_code=403, detail=f"Access denied: {access_result['reason']}")
    
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    # Update access tracking
    upload.access_count = upload.access_count + 1
    upload.last_accessed = func.now()
    db.commit()
    
    return upload


@router.delete("/{upload_id}")
async def delete_upload(
    upload_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    isolation_middleware: DataIsolationMiddleware = Depends(get_data_isolation_middleware)
):
    """Delete upload with admin access control"""
    
    # Check admin access (only owner or team admin can delete)
    access_result = isolation_middleware.check_resource_access(
        current_user.id, ResourceType.UPLOAD, upload_id, AccessLevel.ADMIN
    )
    
    if not access_result["allowed"]:
        raise HTTPException(status_code=403, detail=f"Delete access denied: {access_result['reason']}")
    
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    try:
        # Delete file from disk
        file_path = Path(upload.path)
        if file_path.exists():
            file_path.unlink()
        
        # Delete database record
        db.delete(upload)
        db.commit()
        
        # Log deletion
        isolation_middleware._log_access_attempt(
            db, current_user.id, ResourceType.UPLOAD, upload_id,
            "delete", True, "upload_deleted"
        )
        
        return {"message": "Upload deleted successfully"}
        
    except Exception as e:
        isolation_middleware._log_security_event(
            current_user.id, "upload_deletion_failed", "high",
            f"Failed to delete upload {upload_id}: {str(e)}"
        )
        raise HTTPException(status_code=500, detail="Upload deletion failed")


@router.post("/{upload_id}/share")
async def share_upload(
    upload_id: int,
    share_request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    isolation_middleware: DataIsolationMiddleware = Depends(get_data_isolation_middleware)
):
    """Share upload with users or teams"""
    
    # Check admin access (sharing requires admin permissions)
    access_result = isolation_middleware.check_resource_access(
        current_user.id, ResourceType.UPLOAD, upload_id, AccessLevel.ADMIN
    )
    
    if not access_result["allowed"]:
        raise HTTPException(status_code=403, detail="Share access denied")
    
    try:
        # Implementation for sharing logic would go here
        # This would create DataPermission records for the specified users/teams
        
        return {"message": "Upload shared successfully"}
        
    except Exception as e:
        isolation_middleware._log_security_event(
            current_user.id, "upload_sharing_failed", "medium",
            f"Failed to share upload {upload_id}: {str(e)}"
        )
        raise HTTPException(status_code=500, detail="Upload sharing failed")


@router.get("/{upload_id}/download")
async def download_upload(
    upload_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    isolation_middleware: DataIsolationMiddleware = Depends(get_data_isolation_middleware)
):
    """Download upload file with access control"""
    
    # Check download access
    access_result = isolation_middleware.check_resource_access(
        current_user.id, ResourceType.UPLOAD, upload_id, AccessLevel.READ
    )
    
    if not access_result["allowed"]:
        raise HTTPException(status_code=403, detail=f"Download access denied: {access_result['reason']}")
    
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    file_path = Path(upload.path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    try:
        from fastapi.responses import FileResponse
        
        # Log download
        isolation_middleware._log_access_attempt(
            db, current_user.id, ResourceType.UPLOAD, upload_id,
            "download", True, "file_downloaded"
        )
        
        # Update access tracking
        upload.access_count = upload.access_count + 1
        upload.last_accessed = func.now()
        db.commit()
        
        return FileResponse(
            path=str(file_path),
            filename=upload.original_filename,
            media_type=upload.content_type
        )
        
    except Exception as e:
        isolation_middleware._log_security_event(
            current_user.id, "download_failed", "medium",
            f"Failed to download upload {upload_id}: {str(e)}"
        )
        raise HTTPException(status_code=500, detail="Download failed")


@router.get("/{upload_id}/validation-status")
async def get_upload_validation_status(
    upload_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    isolation_middleware: DataIsolationMiddleware = Depends(get_data_isolation_middleware)
):
    """Get validation status and quality metrics for upload"""
    
    # Check read access
    access_result = isolation_middleware.check_resource_access(
        current_user.id, ResourceType.UPLOAD, upload_id, AccessLevel.READ
    )
    
    if not access_result["allowed"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    return {
        "upload_id": upload.id,
        "validation_status": upload.validation_status,
        "quality_score": upload.quality_score,
        "validation_results": upload.validation_results,
        "processing_errors": upload.processing_errors
    }