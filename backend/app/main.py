import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.router import api_router
from app.api.ws import router as ws_router, redis_pubsub_listener
from app.database.session import engine
from app.database.base import Base

# Setup logging config
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# Create tables in PostgreSQL during app bootstrap
try:
    Base.metadata.create_all(bind=engine)
    logger.info("PostgreSQL database schemas created/verified successfully.")
except Exception as e:
    logger.error(f"Critical error initializing database tables: {str(e)}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start background Redis Pub/Sub monitoring task
    listener_task = asyncio.create_task(redis_pubsub_listener())
    logger.info("FastAPI application initialized. Redis monitor task running in background.")
    
    yield
    
    # Shutdown: Cancel the listener task and clean up resources
    listener_task.cancel()
    try:
        await listener_task
    except asyncio.CancelledError:
        logger.info("Redis listener task successfully cancelled on shutdown.")
    except Exception as e:
        logger.error(f"Error during Redis listener shutdown cleanup: {str(e)}")
    logger.info("FastAPI application shutdown complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

# CORS middleware to allow connection from the React Vite frontend app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount core HTTP API endpoints
app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount WebSocket endpoint
app.include_router(ws_router, prefix="/api/ws")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "docs_url": "/docs"
    }
