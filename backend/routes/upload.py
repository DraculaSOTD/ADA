from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from models import schemas
from services import upload_service
from core.database import get_db

router = APIRouter(prefix="/upload", tags=["Upload"])

@router.post("/", response_model=schemas.Upload)
async def upload_file(file: UploadFile, db: Session = Depends(get_db)):
    return await upload_service.save_upload(db=db, file=file)
