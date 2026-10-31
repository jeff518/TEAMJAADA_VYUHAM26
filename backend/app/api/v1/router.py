"""Main v1 API router aggregating all resource sub-routers."""

from fastapi import APIRouter

from app.api.v1.approval import router as approval_router
from app.api.v1.audit import router as audit_router
from app.api.v1.auth import router as auth_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.documents import router as documents_router
from app.api.v1.processing import router as processing_router
from app.api.v1.upload import router as upload_router
from app.api.v1.handoff import router as handoff_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(upload_router)
api_router.include_router(documents_router)
api_router.include_router(processing_router)
api_router.include_router(approval_router)
api_router.include_router(audit_router)
api_router.include_router(dashboard_router)
api_router.include_router(handoff_router)
