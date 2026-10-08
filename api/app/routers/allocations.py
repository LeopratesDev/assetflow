from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.schemas.allocation import (
    AllocationCreate,
    AllocationResponse,
    AllocationReturn,
)
from app.schemas.common import PaginatedResponse
from app.services import allocation_service

router = APIRouter(prefix="/allocations", tags=["Allocations"])


@router.post("", response_model=AllocationResponse, status_code=status.HTTP_201_CREATED)
async def create_allocation(
    data: AllocationCreate,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin),
):
    return await allocation_service.create_allocation(session, data)


@router.patch("/{allocation_id}/return", response_model=AllocationResponse)
async def return_allocation(
    allocation_id: str,
    data: AllocationReturn,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin),
):
    return await allocation_service.return_allocation(session, allocation_id, data)


@router.get("", response_model=PaginatedResponse[AllocationResponse])
async def list_allocations(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    active_only: bool | None = Query(None, alias="active"),
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    return await allocation_service.list_allocations(
        session, page, page_size, active_only
    )


@router.get(
    "/assets/{asset_id}/history",
    response_model=PaginatedResponse[AllocationResponse],
)
async def get_asset_history(
    asset_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    return await allocation_service.get_asset_history(
        session, asset_id, page, page_size
    )


@router.get(
    "/users/{user_id}/allocations",
    response_model=PaginatedResponse[AllocationResponse],
)
async def get_user_allocations(
    user_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    return await allocation_service.get_user_allocations(
        session, user_id, page, page_size
    )
