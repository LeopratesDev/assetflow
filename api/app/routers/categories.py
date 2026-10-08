from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from app.schemas.common import PaginatedResponse
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get(
    "", response_model=PaginatedResponse[CategoryResponse], summary="Listar categorias"
)
async def list_categories(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    return await category_service.list_categories(session, page, page_size)


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar categoria",
)
async def create_category(
    data: CategoryCreate,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin),
):
    return await category_service.create_category(session, data)


@router.get(
    "/{category_id}",
    response_model=CategoryResponse,
    summary="Buscar categoria por ID",
)
async def get_category(
    category_id: str,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    obj = await category_service.get_category_or_404(session, category_id)
    return CategoryResponse.model_validate(obj)


@router.patch(
    "/{category_id}", response_model=CategoryResponse, summary="Atualizar categoria"
)
async def update_category(
    category_id: str,
    data: CategoryUpdate,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin),
):
    return await category_service.update_category(session, category_id, data)


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir categoria",
)
async def delete_category(
    category_id: str,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin),
):
    await category_service.delete_category(session, category_id)
