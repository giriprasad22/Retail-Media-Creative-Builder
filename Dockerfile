# Railway Dockerfile for Retail Media Creative Builder
FROM python:3.11-slim

# Install system dependencies for OpenCV, rembg, and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies with memory optimization
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    rm -rf /root/.cache/pip

# Copy the rest of the application
COPY . .

# Create necessary directories
RUN mkdir -p backend/uploads backend/outputs backend/templates

# Set environment variables for memory optimization
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV MALLOC_ARENA_MAX=2
ENV OMP_NUM_THREADS=1
ENV OPENBLAS_NUM_THREADS=1
ENV MKL_NUM_THREADS=1

# Expose port (Railway uses PORT env variable)
EXPOSE 8080

# Start with optimized settings for low memory
CMD ["sh", "-c", "gunicorn --chdir backend app.main:app --bind 0.0.0.0:${PORT:-8080} --workers 1 --threads 1 --timeout 300 --max-requests 100 --max-requests-jitter 20"]
