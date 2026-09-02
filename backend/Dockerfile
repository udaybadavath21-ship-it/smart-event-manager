# ==============================================================================
# Smart Event Manager — Backend Dockerfile
# Production-ready Python 3.11 ASGI service
# ==============================================================================

FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Expose backend API port
EXPOSE 8000

# Health check against production health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start ASGI application with Uvicorn (or Gunicorn worker on Linux)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
