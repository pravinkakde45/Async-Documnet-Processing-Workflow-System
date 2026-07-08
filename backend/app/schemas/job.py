from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class JobBase(BaseModel):
    document_id: UUID
    status: str
    current_stage: str
    progress: int
    error_message: Optional[str] = None

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    status: Optional[str] = None
    current_stage: Optional[str] = None
    progress: Optional[int] = None
    error_message: Optional[str] = None

class JobResponse(JobBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
