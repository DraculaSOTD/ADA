import os
import shutil
from sqlalchemy.orm import Session
from fastapi import UploadFile
from models.data import Upload
from models import schemas

UPLOAD_DIR = "uploads"

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

async def save_upload(db: Session, file: UploadFile):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    db_upload = Upload(filename=file.filename, path=file_path)
    db.add(db_upload)
    db.commit()
    db.refresh(db_upload)
    return db_upload
