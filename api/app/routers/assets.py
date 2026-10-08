from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.schemas.asset import (
    AssetCreate,
    AssetResponse,
    AssetStatusLiteral,
    AssetUpdate,
)
from app.schemas.common import PaginatedResponse
from app.services import asset_service

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get(
    "", response_model=PaginatedResponse[AssetResponse], summary="Listar ativos"
)
async def list_assets(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str | None = Query(None, description="Busca por nome ou número de série"),
    category_id: str | None = Query(None),
    asset_status: AssetStatusLiteral | None = Query(None, alias="status"),
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    return await asset_service.list_assets(
        session, page, page_size, search, category_id, asset_status
    )


@router.post(
    "",
    response_model=AssetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar ativo",
)
async def create_asset(
    data: AssetCreate,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin),
):
    return await asset_service.create_asset(session, data)


@router.get(
    "/{asset_id}", response_model=AssetResponse, summary="Buscar ativo por ID"
)
async def get_asset(
    asset_id: str,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    return AssetResponse.model_validate(
        await asset_service.get_asset_or_404(session, asset_id)
    )


@router.patch("/{asset_id}", response_model=AssetResponse, summary="Atualizar ativo")
async def update_asset(
    asset_id: str,
    data: AssetUpdate,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin),
):
    return await asset_service.update_asset(session, asset_id, data)


@router.delete(
    "/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir ativo",
)
async def delete_asset(
    asset_id: str,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin),
):
    await asset_service.delete_asset(session, asset_id)
