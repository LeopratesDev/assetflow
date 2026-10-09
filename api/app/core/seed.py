"""
Seed determinístico: sempre produz o mesmo estado, pode ser re-executado com segurança.
IDs fixos garantem idempotência — re-rodar não duplica registros.
"""

import asyncio
from datetime import date

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.allocation import Allocation
from app.models.asset import Asset
from app.models.category import Category
from app.models.user import User

logger = structlog.get_logger()

# ---------------------------------------------------------------------------
# Dados de seed — IDs fixos para idempotência
# ---------------------------------------------------------------------------

CATEGORIES = [
    {
        "id": "cat-0001-0000-0000-000000000001",
        "name": "Notebook",
        "description": "Computadores portáteis",
    },
    {
        "id": "cat-0001-0000-0000-000000000002",
        "name": "Monitor",
        "description": "Monitores e telas externas",
    },
    {
        "id": "cat-0001-0000-0000-000000000003",
        "name": "Periférico",
        "description": "Teclados, mouses e headsets",
    },
    {
        "id": "cat-0001-0000-0000-000000000004",
        "name": "Servidor",
        "description": "Servidores e equipamentos de rack",
    },
]

USERS = [
    {
        "id": "usr-0001-0000-0000-000000000001",
        "name": "Admin TI",
        "email": "admin@itasset.dev",
        "password": "Admin@1234",
        "role": "admin",
    },
    {
        "id": "usr-0001-0000-0000-000000000002",
        "name": "Ana Silva",
        "email": "ana.silva@itasset.dev",
        "password": "Employee@1234",
        "role": "employee",
    },
    {
        "id": "usr-0001-0000-0000-000000000003",
        "name": "Bruno Costa",
        "email": "bruno.costa@itasset.dev",
        "password": "Employee@1234",
        "role": "employee",
    },
]

ASSETS = [
    # Notebooks
    {
        "id": "ast-0001-0000-0000-000000000001",
        "serial_number": "NB-2024-001",
        "name": "Dell Latitude 5540",
        "brand": "Dell",
        "model": "Latitude 5540",
        "status": "allocated",
        "category_id": "cat-0001-0000-0000-000000000001",
        "purchase_date": date(2025, 3, 10),
        "purchase_value": 4800.00,
    },
    {
        "id": "ast-0001-0000-0000-000000000002",
        "serial_number": "NB-2025-002",
        "name": "Lenovo ThinkPad E14",
        "brand": "Lenovo",
        "model": "ThinkPad E14",
        "status": "allocated",
        "category_id": "cat-0001-0000-0000-000000000001",
        "purchase_date": date(2025, 4, 5),
        "purchase_value": 4200.00,
    },
    {
        "id": "ast-0001-0000-0000-000000000003",
        "serial_number": "NB-2025-003",
        "name": "HP ProBook 450",
        "brand": "HP",
        "model": "ProBook 450 G10",
        "status": "available",
        "category_id": "cat-0001-0000-0000-000000000001",
        "purchase_date": date(2025, 5, 20),
        "purchase_value": 3900.00,
    },
    {
        "id": "ast-0001-0000-0000-000000000004",
        "serial_number": "NB-2024-004",
        "name": "Dell Latitude 5430",
        "brand": "Dell",
        "model": "Latitude 5430",
        "status": "maintenance",
        "category_id": "cat-0001-0000-0000-000000000001",
        "purchase_date": date(2024, 6, 20),
        "purchase_value": 4500.00,
    },
    {
        "id": "ast-0001-0000-0000-000000000005",
        "serial_number": "NB-2024-005",
        "name": "Lenovo IdeaPad 3",
        "brand": "Lenovo",
        "model": "IdeaPad 3",
        "status": "available",
        "category_id": "cat-0001-0000-0000-000000000001",
        "purchase_date": date(2024, 8, 12),
        "purchase_value": 3200.00,
    },
    # Monitores
    {
        "id": "ast-0001-0000-0000-000000000006",
        "serial_number": "MN-2025-001",
        "name": "LG 27UK850 4K",
        "brand": "LG",
        "model": "27UK850",
        "status": "allocated",
        "category_id": "cat-0001-0000-0000-000000000002",
        "purchase_date": date(2025, 3, 10),
        "purchase_value": 2100.00,
    },
    {
        "id": "ast-0001-0000-0000-000000000007",
        "serial_number": "MN-2025-002",
        "name": "Samsung 24 FHD",
        "brand": "Samsung",
        "model": "S24E450",
        "status": "allocated",
        "category_id": "cat-0001-0000-0000-000000000002",
        "purchase_date": date(2025, 4, 5),
        "purchase_value": 950.00,
    },
    {
        "id": "ast-0001-0000-0000-000000000008",
        "serial_number": "MN-2024-003",
        "name": "Dell P2422H",
        "brand": "Dell",
        "model": "P2422H",
        "status": "available",
        "category_id": "cat-0001-0000-0000-000000000002",
        "purchase_date": date(2024, 5, 18),
        "purchase_value": 1100.00,
    },
    {
        "id": "ast-0001-0000-0000-000000000009",
        "serial_number": "MN-2022-004",
        "name": "AOC 22 FHD",
        "brand": "AOC",
        "model": "22B2HM",
        "status": "disposed",
        "category_id": "cat-0001-0000-0000-000000000002",
        "purchase_date": date(2022, 3, 10),
        "purchase_value": 700.00,
    },
    # Periféricos
    {
        "id": "ast-0001-0000-0000-000000000010",
        "serial_number": "PR-2025-001",
        "name": "Logitech MX Keys",
        "brand": "Logitech",
        "model": "MX Keys",
        "status": "allocated",
        "category_id": "cat-0001-0000-0000-000000000003",
        "purchase_date": date(2025, 3, 10),
        "purchase_value": 680.00,
    },
    {
        "id": "ast-0001-0000-0000-000000000011",
        "serial_number": "PR-2025-002",
        "name": "Logitech MX Master 3",
        "brand": "Logitech",
        "model": "MX Master 3",
        "status": "allocated",
        "category_id": "cat-0001-0000-0000-000000000003",
        "purchase_date": date(2025, 3, 10),
        "purchase_value": 580.00,
    },
    {
        "id": "ast-0001-0000-0000-000000000012",
        "serial_number": "PR-2025-003",
        "name": "Headset JBL Quantum",
        "brand": "JBL",
        "model": "Quantum 100",
        "status": "available",
        "category_id": "cat-0001-0000-0000-000000000003",
        "purchase_date": date(2025, 7, 22),
        "purchase_value": 320.00,
    },
    {
        "id": "ast-0001-0000-0000-000000000013",
        "serial_number": "PR-2024-004",
        "name": "Teclado K120 Logitech",
        "brand": "Logitech",
        "model": "K120",
        "status": "available",
        "category_id": "cat-0001-0000-0000-000000000003",
        "purchase_date": date(2024, 7, 5),
        "purchase_value": 120.00,
    },
    # Servidores
    {
        "id": "ast-0001-0000-0000-000000000014",
        "serial_number": "SV-2024-001",
        "name": "Dell PowerEdge R350",
        "brand": "Dell",
        "model": "PowerEdge R350",
        "status": "available",
        "category_id": "cat-0001-0000-0000-000000000004",
        "purchase_date": date(2024, 9, 1),
        "purchase_value": 18000.00,
    },
    {
        "id": "ast-0001-0000-0000-000000000015",
        "serial_number": "SV-2024-002",
        "name": "HP ProLiant DL360",
        "brand": "HP",
        "model": "ProLiant DL360 Gen10",
        "status": "maintenance",
        "category_id": "cat-0001-0000-0000-000000000004",
        "purchase_date": date(2024, 9, 1),
        "purchase_value": 22000.00,
    },
]

