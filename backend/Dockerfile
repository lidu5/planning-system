# Backend Dockerfile for Django (moa_agriplan_system)

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies (you can add more here if your project needs them)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy project code
COPY . .

# Expose the port the app will run on
EXPOSE 8000

# Default command: run Django with Gunicorn
# Adjust module path if your wsgi module is different
CMD ["gunicorn", "moa_agriplan_system.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
