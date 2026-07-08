from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from app.api.deps import get_db
from app.schemas.job import JobResponse
from app.services.job_service import JobService

router = APIRouter()

@router.get("", response_model=List[JobResponse])
def get_jobs(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Retrieve list of all processing jobs.
    """
    return JobService.get_jobs(db, skip=skip, limit=limit)

@router.get("/{id}", response_model=JobResponse)
def get_job(
    id: UUID,
    db: Session = Depends(get_db)
):
    """
    Retrieve details of a single processing job.
    """
    job = JobService.get_job(db, id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/{id}/retry", response_model=JobResponse)
def retry_job(
    id: UUID,
    db: Session = Depends(get_db)
):
    """
    Retry a failed processing job. This generates and launches a new job for the document.
    """
    new_job = JobService.retry_job(db, id)
    if not new_job:
        raise HTTPException(status_code=404, detail="Job not found to retry")
    return new_job
