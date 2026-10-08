import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.deps import require_admin
from app.models.user import User
from app.schemas.allocation import UserSummary
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=PaginatedResponse[UserSummary])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    _: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    offset = (page - 1) * page_size
    rows = await session.scalars(
        select(User)
        .where(User.is_active.is_(True))
        .order_by(User.name)
        .offset(offset)
        .limit(page_size)
    )
    items = list(rows)
    total = await session.scalar(
        select(func.count(User.id)).where(User.is_active.is_(True))
    )
    total_pages = max(1, math.ceil((total or 0) / page_size))
    return PaginatedResponse(
        items=items,
        total_items=total or 0,
        total_pages=total_pages,
        page=page,
        page_size=page_size,
    )
