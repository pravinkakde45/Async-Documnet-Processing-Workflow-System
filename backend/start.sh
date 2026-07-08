#!/bin/sh

# 1. Start Celery worker process in the background
echo "Starting Celery worker process in the background..."
celery -A app.core.celery_app.celery_app worker --loglevel=info &

# 2. Start FastAPI server in the foreground
# Render automatically injects the PORT environment variable for Web Services
echo "Starting FastAPI server on port $PORT..."
uvicorn app.main:app --host 0.0.0.0 --port $PORT
