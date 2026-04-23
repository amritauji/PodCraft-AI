# Production-ready Dockerfile for PodCraft AI backend
FROM python:3.13-slim

WORKDIR /app

# Install system deps + uv
RUN apt-get update && apt-get install -y --no-install-recommends gcc curl \
    && curl -Ls https://astral.sh/uv/install.sh | sh \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.local/bin:$PATH"

COPY backend/requirements.txt ./backend/requirements.txt
RUN uv pip install --system --no-cache -r backend/requirements.txt

COPY backend ./backend
COPY frontend ./frontend

WORKDIR /app/backend

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
