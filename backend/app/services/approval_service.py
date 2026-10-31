"""Approval workflow service for manual reviews, verifications, and approvals."""

import logging
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DocumentNotFoundException, SecureDocBaseException
from app.models.approval import ApprovalAction, ApprovalRecord
from app.models.document import Document, DocumentStatus
from app.models.user import User
from app.services.audit_service import AuditService

logger = logging.getLogger("securedoc.approval")


class ApprovalService:
    """Manages document human review workflows and escalation states."""

    @classmethod
    async def process_action(
        cls,
        db: AsyncSession,
        document_id: str,
        user: User,
        action: ApprovalAction,
        comment: Optional[str] = None,
        escalation_level: int = 1,
    ) -> Document:
        """Apply an approval, rejection, or verification request to a document."""
        stmt = select(Document).where(Document.id == document_id)
        res = await db.execute(stmt)
        doc = res.scalar_one_or_none()

        if not doc:
            raise DocumentNotFoundException(document_id)

        # Record action
        record = ApprovalRecord(
            document_id=doc.id,
            user_id=user.id,
            action=action,
            comment=comment,
            escalation_level=escalation_level,
        )
        db.add(record)

        # Update document status based on action
        if action == ApprovalAction.APPROVE:
            doc.status = DocumentStatus.APPROVED
            doc.status_message = f"Approved by {user.username} ({user.role.value})"
        elif action == ApprovalAction.REJECT:
            doc.status = DocumentStatus.REJECTED
            doc.status_message = f"Rejected by {user.username}: {comment or 'No comment provided'}"
        elif action == ApprovalAction.REQUEST_VERIFICATION:
            doc.status = DocumentStatus.VERIFICATION_REQUESTED
            doc.status_message = f"Verification requested by {user.username} (Level {escalation_level}): {comment or 'Needs verification'}"

        await db.commit()
        await db.refresh(doc)

        # Audit log the approval action with cryptographic hash chain
        await AuditService.log_action(
            db=db,
            action=f"DOCUMENT_{action.value.upper()}",
            user_id=user.id,
            document_id=doc.id,
            details={
                "action": action.value,
                "comment": comment,
                "escalation_level": escalation_level,
                "user_role": user.role.value,
                "new_status": doc.status.value,
            },
        )

        logger.info("Document %s transitioned to %s by user %s", doc.id, doc.status.value, user.username)
        return doc
