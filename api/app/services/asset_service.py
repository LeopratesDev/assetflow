import math

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.asset import Asset
from app.models.category import Category
from app.schemas.asset import AssetCreate, AssetResponse, AssetUpdate
from app.schemas.common import PaginatedResponse


def _asset_query(search: str | None, category_id: str | None, asset_status: str | None):
    q = select(Asset).options(selectinload(Asset.category))
    if search:
        term = f"%{search}%"
        q = q.where(or_(Asset.name.ilike(term), Asset.serial_number.ilike(term)))
    if category_id:
        q = q.where(Asset.category_id == category_id)
    if asset_status:
        q = q.where(Asset.status == asset_status)
    return q


async def list_assets(
    session: AsyncSession,
    page: int = 1,
    page_size: int = 10,
    search: str | None = None,
    category_id: str | None = None,
    asset_status: str | None = None,
) -> PaginatedResponse[AssetResponse]:
    base_q = _asset_query(search, category_id, asset_status)
    total = await session.scalar(select(func.count()).select_from(base_q.subquery()))
    rows = (
        (await session.execute(base_q.offset((page - 1) * page_size).limit(page_size)))
        .scalars()
        .all()
    )
    return PaginatedResponse(
        items=[AssetResponse.model_validate(r) for r in rows],
        total_items=total or 0,
        total_pages=math.ceil((total or 0) / page_size),
        page=page,
        page_size=page_size,
    )


async def get_asset_or_404(session: AsyncSession, asset_id: str) -> Asset:
    row = (
        await session.execute(
            select(Asset)
            .where(Asset.id == asset_id)
            .options(selectinload(Asset.category))
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ativo não encontrado"
        )
    return row


async def create_asset(session: AsyncSession, data: AssetCreate) -> AssetResponse:
    category = await session.get(Category, data.category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada"
        )
    existing = await session.scalar(
        select(Asset).where(Asset.serial_number == data.serial_number)
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Número de série '{data.serial_number}' já cadastrado",
        )
    obj = Asset(**data.model_dump())
    session.add(obj)
    await session.flush()
    return AssetResponse.model_validate(await get_asset_or_404(session, obj.id))


async def update_asset(
    session: AsyncSession, asset_id: str, data: AssetUpdate
) -> AssetResponse:
    obj = await get_asset_or_404(session, asset_id)
    updates = data.model_dump(exclude_unset=True)
    if "category_id" in updates:
        category = await session.get(Category, updates["category_id"])
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada"
            )
    for field, value in updates.items():
        setattr(obj, field, value)
    await session.flush()
    return AssetResponse.model_validate(await get_asset_or_404(session, obj.id))


async def delete_asset(session: AsyncSession, asset_id: str) -> None:
    obj = await get_asset_or_404(session, asset_id)
    try:
        await session.delete(obj)
        await session.flush()
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível excluir: existem alocações vinculadas a este ativo",
        ) from exc
