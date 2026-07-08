import sys
import os

# Align python imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import SessionLocal
from app.models.document import Document
from app.models.job import Job
from app.models.processed_result import ProcessedResult
from app.workers.tasks import process_document_task
import redis

def run_tests():
    print("==================================================")
    print("RUNNING WORKFLOW INTEGRATION TESTS")
    print("==================================================")
    
    # 1. Test Redis connection
    print("\n[1/4] Checking Redis connectivity...")
    try:
        from app.core.config import settings
        r = redis.Redis.from_url(settings.redis_url)
        ping_res = r.ping()
        print(f"  Redis response: {ping_res} (Success)")
    except Exception as e:
        print(f"  FAILED: Could not ping Redis instance: {str(e)}")
        sys.exit(1)

    # 2. Test DB connection
    print("\n[2/4] Checking PostgreSQL database connectivity...")
    try:
        db = SessionLocal()
        count = db.query(Document).count()
        print(f"  Database connected! Current document count: {count}")
    except Exception as e:
        print(f"  FAILED: Could not query database: {str(e)}")
        sys.exit(1)
        
    # 3. Test Successful Task Execution
    print("\n[3/4] Testing successful document workflow simulation...")
    try:
        # Create mock document and job
        doc = Document(
            filename="test_invoice_sample.pdf",
            file_path="/app/shared_data/uploads/test_invoice_sample.pdf",
            file_size=1024,
            content_type="application/pdf"
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        
        job = Job(
            document_id=doc.id,
            status="QUEUED",
            current_stage="JOB_QUEUED",
            progress=0
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        
        print(f"  Created test Document (ID: {doc.id}) and Job (ID: {job.id})")
        print("  Running Celery task synchronously in-process via .apply()...")
        
        # Run task in-process for direct validation
        task_res = process_document_task.apply(args=[str(job.id), str(doc.id)])
        
        # Refresh db records
        db.refresh(job)
        result = db.query(ProcessedResult).filter(ProcessedResult.job_id == job.id).first()
        
        print(f"  Task execution status: {task_res.state}")
        print(f"  Job final status: {job.status}")
        print(f"  Job final stage: {job.current_stage}")
        print(f"  Job final progress: {job.progress}%")
        
        assert job.status == "COMPLETED", f"Expected COMPLETED, got {job.status}"
        assert job.progress == 100, f"Expected 100% progress, got {job.progress}"
        assert result is not None, "Expected ProcessedResult to be written, got None"
        print(f"  Extracted mock title: '{result.title}'")
        print(f"  Extracted mock category: '{result.category}'")
        print("  SUCCESS: Document processing workflow completed successfully!")
        
    except Exception as e:
        print(f"  FAILED: {str(e)}")
        sys.exit(1)
        
    # 4. Test Simulated Error Workflow
    print("\n[4/4] Testing simulated parser failure workflow...")
    try:
        # Create mock document with "fail" in name
        doc_fail = Document(
            filename="error_corrupted_doc.txt",
            file_path="/app/shared_data/uploads/error_corrupted_doc.txt",
            file_size=200,
            content_type="text/plain"
        )
        db.add(doc_fail)
        db.commit()
        db.refresh(doc_fail)
        
        job_fail = Job(
            document_id=doc_fail.id,
            status="QUEUED",
            current_stage="JOB_QUEUED",
            progress=0
        )
        db.add(job_fail)
        db.commit()
        db.refresh(job_fail)
        
        print(f"  Created fail Document (ID: {doc_fail.id}) and Job (ID: {job_fail.id})")
        print("  Running Celery task synchronously in-process...")
        
        process_document_task.apply(args=[str(job_fail.id), str(doc_fail.id)])
        
        # Refresh db records
        db.refresh(job_fail)
        
        print(f"  Job final status: {job_fail.status}")
        print(f"  Job final stage: {job_fail.current_stage}")
        print(f"  Job error log: '{job_fail.error_message}'")
        
        assert job_fail.status == "FAILED", f"Expected FAILED, got {job_fail.status}"
        assert job_fail.current_stage == "JOB_FAILED", f"Expected JOB_FAILED, got {job_fail.current_stage}"
        assert "Simulated document parsing failure" in job_fail.error_message, "Expected parser error message"
        print("  SUCCESS: Error workflow correctly handled and logged!")
        
    except Exception as e:
        print(f"  FAILED: {str(e)}")
        sys.exit(1)
        
    finally:
        db.close()
        
    print("\n==================================================")
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
