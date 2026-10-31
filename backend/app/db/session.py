"""Database connection and session factory using SQLAlchemy 2.0 async."""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.config import get_settings

settings = get_settings()

# Engine creation parameters
engine_kwargs = {
    "echo": settings.DB_ECHO,
    "future": True,
}

if "sqlite" in settings.DATABASE_URL:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine: AsyncEngine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an async database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables. Safe for development auto-setup."""
    from app.models.base import Base
    import app.models.user  # noqa: F401
    import app.models.document  # noqa: F401
    import app.models.audit_log  # noqa: F401
    import app.models.approval  # noqa: F401
    import app.models.matching  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed demo Purchase Order and Goods Receipt for Three-Way Matching Agent
    from app.models.matching import PurchaseOrder, GoodsReceipt
    from sqlalchemy import select
    import uuid

    async with AsyncSessionLocal() as session:
        stmt = select(PurchaseOrder).where(PurchaseOrder.po_number == "PO-7788")
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            po = PurchaseOrder(
                id=str(uuid.uuid4()),
                po_number="PO-7788",
                vendor_name="Acme Industrial Supplies Inc.",
                total_amount=1500.00,
                currency="USD",
                status="OPEN",
                line_items=[
                    {"description": "Industrial Widgets", "quantity": 10.0, "unit_price": 150.0, "amount": 1500.0}
                ],
            )
            session.add(po)

            grn = GoodsReceipt(
                id=str(uuid.uuid4()),
                receipt_number="GRN-2026-7788",
                po_number="PO-7788",
                vendor_name="Acme Industrial Supplies Inc.",
                status="RECEIVED",
                line_items=[
                    {"description": "Industrial Widgets", "quantity_received": 10.0}
                ],
            )
            session.add(grn)
            await session.commit()


async def close_db() -> None:
    """Dispose database connections on application shutdown."""
    await engine.dispose()
