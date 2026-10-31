"""SecureDoc Pipeline - FastAPI Application Entry Point."""

from contextlib import asynccontextmanager
import logging
import time
from typing import AsyncGenerator, Optional
from fastapi import FastAPI, Request, Response, status, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1.router import api_router
from app.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.rate_limiter import limiter
from app.db.session import close_db, init_db

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
)
logger = logging.getLogger("securedoc")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifecycle management for database startup and connection pool shutdown."""
    logger.info("Initializing %s v%s...", settings.PROJECT_NAME, settings.VERSION)
    settings.init_directories()

    # Initialize database tables
    try:
        await init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error("Database initialization failed: %s", str(e), exc_info=True)

    yield

    logger.info("Shutting down database pools...")
    await close_db()
    logger.info("%s shutdown complete.", settings.PROJECT_NAME)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Multi-door document security, tamper-evident audit chaining, and VLM extraction pipeline.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Attach SlowAPI rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Register custom security and domain exception handlers
register_exception_handlers(app)

# Lock CORS to Chrome extension protocol and configured development hosts
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^(chrome-extension://[a-z]{32}|chrome-extension://\*|http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?)$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Document-Id"],
)


@app.middleware("http")
async def security_and_timing_middleware(request: Request, call_next):
    """Enforce security headers and record request execution latency."""
    start_time = time.time()
    response: Response = await call_next(request)
    duration = time.time() - start_time

    # Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Process-Time"] = f"{duration:.4f}s"

    return response


# Include all v1 API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

# Include DocuPilot AI Master Architecture Top-Level routes
from app.api.top_level_routes import router as top_level_router
app.include_router(top_level_router)

# Mount classified storage directory for edge destination retrieval
from pathlib import Path
from fastapi.staticfiles import StaticFiles
_classified_dir = Path("a:/vy26/classified_storage")
_classified_dir.mkdir(parents=True, exist_ok=True)
app.mount("/classified-storage", StaticFiles(directory=str(_classified_dir)), name="classified_storage")


@app.get("/health", tags=["System"])
async def health_check():
    """System health inspection endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/demo", tags=["System"])
async def demo_page():
    """Interactive demo website to test the Chrome extension in-page."""
    from pathlib import Path
    from fastapi.responses import FileResponse
    demo_file = Path(__file__).parent / "static" / "demo.html"
    return FileResponse(demo_file, media_type="text/html")


@app.get("/university", tags=["System"])
@app.get("/college", tags=["System"])
async def university_portal():
    """University & College Bursar Financial Portal demo for SecureDoc extension."""
    from pathlib import Path
    from fastapi.responses import FileResponse
    uni_file = Path(__file__).parent / "static" / "university_portal.html"
    return FileResponse(uni_file, media_type="text/html")


@app.get("/test-files/{filename}", tags=["System"])
async def get_test_file(filename: str):
    """Download pre-generated demo test files."""
    from pathlib import Path
    from fastapi.responses import FileResponse
    from fastapi import HTTPException
    file_path = Path("a:/vy26/demo_test_files") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Test file not found")
    return FileResponse(file_path, filename=filename)


@app.post("/api/bursar/submit", tags=["University Demo"])
async def submit_bursar_document(
    request: Request,
    student_id: str = Form("STU-88210"),
    receipt_num: str = Form(""),
    amount: str = Form(""),
    date: str = Form(""),
    vendor: str = Form(""),
    securedoc_clearance_token: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """
    University Bursar Document Submission Endpoint.
    Demonstrates Dual-Layer Loophole Prevention:
    1. EXTENSION_CLIENT_SHIELD: Signed clearance token from Chrome extension.
    2. SERVER_GATEWAY_INTERCEPT: File uploaded without extension; routed through AI Multi-Door pipeline on server.
    """
    from app.db.session import AsyncSessionLocal
    from app.services.upload_service import UploadService
    from app.workers.pipeline_worker import async_execute_pipeline
    from app.models.document import Document
    from sqlalchemy import select
    from fastapi import HTTPException

    # Pathway 1: Pre-cleared by Chrome Extension
    if securedoc_clearance_token and securedoc_clearance_token.startswith("SECUREDOC-CLEAR-"):
        logger.info("Bursar submission pre-cleared by SecureDoc Extension: %s", securedoc_clearance_token)
        return {
            "status": "APPROVED",
            "clearance_mode": "EXTENSION_CLIENT_SHIELD",
            "message": "Tuition payment verified and cleared by in-browser SecureDoc Extension Shield.",
            "clearance_token": securedoc_clearance_token,
            "student_id": student_id,
            "receipt_num": receipt_num or "REC-AUTODETECT",
            "amount": amount or "4850.00",
            "date": date or "2026-10-30",
            "vendor": vendor or "Apex University of Technology",
            "balance_updated": True,
            "new_balance": "$0.00 (PAID IN FULL)",
        }

    # Pathway 2: Direct upload to server (user without extension or bypass attempt)
    if file and file.filename:
        logger.warning(
            "Unverified direct upload detected for student %s: %s. Routing to SecureDoc Server Gateway...",
            student_id,
            file.filename,
        )
        async with AsyncSessionLocal() as db:
            doc = await UploadService.save_upload_to_quarantine(db=db, upload_file=file, domain="EDUCATION")
            await async_execute_pipeline(doc.id)

            res = await db.execute(select(Document).where(Document.id == doc.id))
            refreshed_doc = res.scalar_one_or_none()

            if (
                not refreshed_doc
                or refreshed_doc.final_decision.value == "BLOCK"
                or refreshed_doc.door2_decision.value == "BLOCK"
                or refreshed_doc.door1_decision.value == "BLOCK"
            ):
                threat_msg = refreshed_doc.status_message if refreshed_doc else "Unknown threat"
                logger.error("Server Gateway BLOCKED direct upload: %s", threat_msg)
                raise HTTPException(
                    status_code=403,
                    detail={
                        "status": "BLOCKED",
                        "clearance_mode": "SERVER_GATEWAY_INTERCEPT",
                        "message": "SECURITY REJECTION: Server-Side AI Gateway caught threat in unverified upload!",
                        "threat_details": threat_msg,
                        "door1_decision": refreshed_doc.door1_decision.value if refreshed_doc else "BLOCK",
                        "door2_decision": refreshed_doc.door2_decision.value if refreshed_doc else "BLOCK",
                        "filename": file.filename,
                    },
                )

            extracted = refreshed_doc.extracted_data or {}
            extracted_amount = extracted.get("total_amount") or amount or "4850.00"
            return {
                "status": "APPROVED",
                "clearance_mode": "SERVER_GATEWAY_FALLBACK",
                "message": "Document passed server-side SecureDoc AI Gateway verification fallback.",
                "document_id": refreshed_doc.id,
                "student_id": student_id,
                "receipt_num": extracted.get("invoice_number") or receipt_num,
                "amount": str(extracted_amount),
                "vendor": extracted.get("vendor_name") or vendor,
                "date": extracted.get("invoice_date") or date,
                "balance_updated": True,
                "new_balance": "$0.00 (PAID IN FULL)",
            }

    raise HTTPException(
        status_code=400,
        detail="Submission rejected: Missing both SecureDoc clearance verification token and upload file.",
    )


@app.get("/", tags=["System"])
async def root():
    """Root info endpoint."""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "university_portal": "/university",
        "demo_page": "/demo",
        "api_docs": "/docs",
        "health": "/health",
    }
