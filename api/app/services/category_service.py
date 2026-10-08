import math

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from app.schemas.common import PaginatedResponse


async def list_categories(
    session: AsyncSession,
    page: int = 1,
    page_size: int = 10,
) -> PaginatedResponse[CategoryResponse]:
    offset = (page - 1) * page_size
    total = await session.scalar(select(func.count()).select_from(Category))
    rows = (
        (await session.execute(select(Category).offset(offset).limit(page_size)))
        .scalars()
        .all()
    )
    return PaginatedResponse(
        items=[CategoryResponse.model_validate(r) for r in rows],
        total_items=total or 0,
        total_pages=math.ceil((total or 0) / page_size),
        page=page,
        page_size=page_size,
    )


async def get_category_or_404(session: AsyncSession, category_id: str) -> Category:
    obj = await session.get(Category, category_id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada"
        )
    return obj


async def create_category(
    session: AsyncSession, data: CategoryCreate
) -> CategoryResponse:
    existing = await session.scalar(select(Category).where(Category.name == data.name))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe uma categoria com o nome '{data.name}'",
        )
    obj = Category(**data.model_dump())
    session.add(obj)
    await session.flush()
    await session.refresh(obj)
    return CategoryResponse.model_validate(obj)


async def update_category(
    session: AsyncSession, category_id: str, data: CategoryUpdate
) -> CategoryResponse:
    obj = await get_category_or_404(session, category_id)
    updates = data.model_dump(exclude_unset=True)
    if "name" in updates and updates["name"] != obj.name:
        conflict = await session.scalar(
            select(Category).where(Category.name == updates["name"])
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Já existe uma categoria com o nome '{updates['name']}'",
            )
    for field, value in updates.items():
        setattr(obj, field, value)
    await session.flush()
    await session.refresh(obj)
    return CategoryResponse.model_validate(obj)


async def delete_category(session: AsyncSession, category_id: str) -> None:
    obj = await get_category_or_404(session, category_id)
    # FK RESTRICT rejeita se houver ativos vinculados — capturamos para retornar 409.
    try:
        await session.delete(obj)
        await session.flush()
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível excluir: existem ativos vinculados a esta categoria",
        ) from exc
