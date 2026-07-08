from fastapi import APIRouter
from app.api.endpoints import upload, documents, jobs, export

api_router = APIRouter()

# Group routes by topic path prefixes
api_router.include_router(upload.router, prefix="/upload", tags=["Upload"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(export.router, prefix="/export", tags=["Export"])
