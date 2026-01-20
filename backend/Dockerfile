# Backend Dockerfile for Django (moa_agriplan_system)

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project code
COPY . .

# 🔑 IMPORTANT: move into Django project root
WORKDIR /app/moa_agriplan_system

EXPOSE 8000

# Run Gunicorn
CMD ["gunicorn", "moa_agriplan_system.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
