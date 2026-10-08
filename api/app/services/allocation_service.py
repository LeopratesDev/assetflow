import math

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.allocation import Allocation
from app.models.asset import Asset
from app.models.user import User
from app.schemas.allocation import (
    AllocationCreate,
    AllocationResponse,
    AllocationReturn,
)
from app.schemas.common import PaginatedResponse


def _allocation_query():
    return select(Allocation).options(
        selectinload(Allocation.asset),
        selectinload(Allocation.user),
    )


async def _get_allocation_or_404(
    session: AsyncSession, allocation_id: str
) -> Allocation:
    row = await session.scalar(
        _allocation_query().where(Allocation.id == allocation_id)
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alocação não encontrada",
        )
    return row


async def create_allocation(
    session: AsyncSession, data: AllocationCreate
) -> AllocationResponse:
    # Regra 1: ativo deve existir
    asset = await session.get(Asset, data.asset_id)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ativo não encontrado",
        )

    # Regra 2: ativo deve estar disponível
    if asset.status != "available":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Ativo não está disponível para alocação"
                f" (status atual: {asset.status})"
            ),
        )

    # Regra 3: não pode haver alocação ativa simultânea para o mesmo ativo
    existing = await session.scalar(
        select(Allocation).where(
            Allocation.asset_id == data.asset_id,
            Allocation.returned_at.is_(None),
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este ativo já possui uma alocação ativa",
        )

    # Regra 4: usuário deve existir e estar ativo
    user = await session.get(User, data.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível alocar ativo para usuário inativo",
        )

    allocation = Allocation(
        asset_id=data.asset_id,
        user_id=data.user_id,
        allocated_at=data.allocated_at,
        notes=data.notes,
    )
    asset.status = "allocated"

    session.add(allocation)
    await session.flush()

    full = await _get_allocation_or_404(session, allocation.id)
    return AllocationResponse.model_validate(full)


async def return_allocation(
    session: AsyncSession,
    allocation_id: str,
    data: AllocationReturn,
) -> AllocationResponse:
    allocation = await _get_allocation_or_404(session, allocation_id)

    if not allocation.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta alocação já foi encerrada",
        )

    if data.returned_at < allocation.allocated_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="A data de devolução não pode ser anterior à data de alocação",
        )

    allocation.returned_at = data.returned_at
    if data.notes:
        allocation.notes = data.notes

    # Devolução libera o ativo
    asset = await session.get(Asset, allocation.asset_id)
    if asset:
        asset.status = "available"

    await session.flush()

    full = await _get_allocation_or_404(session, allocation_id)
    return AllocationResponse.model_validate(full)


async def list_allocations(
    session: AsyncSession,
    page: int = 1,
    page_size: int = 10,
    active_only: bool | None = None,
) -> PaginatedResponse[AllocationResponse]:
    query = _allocation_query()
    if active_only is True:
        query = query.where(Allocation.returned_at.is_(None))
    elif active_only is False:
        query = query.where(Allocation.returned_at.isnot(None))

    count_q = select(func.count()).select_from(query.subquery())
    total = await session.scalar(count_q) or 0

    offset = (page - 1) * page_size
    rows = (
        await session.execute(query.offset(offset).limit(page_size))
    ).scalars().all()

    return PaginatedResponse(
        items=[AllocationResponse.model_validate(r) for r in rows],
        total_items=total,
        total_pages=math.ceil(total / page_size) if total else 0,
        page=page,
        page_size=page_size,
    )


async def get_asset_history(
    session: AsyncSession,
    asset_id: str,
    page: int = 1,
    page_size: int = 10,
) -> PaginatedResponse[AllocationResponse]:
    asset = await session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ativo não encontrado",
        )

    base_q = _allocation_query().where(Allocation.asset_id == asset_id)
    count_q = select(func.count()).select_from(base_q.subquery())
    total = await session.scalar(count_q) or 0
    offset = (page - 1) * page_size
    rows = (
        await session.execute(base_q.offset(offset).limit(page_size))
    ).scalars().all()

    return PaginatedResponse(
        items=[AllocationResponse.model_validate(r) for r in rows],
        total_items=total,
        total_pages=math.ceil(total / page_size) if total else 0,
        page=page,
        page_size=page_size,
    )


async def get_user_allocations(
    session: AsyncSession,
    user_id: str,
    page: int = 1,
    page_size: int = 10,
) -> PaginatedResponse[AllocationResponse]:
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    base_q = _allocation_query().where(Allocation.user_id == user_id)
    count_q = select(func.count()).select_from(base_q.subquery())
    total = await session.scalar(count_q) or 0
    offset = (page - 1) * page_size
    rows = (
        await session.execute(base_q.offset(offset).limit(page_size))
    ).scalars().all()

    return PaginatedResponse(
        items=[AllocationResponse.model_validate(r) for r in rows],
        total_items=total,
        total_pages=math.ceil(total / page_size) if total else 0,
        page=page,
        page_size=page_size,
    )
