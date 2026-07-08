from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import List, Dict, Any, Optional

class ProcessedResultBase(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    summary: Optional[str] = None
    keywords: List[str] = []
    metadata_json: Dict[str, Any] = {}

class ProcessedResultCreate(ProcessedResultBase):
    document_id: UUID
    job_id: UUID

class ProcessedResultUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    summary: Optional[str] = None
    keywords: Optional[List[str]] = None
    metadata_json: Optional[Dict[str, Any]] = None

class ProcessedResultResponse(ProcessedResultBase):
    id: UUID
    document_id: UUID
    job_id: UUID
    is_finalized: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
