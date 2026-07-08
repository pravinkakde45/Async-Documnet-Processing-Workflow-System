from sqlalchemy.orm import Session
from sqlalchemy import desc
from uuid import UUID
from typing import List, Optional
from app.models.job import Job
from app.models.document import Document

class JobService:
    @staticmethod
    def create_job(db: Session, document_id: UUID) -> Job:
        # Create a job entry initialized at QUEUED status
        db_job = Job(
            document_id=document_id,
            status="QUEUED",
            current_stage="JOB_QUEUED",
            progress=0
        )
        db.add(db_job)
        db.commit()
        db.refresh(db_job)
        
        # Trigger the celery background task asynchronously
        from app.workers.tasks import process_document_task
        process_document_task.delay(str(db_job.id), str(document_id))
        
        return db_job

    @staticmethod
    def get_job(db: Session, job_id: UUID) -> Optional[Job]:
        return db.query(Job).filter(Job.id == job_id).first()

    @staticmethod
    def get_jobs(db: Session, skip: int = 0, limit: int = 100) -> List[Job]:
        return db.query(Job).order_by(desc(Job.created_at)).offset(skip).limit(limit).all()

    @staticmethod
    def retry_job(db: Session, job_id: UUID) -> Optional[Job]:
        old_job = db.query(Job).filter(Job.id == job_id).first()
        if not old_job:
            return None
        
        # Trigger a fresh Celery task running against the original document
        new_job = JobService.create_job(db, old_job.document_id)
        return new_job
