import os
import shutil
import json
import csv
import pandas as pd
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import UploadFile
from models.data import Upload
from models import schemas

UPLOAD_DIR = "uploads"

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

async def save_upload(db: Session, file: UploadFile, user_id: int):
    """Save an uploaded file with user association."""
    # Create user-specific directory
    user_dir = os.path.join(UPLOAD_DIR, str(user_id))
    if not os.path.exists(user_dir):
        os.makedirs(user_dir)
    
    # Generate unique filename to avoid collisions
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    filename_parts = os.path.splitext(file.filename)
    unique_filename = f"{filename_parts[0]}_{timestamp}{filename_parts[1]}"
    file_path = os.path.join(user_dir, unique_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Get file size
    file_size = os.path.getsize(file_path)
    
    # Create database record
    db_upload = Upload(
        filename=file.filename,
        path=file_path,
        user_id=user_id,
        file_size=file_size,
        file_type=filename_parts[1].lower(),
        uploaded_at=datetime.utcnow()
    )
    db.add(db_upload)
    db.commit()
    db.refresh(db_upload)
    return db_upload

def get_user_uploads(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    file_type: Optional[str] = None
) -> List[Upload]:
    """Get all uploads for a specific user."""
    query = db.query(Upload).filter(Upload.user_id == user_id)
    
    if file_type:
        query = query.filter(Upload.file_type == file_type)
    
    return query.order_by(desc(Upload.uploaded_at)).offset(skip).limit(limit).all()

def get_upload_by_id(db: Session, upload_id: int) -> Optional[Upload]:
    """Get a specific upload by ID."""
    return db.query(Upload).filter(Upload.id == upload_id).first()

def delete_upload(db: Session, upload_id: int) -> bool:
    """Delete an upload from database and disk."""
    upload = get_upload_by_id(db, upload_id)
    if not upload:
        return False
    
    # Delete file from disk
    if os.path.exists(upload.path):
        try:
            os.remove(upload.path)
        except Exception as e:
            print(f"Error deleting file: {e}")
    
    # Delete from database
    db.delete(upload)
    db.commit()
    return True

async def validate_file_content(file: UploadFile, file_ext: str) -> Dict[str, Any]:
    """Validate file content based on type."""
    try:
        if file_ext == '.csv':
            # Validate CSV
            contents = await file.read()
            await file.seek(0)
            
            try:
                # Try to parse CSV
                import io
                text_content = contents.decode('utf-8')
                csv_reader = csv.DictReader(io.StringIO(text_content))
                rows = list(csv_reader)
                
                return {
                    "valid": True,
                    "details": {
                        "rows": len(rows),
                        "columns": len(csv_reader.fieldnames) if csv_reader.fieldnames else 0,
                        "headers": csv_reader.fieldnames
                    }
                }
            except Exception as e:
                return {
                    "valid": False,
                    "error": f"Invalid CSV format: {str(e)}"
                }
        
        elif file_ext == '.json':
            # Validate JSON
            contents = await file.read()
            await file.seek(0)
            
            try:
                data = json.loads(contents)
                
                # Determine JSON structure
                if isinstance(data, list):
                    structure = "array"
                    item_count = len(data)
                elif isinstance(data, dict):
                    structure = "object"
                    item_count = len(data.keys())
                else:
                    structure = "primitive"
                    item_count = 1
                
                return {
                    "valid": True,
                    "details": {
                        "structure": structure,
                        "items": item_count,
                        "sample_keys": list(data.keys())[:10] if isinstance(data, dict) else None
                    }
                }
            except json.JSONDecodeError as e:
                return {
                    "valid": False,
                    "error": f"Invalid JSON format: {str(e)}"
                }
        
        elif file_ext in ['.xlsx', '.xls']:
            # Validate Excel
            try:
                # Save temporarily to read with pandas
                import tempfile
                with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
                    contents = await file.read()
                    tmp.write(contents)
                    tmp_path = tmp.name
                
                await file.seek(0)
                
                # Read Excel file
                excel_file = pd.ExcelFile(tmp_path)
                sheets = excel_file.sheet_names
                
                # Get info about first sheet
                if sheets:
                    df = pd.read_excel(tmp_path, sheet_name=sheets[0])
                    rows, cols = df.shape
                else:
                    rows, cols = 0, 0
                
                # Clean up temp file
                os.unlink(tmp_path)
                
                return {
                    "valid": True,
                    "details": {
                        "sheets": sheets,
                        "rows": rows,
                        "columns": cols
                    }
                }
            except Exception as e:
                return {
                    "valid": False,
                    "error": f"Invalid Excel format: {str(e)}"
                }
        
        else:
            # For other file types, just check if readable
            contents = await file.read()
            await file.seek(0)
            
            return {
                "valid": True,
                "details": {
                    "size_bytes": len(contents)
                }
            }
    
    except Exception as e:
        return {
            "valid": False,
            "error": f"Error validating file: {str(e)}"
        }
