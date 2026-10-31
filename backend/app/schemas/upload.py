"""Upload schemas supporting standard and chunked uploads."""

from typing import Optional
from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    file_size: int
    mime_type: str
    sha256_hash: str
    status: str
    message: str


class ChunkInitRequest(BaseModel):
    filename: str
    total_size: int = Field(..., gt=0)
    total_chunks: int = Field(..., gt=0)
    mime_type: Optional[str] = "application/pdf"


class ChunkInitResponse(BaseModel):
    upload_id: str
    chunk_size: int
    total_chunks: int


class UploadStatusResponse(BaseModel):
    upload_id: str
    chunks_received: int
    total_chunks: int
    is_complete: bool
    document_id: Optional[str] = None
