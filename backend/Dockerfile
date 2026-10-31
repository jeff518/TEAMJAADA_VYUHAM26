# ==========================================
# Stage 1: Base Builder
# ==========================================
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libmagic1 \
    libgl1 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ==========================================
# Stage 2: Production Runtime
# ==========================================
FROM python:3.11-slim AS runner

WORKDIR /app

# Install minimal runtime libraries (libmagic for python-magic, libgl for OpenCV/Paddle)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    clamav-client \
    && rm -rf /var/lib/apt/lists/*

# Copy installed wheels from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Copy application source code
COPY . /app/

# Create quarantine and processed directories
RUN mkdir -p /app/quarantine /app/processed /app/sandbox_tmp && \
    chmod 700 /app/quarantine /app/sandbox_tmp

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
