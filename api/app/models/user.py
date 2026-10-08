from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class UserRole(str):
    ADMIN = "admin"
    EMPLOYEE = "employee"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        Enum("admin", "employee", name="user_role"),
        nullable=False,
        default="employee",
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    allocations: Mapped[list["Allocation"]] = relationship(  # noqa: F821
        "Allocation", back_populates="user", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"
