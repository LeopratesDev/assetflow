"""
Fixtures compartilhadas para testes de integração.

Estratégia de banco nos testes: SQLite in-memory via aiosqlite.
  + Sem dependência de Docker/PostgreSQL no CI
  + Cada teste começa com banco limpo (fixture de escopo function)
  - SQLite não suporta algumas features do PostgreSQL (ex: Enum nativo, RETURNING em alguns casos)
  Mitigação: usamos String para status/role nos modelos, então não há divergência crítica.

Estratégia de autenticação nos testes:
  - `client` (fixture base): sem autenticação — usado apenas em test_health.py
  - `admin_client`: cliente com token de admin injetado no header Authorization
  - `employee_client`: cliente com token de employee (somente leitura)
  Os testes de CRUD herdam `admin_client` como padrão, pois a maioria precisa de admin.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_session
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.base import Base
from app.models.user import User

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def db_session():
    engine = create_async_engine(TEST_DB_URL, echo=False)

    # SQLite não enforça FK por padrão — ativamos para que os testes reflitam
    # o comportamento real do PostgreSQL em produção (RESTRICT, CASCADE, etc.)
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        bind=engine, expire_on_commit=False, class_=AsyncSession
    )

    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def client(db_session: AsyncSession):
    """Cliente sem autenticação (health check, rotas públicas)."""
    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> dict:
    """Cria usuário admin na DB de testes."""
    user = User(
        id="admin-fixture-001",
        name="Admin Teste",
        email="admin@empresa.com",
        hashed_password=hash_password("admin123"),
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}


@pytest.fixture
async def employee_user(db_session: AsyncSession) -> dict:
    """Cria usuário employee na DB de testes."""
    user = User(
        id="employee-fixture-001",
        name="Employee Teste",
        email="employee@empresa.com",
        hashed_password=hash_password("emp123"),
        role="employee",
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }


@pytest.fixture
async def admin_client(db_session: AsyncSession, admin_user: dict):
    """Cliente autenticado como admin (acesso total)."""
    token = create_access_token(subject=admin_user["id"], role="admin")

    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def employee_client(db_session: AsyncSession, employee_user: dict):
    """Cliente autenticado como employee (somente leitura)."""
    token = create_access_token(subject=employee_user["id"], role="employee")

    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as ac:
        yield ac
    app.dependency_overrides.clear()
