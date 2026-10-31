"""Celery configuration and application instance."""

import os
from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "securedoc_pipeline",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.pipeline_worker"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,        # 5 minutes max per task
    task_soft_time_limit=240,   # 4 minutes soft limit
    worker_prefetch_multiplier=1,
)
