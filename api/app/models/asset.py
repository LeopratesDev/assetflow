from decimal import Decimal

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class AssetStatus(str):
    AVAILABLE = "available"
    ALLOCATED = "allocated"
    MAINTENANCE = "maintenance"
    DISPOSED = "disposed"


class Asset(Base, TimestampMixin):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    serial_number: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    brand: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("available", "allocated", "maintenance", "disposed", name="asset_status"),
        nullable=False,
        default="available",
    )
    purchase_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    purchase_value: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=18, scale=2), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    category_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False
    )
    category: Mapped["Category"] = relationship("Category", back_populates="assets")  # noqa: F821
    allocations: Mapped[list["Allocation"]] = relationship(  # noqa: F821
        "Allocation", back_populates="asset"
    )

    def __repr__(self) -> str:
        return f"<Asset {self.serial_number} — {self.name}>"
