import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


async def test_health_returns_ok(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "version" in body


async def test_docs_available(client: AsyncClient):
    response = await client.get("/docs")
    assert response.status_code == 200


async def test_unknown_route_returns_404(client: AsyncClient):
    response = await client.get("/nao-existe")
    assert response.status_code == 404
