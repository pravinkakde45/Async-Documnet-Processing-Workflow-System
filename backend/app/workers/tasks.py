import json
import time
import os
import redis
from celery.utils.log import get_task_logger
from app.core.celery_app import celery_app
from app.core.config import settings
from app.database.session import SessionLocal
from app.models.document import Document
from app.models.job import Job
from app.models.processed_result import ProcessedResult

logger = get_task_logger(__name__)

# Initialize Redis client for publishing events
redis_client = redis.Redis.from_url(settings.redis_url)

def publish_event(job_id: str, document_id: str, status: str, stage: str, progress: int, error: str = None):
    """Publish a state update event to the Redis Pub/Sub channel."""
    payload = {
        "job_id": job_id,
        "document_id": document_id,
        "status": status,
        "current_stage": stage,
        "progress": progress,
        "error_message": error
    }
    logger.info(f"Publishing stage {stage} ({progress}%) for job {job_id}")
    redis_client.publish("job_updates", json.dumps(payload))

@celery_app.task(bind=True, name="app.workers.tasks.process_document_task")
def process_document_task(self, job_id: str, document_id: str):
    logger.info(f"Starting background job {job_id} for document {document_id}")
    db = SessionLocal()
    
    try:
        # Retrieve Job and Document details
        job = db.query(Job).filter(Job.id == job_id).first()
        doc = db.query(Document).filter(Document.id == document_id).first()
        
        if not job or not doc:
            raise ValueError("Job or Document not found in database.")
        
        # Helper to update Database status and trigger Pub/Sub broadcast
        def update_stage(status: str, stage: str, progress: int, error: str = None):
            job.status = status
            job.current_stage = stage
            job.progress = progress
            if error:
                job.error_message = error
            db.commit()
            publish_event(job_id, document_id, status, stage, progress, error)

        # Stage 1: Document Received
        update_stage("PROCESSING", "DOCUMENT_RECEIVED", 15)
        time.sleep(1.5)

        # Stage 2: Parsing Started
        update_stage("PROCESSING", "PARSING_STARTED", 30)
        time.sleep(1.5)

        # Simulating document failure for files containing "fail" or "error" in their names
        if "fail" in doc.filename.lower() or "error" in doc.filename.lower():
            raise Exception("Simulated document parsing failure: Malformed structure detected.")

        # Stage 3: Parsing Completed
        update_stage("PROCESSING", "PARSING_COMPLETED", 50)
        time.sleep(1.5)

        # Stage 4: Field Extraction Started
        update_stage("PROCESSING", "FIELD_EXTRACTION_STARTED", 70)
        time.sleep(1.5)

        # Stage 5: Field Extraction Completed
        file_ext = os.path.splitext(doc.filename)[1].lower() or ".unknown"
        fname = doc.filename.lower()
        
        if any(w in fname for w in ["invoice", "receipt", "bill", "payment"]):
            category = "Financial"
            title = f"Invoice Analysis: {doc.filename}"
        elif any(w in fname for w in ["resume", "cv", "hire", "employee"]):
            category = "Human Resources"
            title = f"Resume Extraction: {doc.filename}"
        elif any(w in fname for w in ["contract", "agreement", "nda", "terms"]):
            category = "Legal"
            title = f"Legal Document Review: {doc.filename}"
        else:
            category = "General"
            title = f"Processed Document: {doc.filename}"
            
        summary = (
            f"This is an automated summary of the uploaded document '{doc.filename}'. "
            f"The file size is {doc.file_size} bytes with a content type of '{doc.content_type}'. "
            f"The background workflow classified it as a '{category}' document. "
            f"Review the extracted attributes and finalize the results to enable exporting."
        )
        
        keywords = ["extracted", category.lower(), file_ext.replace(".", ""), "async-system"]
        
        mock_metadata = {
            "char_count": len(summary) * 5,
            "word_count": len(summary.split()),
            "confidence_score": 0.96,
            "parser_version": "v1.2.0-beta",
            "file_extension": file_ext
        }
        
        update_stage("PROCESSING", "FIELD_EXTRACTION_COMPLETED", 85)
        time.sleep(1.5)

        # Stage 6: Store Final Result
        result = ProcessedResult(
            document_id=doc.id,
            job_id=job.id,
            title=title,
            category=category,
            summary=summary,
            keywords=keywords,
            metadata_json=mock_metadata,
            is_finalized=False
        )
        db.add(result)
        db.commit()
        
        update_stage("PROCESSING", "STORE_FINAL_RESULT", 95)
        time.sleep(1.0)

        # Stage 7: Job Completed
        update_stage("COMPLETED", "JOB_COMPLETED", 100)
        
    except Exception as e:
        logger.error(f"Error processing job {job_id}: {str(e)}")
        db.rollback()
        
        try:
            # Reload job entry to set failure status
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                job.status = "FAILED"
                job.current_stage = "JOB_FAILED"
                job.error_message = str(e)
                db.commit()
            publish_event(job_id, document_id, "FAILED", "JOB_FAILED", job.progress if job else 0, str(e))
        except Exception as inner_e:
            logger.error(f"Failed to save job failure state: {str(inner_e)}")
            
    finally:
        db.close()
