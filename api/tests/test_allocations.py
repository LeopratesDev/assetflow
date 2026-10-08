"""Testes de integração — /api/v1/allocations"""

from datetime import date, timedelta

import pytest
from httpx import AsyncClient

# ---------------------------------------------------------------------------
# Fixtures auxiliares
# ---------------------------------------------------------------------------


@pytest.fixture
async def category(admin_client: AsyncClient) -> dict:
    r = await admin_client.post(
        "/api/v1/categories",
        json={"name": "Notebook", "description": "Computadores portáteis"},
    )
    assert r.status_code == 201
    return r.json()


@pytest.fixture
async def available_asset(admin_client: AsyncClient, category: dict) -> dict:
    r = await admin_client.post(
        "/api/v1/assets",
        json={
            "serial_number": "NB-ALLOC-001",
            "name": "Notebook Dell",
            "brand": "Dell",
            "model": "Latitude 5520",
            "category_id": category["id"],
        },
    )
    assert r.status_code == 201
    return r.json()


@pytest.fixture
async def second_asset(admin_client: AsyncClient, category: dict) -> dict:
    r = await admin_client.post(
        "/api/v1/assets",
        json={
            "serial_number": "NB-ALLOC-002",
            "name": "Notebook HP",
            "brand": "HP",
            "model": "ProBook 450",
            "category_id": category["id"],
        },
    )
    assert r.status_code == 201
    return r.json()


