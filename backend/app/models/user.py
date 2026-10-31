"""User model with role-based access control."""

import enum
from typing import List, Optional
from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CommonMixin


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    REVIEWER = "reviewer"
    USER = "user"


class User(Base, CommonMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, values_callable=lambda obj: [e.value for e in obj]),
        default=UserRole.USER,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    api_key: Mapped[Optional[str]] = mapped_column(String(64), unique=True, index=True, nullable=True)

    # Relationships
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="uploader", cascade="all, delete-orphan")
    approvals: Mapped[List["ApprovalRecord"]] = relationship("ApprovalRecord", back_populates="user")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="user")

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username} role={self.role}>"
