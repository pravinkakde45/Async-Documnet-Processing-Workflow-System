from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from app.api.deps import get_db
from app.schemas.document import DocumentDetailsResponse, DocumentUpdate
from app.services.document_service import DocumentService

router = APIRouter()

@router.get("", response_model=List[DocumentDetailsResponse])
def get_documents(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Retrieve all documents with their latest job status and extracted results.
    """
    return DocumentService.get_all_document_details(db, skip=skip, limit=limit)

@router.get("/{id}", response_model=DocumentDetailsResponse)
def get_document(
    id: UUID,
    db: Session = Depends(get_db)
):
    """
    Retrieve details of a single document by its UUID.
    """
    details = DocumentService.get_document_details(db, id)
    if not details:
        raise HTTPException(status_code=404, detail="Document not found")
    return details

@router.put("/{id}", response_model=DocumentDetailsResponse)
def update_document(
    id: UUID,
    payload: DocumentUpdate,
    db: Session = Depends(get_db)
):
    """
    Edit extracted data for a specific document.
    """
    try:
        updated_details = DocumentService.update_document_data(
            db=db,
            document_id=id,
            filename=payload.filename,
            title=payload.title,
            category=payload.category,
            summary=payload.summary,
            keywords=payload.keywords,
            metadata_json=payload.metadata_json
        )
        if not updated_details:
            raise HTTPException(status_code=404, detail="Document or job result not found")
        return updated_details
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/finalize", response_model=DocumentDetailsResponse)
def finalize_document(
    id: UUID,
    db: Session = Depends(get_db)
):
    """
    Finalize the extracted metadata. Locks editing and updates job status to FINALIZED.
    """
    finalized_details = DocumentService.finalize_document(db=db, document_id=id)
    if not finalized_details:
        raise HTTPException(status_code=404, detail="Document or process result not found")
    return finalized_details