@pytest.fixture
async def real_user(db_session):
    """Insere um usuário real na DB de testes via SQLAlchemy."""
    from app.core.security import hash_password
    from app.models.user import User

    user = User(
        id="user-real-001",
        name="João Silva",
        email="joao@empresa.com",
        hashed_password=hash_password("senha123"),
        role="employee",
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()
    return {"id": user.id, "name": user.name, "email": user.email}


@pytest.fixture
async def inactive_user(db_session):
    from app.core.security import hash_password
    from app.models.user import User

    user = User(
        id="user-inactive-001",
        name="Maria Inativa",
        email="maria@empresa.com",
        hashed_password=hash_password("senha123"),
        role="employee",
        is_active=False,
    )
    db_session.add(user)
    await db_session.flush()
    return {"id": user.id}


@pytest.fixture
async def active_allocation(
    admin_client: AsyncClient, available_asset: dict, real_user: dict
) -> dict:
    r = await admin_client.post(
        "/api/v1/allocations",
        json={
            "asset_id": available_asset["id"],
            "user_id": real_user["id"],
        },
    )
    assert r.status_code == 201
    return r.json()


# ---------------------------------------------------------------------------
# POST /allocations — criação com regras de negócio
# ---------------------------------------------------------------------------


async def test_create_allocation_returns_201(
    admin_client: AsyncClient, available_asset: dict, real_user: dict
):
    r = await admin_client.post(
        "/api/v1/allocations",
        json={"asset_id": available_asset["id"], "user_id": real_user["id"]},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["asset_id"] == available_asset["id"]
    assert body["user_id"] == real_user["id"]
    assert body["is_active"] is True
    assert body["returned_at"] is None
    assert body["asset"]["serial_number"] == available_asset["serial_number"]
    assert body["user"]["email"] == real_user["email"]


async def test_create_allocation_changes_asset_status_to_allocated(
    admin_client: AsyncClient, available_asset: dict, real_user: dict
):
    await admin_client.post(
        "/api/v1/allocations",
        json={"asset_id": available_asset["id"], "user_id": real_user["id"]},
    )
    r = await admin_client.get(f"/api/v1/assets/{available_asset['id']}")
    assert r.json()["status"] == "allocated"


async def test_create_allocation_asset_not_available_returns_409(
    admin_client: AsyncClient, available_asset: dict, real_user: dict
):
    """Regra: ativo não-disponível não pode ser alocado."""
    await admin_client.post(
        "/api/v1/allocations",
        json={"asset_id": available_asset["id"], "user_id": real_user["id"]},
    )
    r = await admin_client.post(
        "/api/v1/allocations",
        json={"asset_id": available_asset["id"], "user_id": real_user["id"]},
    )
    assert r.status_code == 409
    assert "disponível" in r.json()["detail"]


async def test_create_allocation_duplicate_active_returns_409(
    admin_client: AsyncClient,
    available_asset: dict,
    real_user: dict,
    inactive_user: dict,
):
    """Regra: ativo com alocação ativa não pode receber nova alocação."""
    await admin_client.post(
        "/api/v1/allocations",
        json={"asset_id": available_asset["id"], "user_id": real_user["id"]},
    )
    r = await admin_client.post(
        "/api/v1/allocations",
        json={"asset_id": available_asset["id"], "user_id": inactive_user["id"]},
    )
    assert r.status_code == 409


async def test_create_allocation_asset_not_found_returns_404(
    admin_client: AsyncClient, real_user: dict
):
    r = await admin_client.post(
        "/api/v1/allocations",
        json={"asset_id": "asset-inexistente", "user_id": real_user["id"]},
    )
    assert r.status_code == 404


async def test_create_allocation_user_not_found_returns_404(
    admin_client: AsyncClient, available_asset: dict
):
    r = await admin_client.post(
        "/api/v1/allocations",
        json={"asset_id": available_asset["id"], "user_id": "user-inexistente"},
    )
    assert r.status_code == 404


async def test_create_allocation_inactive_user_returns_409(
    admin_client: AsyncClient, available_asset: dict, inactive_user: dict
):
    r = await admin_client.post(
        "/api/v1/allocations",
        json={"asset_id": available_asset["id"], "user_id": inactive_user["id"]},
    )
    assert r.status_code == 409
    assert "inativo" in r.json()["detail"]


async def test_create_allocation_future_date_returns_422(
    admin_client: AsyncClient, available_asset: dict, real_user: dict
):
    future = (date.today() + timedelta(days=1)).isoformat()
    r = await admin_client.post(
        "/api/v1/allocations",
        json={
            "asset_id": available_asset["id"],
            "user_id": real_user["id"],
            "allocated_at": future,
        },
    )
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# PATCH /allocations/{id}/return — devolução
# ---------------------------------------------------------------------------


async def test_return_allocation_returns_200(
    admin_client: AsyncClient, active_allocation: dict
):
    r = await admin_client.patch(
        f"/api/v1/allocations/{active_allocation['id']}/return",
        json={"returned_at": date.today().isoformat()},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["is_active"] is False
    assert body["returned_at"] == date.today().isoformat()


async def test_return_allocation_frees_asset(
    admin_client: AsyncClient, active_allocation: dict, available_asset: dict
):
    """Devolução deve restaurar o status do ativo para 'available'."""
    await admin_client.patch(
        f"/api/v1/allocations/{active_allocation['id']}/return",
        json={"returned_at": date.today().isoformat()},
    )
    r = await admin_client.get(f"/api/v1/assets/{available_asset['id']}")
    assert r.json()["status"] == "available"


async def test_return_already_returned_returns_409(
    admin_client: AsyncClient, active_allocation: dict
):
    await admin_client.patch(
        f"/api/v1/allocations/{active_allocation['id']}/return",
        json={"returned_at": date.today().isoformat()},
    )
    r = await admin_client.patch(
        f"/api/v1/allocations/{active_allocation['id']}/return",
        json={"returned_at": date.today().isoformat()},
    )
    assert r.status_code == 409
    assert "encerrada" in r.json()["detail"]


async def test_return_date_before_allocation_returns_422(
    admin_client: AsyncClient, active_allocation: dict
):
    past = (date.today() - timedelta(days=365)).isoformat()
    r = await admin_client.patch(
        f"/api/v1/allocations/{active_allocation['id']}/return",
        json={"returned_at": past},
    )
    assert r.status_code == 422


async def test_return_allocation_not_found_returns_404(admin_client: AsyncClient):
    r = await admin_client.patch(
        "/api/v1/allocations/inexistente/return",
        json={"returned_at": date.today().isoformat()},
    )
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# GET /allocations — listagem paginada com filtros
# ---------------------------------------------------------------------------


async def test_list_allocations_empty(admin_client: AsyncClient):
    r = await admin_client.get("/api/v1/allocations")
    assert r.status_code == 200
    body = r.json()
    assert body["total_items"] == 0
    assert body["items"] == []


async def test_list_allocations_returns_created(
    admin_client: AsyncClient, active_allocation: dict
):
    r = await admin_client.get("/api/v1/allocations")
    assert r.status_code == 200
    assert r.json()["total_items"] == 1


async def test_list_allocations_filter_active_only(
    admin_client: AsyncClient, active_allocation: dict
):
    await admin_client.patch(
        f"/api/v1/allocations/{active_allocation['id']}/return",
        json={"returned_at": date.today().isoformat()},
    )
    r_active = await admin_client.get("/api/v1/allocations?active=true")
    assert r_active.json()["total_items"] == 0

    r_inactive = await admin_client.get("/api/v1/allocations?active=false")
    assert r_inactive.json()["total_items"] == 1


# ---------------------------------------------------------------------------
# GET /allocations/assets/{id}/history — histórico por ativo
# ---------------------------------------------------------------------------


async def test_asset_history_returns_all_allocations(
    admin_client: AsyncClient, available_asset: dict, real_user: dict
):
    r1 = await admin_client.post(
        "/api/v1/allocations",
        json={"asset_id": available_asset["id"], "user_id": real_user["id"]},
    )
    await admin_client.patch(
        f"/api/v1/allocations/{r1.json()['id']}/return",
        json={"returned_at": date.today().isoformat()},
    )
    await admin_client.post(
        "/api/v1/allocations",
        json={"asset_id": available_asset["id"], "user_id": real_user["id"]},
    )

    r = await admin_client.get(
        f"/api/v1/allocations/assets/{available_asset['id']}/history"
    )
    assert r.status_code == 200
    assert r.json()["total_items"] == 2


async def test_asset_history_not_found_returns_404(admin_client: AsyncClient):
    r = await admin_client.get("/api/v1/allocations/assets/id-inexistente/history")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# GET /allocations/users/{id}/allocations — histórico por usuário
# ---------------------------------------------------------------------------


async def test_user_allocations_returns_correct_records(
    admin_client: AsyncClient,
    available_asset: dict,
    second_asset: dict,
    real_user: dict,
):
    await admin_client.post(
        "/api/v1/allocations",
        json={"asset_id": available_asset["id"], "user_id": real_user["id"]},
    )
    r = await admin_client.get(
        f"/api/v1/allocations/users/{real_user['id']}/allocations"
    )
    assert r.status_code == 200
    assert r.json()["total_items"] == 1


async def test_user_allocations_not_found_returns_404(admin_client: AsyncClient):
    r = await admin_client.get("/api/v1/allocations/users/id-inexistente/allocations")
    assert r.status_code == 404
