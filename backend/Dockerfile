FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for compiling psycopg2 and general tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend codebase
COPY . .

# Ensure storage directories exist
RUN mkdir -p /app/shared_data/uploads

# Expose FastAPI port
EXPOSE 8000

# Ensure start script has executable permissions
RUN chmod +x start.sh

# Default CMD (can be overridden in docker-compose.yml for celery workers)
CMD ["sh", "start.sh"]
