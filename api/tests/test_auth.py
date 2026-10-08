"""Testes de autenticação — /api/v1/auth/token e proteção de rotas"""

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token, hash_password
from app.models.user import User


@pytest.fixture
async def admin_in_db(db_session) -> dict:
    user = User(
        id="auth-admin-001",
        name="Admin Auth",
        email="auth.admin@empresa.com",
        hashed_password=hash_password("senha-admin"),
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()
    return {"id": user.id, "email": user.email, "password": "senha-admin"}


@pytest.fixture
async def inactive_in_db(db_session) -> dict:
    user = User(
        id="auth-inactive-001",
        name="Inativo Auth",
        email="auth.inativo@empresa.com",
        hashed_password=hash_password("senha123"),
        role="employee",
        is_active=False,
    )
    db_session.add(user)
    await db_session.flush()
    return {"id": user.id, "email": user.email, "password": "senha123"}


# ---------------------------------------------------------------------------
# POST /auth/token
# ---------------------------------------------------------------------------


async def test_login_returns_token(client: AsyncClient, admin_in_db: dict):
    r = await client.post(
        "/api/v1/auth/token",
        data={"username": admin_in_db["email"], "password": admin_in_db["password"]},
    )
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


async def test_login_wrong_password_returns_401(client: AsyncClient, admin_in_db: dict):
    r = await client.post(
        "/api/v1/auth/token",
        data={"username": admin_in_db["email"], "password": "errada"},
    )
    assert r.status_code == 401


async def test_login_unknown_email_returns_401(client: AsyncClient):
    r = await client.post(
        "/api/v1/auth/token",
        data={"username": "nao@existe.com", "password": "qualquer"},
    )
    assert r.status_code == 401


async def test_login_inactive_user_returns_403(
    client: AsyncClient, inactive_in_db: dict
):
    r = await client.post(
        "/api/v1/auth/token",
        data={
            "username": inactive_in_db["email"],
            "password": inactive_in_db["password"],
        },
    )
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# Proteção de rotas — 401 sem token
# ---------------------------------------------------------------------------


async def test_protected_route_without_token_returns_401(client: AsyncClient):
    r = await client.get("/api/v1/categories")
    assert r.status_code == 401


async def test_protected_route_with_invalid_token_returns_401(client: AsyncClient):
    r = await client.get(
        "/api/v1/categories",
        headers={"Authorization": "Bearer token.invalido.aqui"},
    )
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# Controle de acesso — employee vs admin
# ---------------------------------------------------------------------------


async def test_employee_can_read_categories(employee_client: AsyncClient):
    r = await employee_client.get("/api/v1/categories")
    assert r.status_code == 200


async def test_employee_cannot_create_category_returns_403(
    employee_client: AsyncClient,
):
    r = await employee_client.post(
        "/api/v1/categories", json={"name": "Bloqueada"}
    )
    assert r.status_code == 403


async def test_employee_cannot_delete_category_returns_403(
    employee_client: AsyncClient, admin_client: AsyncClient
):
    r = await admin_client.post("/api/v1/categories", json={"name": "Para Excluir"})
    cat_id = r.json()["id"]
    r2 = await employee_client.delete(f"/api/v1/categories/{cat_id}")
    assert r2.status_code == 403


async def test_admin_can_create_category(admin_client: AsyncClient):
    r = await admin_client.post("/api/v1/categories", json={"name": "Permitida"})
    assert r.status_code == 201


async def test_employee_cannot_create_allocation_returns_403(
    employee_client: AsyncClient,
):
    r = await employee_client.post(
        "/api/v1/allocations",
        json={"asset_id": "qualquer", "user_id": "qualquer"},
    )
    assert r.status_code == 403


async def test_employee_can_read_allocations(employee_client: AsyncClient):
    r = await employee_client.get("/api/v1/allocations")
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# Token expirado / inválido — unitário
# ---------------------------------------------------------------------------


def test_expired_token_raises_value_error():
    from datetime import UTC, datetime, timedelta

    import pytest
    from jose import jwt

    from app.core.config import settings
    from app.core.security import decode_token

    payload = {
        "sub": "user-id",
        "role": "admin",
        "exp": datetime.now(UTC) - timedelta(minutes=1),
    }
    expired_token = jwt.encode(
        payload, settings.secret_key, algorithm=settings.algorithm
    )
    with pytest.raises(ValueError):
        decode_token(expired_token)


def test_invalid_signature_raises_value_error():
    import pytest

    from app.core.security import decode_token

    token = create_access_token("user-id", "admin")
    tampered = token[:-4] + "XXXX"
    with pytest.raises(ValueError):
        decode_token(tampered)
