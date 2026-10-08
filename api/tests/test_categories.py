"""Testes de integração — /api/v1/categories"""

import pytest
from httpx import AsyncClient


@pytest.fixture
async def created_category(admin_client: AsyncClient) -> dict:
    r = await admin_client.post(
        "/api/v1/categories",
        json={"name": "Notebook", "description": "Computadores portáteis"},
    )
    assert r.status_code == 201
    return r.json()


# ---------------------------------------------------------------------------
# POST /categories
# ---------------------------------------------------------------------------


async def test_create_category_returns_201(admin_client: AsyncClient):
    r = await admin_client.post("/api/v1/categories", json={"name": "Monitor"})
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "Monitor"
    assert "id" in body
    assert "created_at" in body


async def test_create_category_duplicate_name_returns_409(
    admin_client: AsyncClient, created_category: dict
):
    r = await admin_client.post(
        "/api/v1/categories", json={"name": created_category["name"]}
    )
    assert r.status_code == 409
    assert "Conflict" in r.json()["title"]


async def test_create_category_short_name_returns_422(admin_client: AsyncClient):
    r = await admin_client.post("/api/v1/categories", json={"name": "A"})
    assert r.status_code == 422


async def test_create_category_strips_whitespace(admin_client: AsyncClient):
    r = await admin_client.post("/api/v1/categories", json={"name": "  Periférico  "})
    assert r.status_code == 201
    assert r.json()["name"] == "Periférico"


# ---------------------------------------------------------------------------
# GET /categories
# ---------------------------------------------------------------------------


async def test_list_categories_empty(admin_client: AsyncClient):
    r = await admin_client.get("/api/v1/categories")
    assert r.status_code == 200
    body = r.json()
    assert body["total_items"] == 0
    assert body["items"] == []


async def test_list_categories_pagination(admin_client: AsyncClient):
    for i in range(5):
        await admin_client.post("/api/v1/categories", json={"name": f"Cat {i}"})
    r = await admin_client.get("/api/v1/categories?page=1&page_size=3")
    body = r.json()
    assert body["total_items"] == 5
    assert body["total_pages"] == 2
    assert len(body["items"]) == 3


# ---------------------------------------------------------------------------
# GET /categories/{id}
# ---------------------------------------------------------------------------


async def test_get_category_by_id(admin_client: AsyncClient, created_category: dict):
    r = await admin_client.get(f"/api/v1/categories/{created_category['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == created_category["id"]


async def test_get_category_not_found_returns_404(admin_client: AsyncClient):
    r = await admin_client.get("/api/v1/categories/id-inexistente")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /categories/{id}
# ---------------------------------------------------------------------------


async def test_update_category_name(
    admin_client: AsyncClient, created_category: dict
):
    r = await admin_client.patch(
        f"/api/v1/categories/{created_category['id']}",
        json={"name": "Notebook Corporativo"},
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Notebook Corporativo"


async def test_update_category_conflict_returns_409(admin_client: AsyncClient):
    await admin_client.post("/api/v1/categories", json={"name": "Alpha"})
    r2 = await admin_client.post("/api/v1/categories", json={"name": "Beta"})
    beta_id = r2.json()["id"]
    r = await admin_client.patch(
        f"/api/v1/categories/{beta_id}", json={"name": "Alpha"}
    )
    assert r.status_code == 409


# ---------------------------------------------------------------------------
# DELETE /categories/{id}
# ---------------------------------------------------------------------------


async def test_delete_category_returns_204(
    admin_client: AsyncClient, created_category: dict
):
    r = await admin_client.delete(f"/api/v1/categories/{created_category['id']}")
    assert r.status_code == 204


async def test_delete_category_not_found_returns_404(admin_client: AsyncClient):
    r = await admin_client.delete("/api/v1/categories/id-inexistente")
    assert r.status_code == 404


async def test_deleted_category_not_found_afterwards(
    admin_client: AsyncClient, created_category: dict
):
    await admin_client.delete(f"/api/v1/categories/{created_category['id']}")
    r = await admin_client.get(f"/api/v1/categories/{created_category['id']}")
    assert r.status_code == 404


async def test_delete_category_with_assets_returns_409(
    admin_client: AsyncClient, created_category: dict
):
    await admin_client.post(
        "/api/v1/assets",
        json={
            "serial_number": "FK-TEST-001",
            "name": "Ativo Vinculado",
            "brand": "Marca",
            "model": "Modelo",
            "category_id": created_category["id"],
        },
    )
    r = await admin_client.delete(f"/api/v1/categories/{created_category['id']}")
    assert r.status_code == 409
    assert "ativos" in r.json()["detail"].lower()
