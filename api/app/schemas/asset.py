from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator

AssetStatusLiteral = Literal["available", "allocated", "maintenance", "disposed"]


class AssetCreate(BaseModel):
    serial_number: str = Field(..., min_length=2, max_length=100)
    name: str = Field(..., min_length=2, max_length=120)
    brand: str = Field(..., min_length=1, max_length=80)
    model: str = Field(..., min_length=1, max_length=80)
    status: AssetStatusLiteral = "available"
    category_id: str
    purchase_date: date | None = None
    purchase_value: Decimal | None = Field(None, ge=0)
    notes: str | None = Field(None, max_length=500)

    @field_validator("serial_number", "name")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()


class AssetUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=120)
    brand: str | None = Field(None, min_length=1, max_length=80)
    model: str | None = Field(None, min_length=1, max_length=80)
    status: AssetStatusLiteral | None = None
    category_id: str | None = None
    purchase_date: date | None = None
    purchase_value: Decimal | None = Field(None, ge=0)
    notes: str | None = Field(None, max_length=500)


class CategorySummary(BaseModel):
    id: str
    name: str

    model_config = {"from_attributes": True}


class AssetResponse(BaseModel):
    id: str
    serial_number: str
    name: str
    brand: str
    model: str
    status: str
    category_id: str
    category: CategorySummary
    purchase_date: date | None
    purchase_value: Decimal | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