ALLOCATIONS = [
    {
        "id": "alc-0001-0000-0000-000000000001",
        "asset_id": "ast-0001-0000-0000-000000000001",
        "user_id": "usr-0001-0000-0000-000000000002",
        "allocated_at": date(2025, 3, 12),
        "returned_at": None,
        "notes": "Alocação inicial — desenvolvimento",
    },
    {
        "id": "alc-0001-0000-0000-000000000002",
        "asset_id": "ast-0001-0000-0000-000000000006",
        "user_id": "usr-0001-0000-0000-000000000002",
        "allocated_at": date(2025, 3, 12),
        "returned_at": None,
        "notes": "Monitor da Ana Silva",
    },
    {
        "id": "alc-0001-0000-0000-000000000003",
        "asset_id": "ast-0001-0000-0000-000000000010",
        "user_id": "usr-0001-0000-0000-000000000002",
        "allocated_at": date(2025, 3, 12),
        "returned_at": None,
        "notes": "Teclado da Ana Silva",
    },
    {
        "id": "alc-0001-0000-0000-000000000004",
        "asset_id": "ast-0001-0000-0000-000000000011",
        "user_id": "usr-0001-0000-0000-000000000002",
        "allocated_at": date(2025, 3, 12),
        "returned_at": None,
        "notes": "Mouse da Ana Silva",
    },
    {
        "id": "alc-0001-0000-0000-000000000005",
        "asset_id": "ast-0001-0000-0000-000000000002",
        "user_id": "usr-0001-0000-0000-000000000003",
        "allocated_at": date(2025, 4, 8),
        "returned_at": None,
        "notes": "Alocação Bruno Costa",
    },
    {
        "id": "alc-0001-0000-0000-000000000006",
        "asset_id": "ast-0001-0000-0000-000000000007",
        "user_id": "usr-0001-0000-0000-000000000003",
        "allocated_at": date(2025, 4, 8),
        "returned_at": None,
        "notes": "Monitor Bruno Costa",
    },
]


async def _seed_table(
    session: AsyncSession, model, records: list[dict], key: str = "id"
) -> int:
    created = 0
    for data in records:
        existing = await session.get(model, data[key])
        if existing:
            continue
        if model is User:
            data = {**data}
            data["hashed_password"] = hash_password(data.pop("password"))
        obj = model(**data)
        session.add(obj)
        created += 1
    return created


async def run_seed() -> None:
    async with AsyncSessionLocal() as session:
        cats = await _seed_table(session, Category, CATEGORIES)
        users = await _seed_table(session, User, USERS)
        assets = await _seed_table(session, Asset, ASSETS)
        allocations = await _seed_table(session, Allocation, ALLOCATIONS)
        await session.commit()
        logger.info(
            "seed_complete",
            categories=cats,
            users=users,
            assets=assets,
            allocations=allocations,
        )


if __name__ == "__main__":
    asyncio.run(run_seed())
