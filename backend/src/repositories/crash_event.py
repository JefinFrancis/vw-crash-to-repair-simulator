"""Repository for crash event database operations."""

from typing import Optional, List
from sqlalchemy import select, delete, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.crash_event import CrashEvent


class CrashEventRepository:
    """Repository for CrashEvent model — simple CRUD without BaseRepository overhead."""

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def create(self, crash_event: CrashEvent) -> CrashEvent:
        """Persist a new crash event."""
        self.db_session.add(crash_event)
        await self.db_session.flush()
        await self.db_session.refresh(crash_event)
        return crash_event

    async def get_by_crash_id(self, crash_id: str) -> Optional[CrashEvent]:
        """Get a crash event by its crash_id string."""
        result = await self.db_session.execute(
            select(CrashEvent).where(CrashEvent.crash_id == crash_id)
        )
        return result.scalar_one_or_none()

    async def get_latest(self) -> Optional[CrashEvent]:
        """Get the most recent crash event."""
        result = await self.db_session.execute(
            select(CrashEvent).order_by(desc(CrashEvent.created_at)).limit(1)
        )
        return result.scalar_one_or_none()

    async def get_history(self, limit: int = 10, offset: int = 0) -> List[CrashEvent]:
        """Get crash events ordered by most recent first."""
        result = await self.db_session.execute(
            select(CrashEvent)
            .order_by(desc(CrashEvent.created_at))
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count(self) -> int:
        """Count total crash events."""
        result = await self.db_session.execute(
            select(func.count(CrashEvent.id))
        )
        return result.scalar() or 0

    async def delete_by_crash_id(self, crash_id: str) -> bool:
        """Delete a crash event by crash_id. Returns True if deleted."""
        result = await self.db_session.execute(
            delete(CrashEvent).where(CrashEvent.crash_id == crash_id)
        )
        return result.rowcount > 0

    async def clear_all(self) -> int:
        """Delete all crash events. Returns count deleted."""
        result = await self.db_session.execute(delete(CrashEvent))
        return result.rowcount
