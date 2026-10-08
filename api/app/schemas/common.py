from pydantic import BaseModel


class PaginatedResponse[T](BaseModel):
    items: list[T]
    total_items: int
    total_pages: int
    page: int
    page_size: int
