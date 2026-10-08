from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator


class AllocationCreate(BaseModel):
    asset_id: str
    user_id: str
    allocated_at: date = Field(default_factory=date.today)
    notes: str | None = Field(None, max_length=500)

    @model_validator(mode="after")
    def allocated_at_not_in_future(self) -> "AllocationCreate":
        if self.allocated_at > date.today():
            raise ValueError("A data de alocação não pode ser no futuro")
        return self


class AllocationReturn(BaseModel):
    returned_at: date = Field(default_factory=date.today)
    notes: str | None = Field(None, max_length=500)

    @model_validator(mode="after")
    def returned_at_not_in_future(self) -> "AllocationReturn":
        if self.returned_at > date.today():
            raise ValueError("A data de devolução não pode ser no futuro")
        return self


class UserSummary(BaseModel):
    id: str
    name: str
    email: str

    model_config = {"from_attributes": True}


class AssetSummary(BaseModel):
    id: str
    serial_number: str
    name: str

    model_config = {"from_attributes": True}


class AllocationResponse(BaseModel):
    id: str
    asset_id: str
    user_id: str
    allocated_at: date
    returned_at: date | None
    notes: str | None
    is_active: bool
    asset: AssetSummary
    user: UserSummary
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
