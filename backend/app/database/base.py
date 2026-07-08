# Import all models so they register on Base
from app.database.session import Base
from app.models.document import Document
from app.models.job import Job
from app.models.processed_result import ProcessedResult
