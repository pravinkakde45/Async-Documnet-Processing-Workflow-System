from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.schemas.job import JobResponse
from app.schemas.processed_result import ProcessedResultResponse

class DocumentBase(BaseModel):
    filename: str
    file_size: int
    content_type: str

class DocumentCreate(DocumentBase):
    file_path: str

class DocumentUpdate(BaseModel):
    filename: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    summary: Optional[str] = None
    keywords: Optional[List[str]] = None
    metadata_json: Optional[dict] = None

class DocumentResponse(DocumentBase):
    id: UUID
    file_path: str
    created_at: datetime
    updated_at: datetime
    jobs: List[JobResponse] = []
    processed_results: List[ProcessedResultResponse] = []

    class Config:
        from_attributes = True

class DocumentDetailsResponse(BaseModel):
    id: UUID
    filename: str
    file_size: int
    content_type: str
    created_at: datetime
    updated_at: datetime
    latest_job: Optional[JobResponse] = None
    processed_result: Optional[ProcessedResultResponse] = None

    class Config:
        from_attributes = True
