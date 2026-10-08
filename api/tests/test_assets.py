"""Testes de integração — /api/v1/assets"""

import pytest
from httpx import AsyncClient


@pytest.fixture
async def category(admin_client: AsyncClient) -> dict:
    r = await admin_client.post("/api/v1/categories", json={"name": "Notebook"})
    return r.json()


@pytest.fixture
async def asset_payload(category: dict) -> dict:
    return {
        "serial_number": "NB-TEST-001",
        "name": "Dell Latitude 5540",
        "brand": "Dell",
        "model": "Latitude 5540",
        "status": "available",
        "category_id": category["id"],
    }


@pytest.fixture
async def created_asset(admin_client: AsyncClient, asset_payload: dict) -> dict:
    r = await admin_client.post("/api/v1/assets", json=asset_payload)
    assert r.status_code == 201
    return r.json()


# ---------------------------------------------------------------------------
# POST /assets
# ---------------------------------------------------------------------------


async def test_create_asset_returns_201(admin_client: AsyncClient, asset_payload: dict):
    r = await admin_client.post("/api/v1/assets", json=asset_payload)
    assert r.status_code == 201
    body = r.json()
    assert body["serial_number"] == "NB-TEST-001"
    assert body["status"] == "available"
    assert body["category"]["name"] == "Notebook"


async def test_create_asset_duplicate_serial_returns_409(
    admin_client: AsyncClient, asset_payload: dict, created_asset: dict
):
    r = await admin_client.post("/api/v1/assets", json=asset_payload)
    assert r.status_code == 409


async def test_create_asset_invalid_category_returns_404(
    admin_client: AsyncClient, category: dict
):
    r = await admin_client.post(
        "/api/v1/assets",
        json={
            "serial_number": "NB-CAT-INVALID",
            "name": "Ativo Teste",
            "brand": "Marca",
            "model": "Modelo",
            "category_id": "categoria-inexistente",
        },
    )
    assert r.status_code == 404


async def test_create_asset_invalid_status_returns_422(
    admin_client: AsyncClient, category: dict
):
    r = await admin_client.post(
        "/api/v1/assets",
        json={
            "serial_number": "NB-Y",
            "name": "Y",
            "brand": "Y",
            "model": "Y",
            "category_id": category["id"],
            "status": "status_invalido",
        },
    )
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# GET /assets
# ---------------------------------------------------------------------------


async def test_list_assets_empty(admin_client: AsyncClient):
    r = await admin_client.get("/api/v1/assets")
    assert r.status_code == 200
    assert r.json()["total_items"] == 0


async def test_list_assets_pagination(admin_client: AsyncClient, category: dict):
    for i in range(5):
        await admin_client.post(
            "/api/v1/assets",
            json={
                "serial_number": f"SN-{i:03}",
                "name": f"Ativo {i}",
                "brand": "B",
                "model": "M",
                "category_id": category["id"],
            },
        )
    r = await admin_client.get("/api/v1/assets?page=1&page_size=3")
    body = r.json()
    assert body["total_items"] == 5
    assert body["total_pages"] == 2
    assert len(body["items"]) == 3


async def test_list_assets_search_by_name(
    admin_client: AsyncClient, created_asset: dict
):
    r = await admin_client.get("/api/v1/assets?search=Dell")
    assert r.status_code == 200
    assert r.json()["total_items"] == 1
    assert r.json()["items"][0]["brand"] == "Dell"


async def test_list_assets_filter_by_status(admin_client: AsyncClient, category: dict):
    await admin_client.post(
        "/api/v1/assets",
        json={
            "serial_number": "A1",
            "name": "A1",
            "brand": "B",
            "model": "M",
            "category_id": category["id"],
            "status": "available",
        },
    )
    await admin_client.post(
        "/api/v1/assets",
        json={
            "serial_number": "A2",
            "name": "A2",
            "brand": "B",
            "model": "M",
            "category_id": category["id"],
            "status": "maintenance",
        },
    )
    r = await admin_client.get("/api/v1/assets?status=maintenance")
    assert r.json()["total_items"] == 1


async def test_list_assets_filter_by_category(
    admin_client: AsyncClient, category: dict
):
    r2 = await admin_client.post("/api/v1/categories", json={"name": "Monitor"})
    cat2 = r2.json()
    await admin_client.post(
        "/api/v1/assets",
        json={
            "serial_number": "M1",
            "name": "Monitor",
            "brand": "LG",
            "model": "27UK",
            "category_id": cat2["id"],
        },
    )
    await admin_client.post(
        "/api/v1/assets",
        json={
            "serial_number": "N1",
            "name": "Notebook",
            "brand": "Dell",
            "model": "L5",
            "category_id": category["id"],
        },
    )
    r = await admin_client.get(f"/api/v1/assets?category_id={cat2['id']}")
    assert r.json()["total_items"] == 1
    assert r.json()["items"][0]["serial_number"] == "M1"


# ---------------------------------------------------------------------------
# GET /assets/{id}
# ---------------------------------------------------------------------------


async def test_get_asset_by_id(admin_client: AsyncClient, created_asset: dict):
    r = await admin_client.get(f"/api/v1/assets/{created_asset['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == created_asset["id"]


async def test_get_asset_not_found_returns_404(admin_client: AsyncClient):
    r = await admin_client.get("/api/v1/assets/id-inexistente")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /assets/{id}
# ---------------------------------------------------------------------------


async def test_update_asset_status(admin_client: AsyncClient, created_asset: dict):
    r = await admin_client.patch(
        f"/api/v1/assets/{created_asset['id']}",
        json={"status": "maintenance"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "maintenance"


async def test_update_asset_partial(admin_client: AsyncClient, created_asset: dict):
    r = await admin_client.patch(
        f"/api/v1/assets/{created_asset['id']}",
        json={"notes": "Em revisão técnica"},
    )
    assert r.status_code == 200
    assert r.json()["notes"] == "Em revisão técnica"
    assert r.json()["serial_number"] == created_asset["serial_number"]


# ---------------------------------------------------------------------------
# DELETE /assets/{id}
# ---------------------------------------------------------------------------


async def test_delete_asset_returns_204(admin_client: AsyncClient, created_asset: dict):
    r = await admin_client.delete(f"/api/v1/assets/{created_asset['id']}")
    assert r.status_code == 204


async def test_delete_asset_not_found_returns_404(admin_client: AsyncClient):
    r = await admin_client.delete("/api/v1/assets/id-inexistente")
    assert r.status_code == 404
