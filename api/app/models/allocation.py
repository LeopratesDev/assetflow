from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class Allocation(Base, TimestampMixin):
    __tablename__ = "allocations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    allocated_at: Mapped[date] = mapped_column(Date, nullable=False)
    returned_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    asset_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assets.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    asset: Mapped["Asset"] = relationship("Asset", back_populates="allocations")  # noqa: F821
    user: Mapped["User"] = relationship("User", back_populates="allocations")  # noqa: F821

    @property
    def is_active(self) -> bool:
        return self.returned_at is None

    def __repr__(self) -> str:
        return f"<Allocation asset={self.asset_id} user={self.user_id} active={self.is_active}>"  # noqa: E501
