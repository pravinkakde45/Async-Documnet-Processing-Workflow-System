import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.core.config import settings
from app.services.document_service import DocumentService
from app.services.job_service import JobService
from app.schemas.document import DocumentDetailsResponse

router = APIRouter()

MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB max file upload size restriction

@router.post("", response_model=List[DocumentDetailsResponse])
async def upload_documents(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload one or multiple documents.
    Validates file sizes, saves them to disk with unique names, 
    records metadata in PostgreSQL, and enqueues background processing jobs.
    """
    results = []
    
    # Ensure storage folders are initialized
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    for file in files:
        # Read the file content to measure size
        content = await file.read()
        file_size = len(content)
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"File '{file.filename}' exceeds the maximum allowed size of 15MB."
            )
            
        # Reset file cursor for safety
        await file.seek(0)
        
        # Formulate unique disk file path to prevent collisions
        unique_id = uuid.uuid4()
        file_ext = os.path.splitext(file.filename)[1]
        stored_filename = f"{unique_id}{file_ext}"
        file_path = os.path.join(settings.UPLOAD_DIR, stored_filename)
        
        try:
            with open(file_path, "wb") as f:
                f.write(content)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed writing '{file.filename}' to disk storage: {str(e)}"
            )
            
        # Write to PostgreSQL DB
        doc = DocumentService.create_document(
            db=db,
            filename=file.filename,
            file_path=file_path,
            file_size=file_size,
            content_type=file.content_type or "application/octet-stream"
        )
        
        # Enqueue processing job (spawns Celery background worker)
        JobService.create_job(db=db, document_id=doc.id)
        
        # Retrieve full details matching the schema
        details = DocumentService.get_document_details(db, doc.id)
        if details:
            results.append(details)
        
    return results
