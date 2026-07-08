import os
from sqlalchemy.orm import Session
from sqlalchemy import desc
from uuid import UUID
from typing import List, Optional, Dict, Any
from app.models.document import Document
from app.models.job import Job
from app.models.processed_result import ProcessedResult

class DocumentService:
    @staticmethod
    def create_document(db: Session, filename: str, file_path: str, file_size: int, content_type: str) -> Document:
        db_doc = Document(
            filename=filename,
            file_path=file_path,
            file_size=file_size,
            content_type=content_type
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)
        return db_doc

    @staticmethod
    def get_document(db: Session, document_id: UUID) -> Optional[Document]:
        return db.query(Document).filter(Document.id == document_id).first()

    @staticmethod
    def get_documents(db: Session, skip: int = 0, limit: int = 100) -> List[Document]:
        return db.query(Document).order_by(desc(Document.created_at)).offset(skip).limit(limit).all()

    @staticmethod
    def get_document_details(db: Session, document_id: UUID) -> Optional[Dict[str, Any]]:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return None
        
        # Get latest job
        latest_job = db.query(Job).filter(Job.document_id == document_id).order_by(desc(Job.created_at)).first()
        
        # Get processed result
        processed_result = None
        if latest_job:
            processed_result = db.query(ProcessedResult).filter(
                ProcessedResult.document_id == document_id,
                ProcessedResult.job_id == latest_job.id
            ).first()
            
        return {
            "id": doc.id,
            "filename": doc.filename,
            "file_size": doc.file_size,
            "content_type": doc.content_type,
            "created_at": doc.created_at,
            "updated_at": doc.updated_at,
            "latest_job": latest_job,
            "processed_result": processed_result
        }

    @staticmethod
    def get_all_document_details(db: Session, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        docs = db.query(Document).order_by(desc(Document.created_at)).offset(skip).limit(limit).all()
        results = []
        for doc in docs:
            latest_job = db.query(Job).filter(Job.document_id == doc.id).order_by(desc(Job.created_at)).first()
            processed_result = None
            if latest_job:
                processed_result = db.query(ProcessedResult).filter(
                    ProcessedResult.document_id == doc.id,
                    ProcessedResult.job_id == latest_job.id
                ).first()
            results.append({
                "id": doc.id,
                "filename": doc.filename,
                "file_size": doc.file_size,
                "content_type": doc.content_type,
                "created_at": doc.created_at,
                "updated_at": doc.updated_at,
                "latest_job": latest_job,
                "processed_result": processed_result
            })
        return results

    @staticmethod
    def update_document_data(
        db: Session, 
        document_id: UUID, 
        filename: Optional[str] = None,
        title: Optional[str] = None,
        category: Optional[str] = None,
        summary: Optional[str] = None,
        keywords: Optional[List[str]] = None,
        metadata_json: Optional[dict] = None
    ) -> Optional[Dict[str, Any]]:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return None
        
        if filename is not None:
            doc.filename = filename
            
        # Update latest processed result
        latest_job = db.query(Job).filter(Job.document_id == document_id).order_by(desc(Job.created_at)).first()
        if latest_job:
            result = db.query(ProcessedResult).filter(
                ProcessedResult.document_id == document_id,
                ProcessedResult.job_id == latest_job.id
            ).first()
            if result:
                if result.is_finalized:
                    raise ValueError("Cannot update finalized document results")
                if title is not None:
                    result.title = title
                if category is not None:
                    result.category = category
                if summary is not None:
                    result.summary = summary
                if keywords is not None:
                    result.keywords = keywords
                if metadata_json is not None:
                    result.metadata_json = metadata_json
                    
        db.commit()
        return DocumentService.get_document_details(db, document_id)

    @staticmethod
    def finalize_document(db: Session, document_id: UUID) -> Optional[Dict[str, Any]]:
        latest_job = db.query(Job).filter(Job.document_id == document_id).order_by(desc(Job.created_at)).first()
        if not latest_job:
            return None
            
        result = db.query(ProcessedResult).filter(
            ProcessedResult.document_id == document_id,
            ProcessedResult.job_id == latest_job.id
        ).first()
        
        if not result:
            return None
            
        result.is_finalized = True
        latest_job.status = "FINALIZED"
        db.commit()
        return DocumentService.get_document_details(db, document_id)
