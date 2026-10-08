"""Testes unitários dos modelos e da camada de segurança."""

from datetime import date

import pytest

from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.allocation import Allocation
from app.models.asset import Asset
from app.models.category import Category
from app.models.user import User

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------


def test_hash_password_produces_different_hashes_for_same_input():
    h1 = hash_password("secret")
    h2 = hash_password("secret")
    assert h1 != h2  # bcrypt gera salt diferente a cada chamada


def test_verify_password_correct():
    hashed = hash_password("correct-horse")
    assert verify_password("correct-horse", hashed) is True


def test_verify_password_wrong():
    hashed = hash_password("correct-horse")
    assert verify_password("wrong-password", hashed) is False


def test_create_and_decode_access_token():
    token = create_access_token(subject="user-123", role="admin")
    payload = decode_token(token)
    assert payload["sub"] == "user-123"
    assert payload["role"] == "admin"


def test_decode_invalid_token_raises():
    with pytest.raises(ValueError, match="Token inválido"):
        decode_token("not.a.valid.token")


# ---------------------------------------------------------------------------
# Allocation business rules (pure Python, sem banco)
# ---------------------------------------------------------------------------


def test_allocation_is_active_when_no_return_date():
    alloc = Allocation(
        id="test-id",
        asset_id="a",
        user_id="u",
        allocated_at=date(2024, 1, 1),
        returned_at=None,
    )
    assert alloc.is_active is True


def test_allocation_is_not_active_when_returned():
    alloc = Allocation(
        id="test-id",
        asset_id="a",
        user_id="u",
        allocated_at=date(2024, 1, 1),
        returned_at=date(2024, 6, 1),
    )
    assert alloc.is_active is False


# ---------------------------------------------------------------------------
# Model repr (smoke tests)
# ---------------------------------------------------------------------------


def test_user_repr():
    u = User(email="test@test.com", role="admin")
    assert "test@test.com" in repr(u)


def test_category_repr():
    c = Category(name="Notebook")
    assert "Notebook" in repr(c)


def test_asset_repr():
    a = Asset(serial_number="SN-001", name="Dell")
    assert "SN-001" in repr(a)
