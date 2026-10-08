from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    description: str | None = Field(None, max_length=255)

    @field_validator("name")
    @classmethod
    def name_strip(cls, v: str) -> str:
        return v.strip()


class CategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=80)
    description: str | None = Field(None, max_length=255)

    @field_validator("name")
    @classmethod
    def name_strip(cls, v: str | None) -> str | None:
        return v.strip() if v else v


class CategoryResponse(BaseModel):
    id: str
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
