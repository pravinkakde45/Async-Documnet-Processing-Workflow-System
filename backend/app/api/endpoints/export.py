import csv
import json
import io
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.models.processed_result import ProcessedResult
from app.models.document import Document

router = APIRouter()

def get_finalized_data(db: Session):
    """Helper to query finalized processed results and join document metadata."""
    results = (
        db.query(ProcessedResult, Document)
        .join(Document, ProcessedResult.document_id == Document.id)
        .filter(ProcessedResult.is_finalized == True)
        .all()
    )
    
    data_list = []
    for res, doc in results:
        data_list.append({
            "document_id": str(doc.id),
            "filename": doc.filename,
            "file_size_bytes": doc.file_size,
            "content_type": doc.content_type,
            "title": res.title,
            "category": res.category,
            "summary": res.summary,
            "keywords": res.keywords,
            "metadata_json": res.metadata_json,
            "finalized_at": res.updated_at.isoformat()
        })
    return data_list

@router.get("/json")
def export_json(db: Session = Depends(get_db)):
    """
    Export finalized data as JSON.
    Returns a downloadable JSON file.
    """
    data = get_finalized_data(db)
    json_content = json.dumps(data, indent=2)
    
    return Response(
        content=json_content,
        media_type="application/json",
        headers={
            "Content-Disposition": "attachment; filename=finalized_documents.json"
        }
    )

@router.get("/csv")
def export_csv(db: Session = Depends(get_db)):
    """
    Export finalized data as CSV.
    Returns a downloadable CSV spreadsheet.
    """
    data = get_finalized_data(db)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Document ID", "Filename", "File Size (Bytes)", "Content Type", 
        "Title", "Category", "Summary", "Keywords", "Extracted Metadata", "Finalized At"
    ])
    
    for row in data:
        keywords_str = ", ".join(row["keywords"])
        meta_str = json.dumps(row["metadata_json"])
        writer.writerow([
            row["document_id"],
            row["filename"],
            row["file_size_bytes"],
            row["content_type"],
            row["title"],
            row["category"],
            row["summary"],
            keywords_str,
            meta_str,
            row["finalized_at"]
        ])
        
    csv_content = output.getvalue()
    output.close()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=finalized_documents.csv"
        }
    )
