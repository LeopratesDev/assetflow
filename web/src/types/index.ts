export interface PaginatedResponse<T> {
  items: T[];
  total_items: number;
  total_pages: number;
  page: number;
  page_size: number;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type AssetStatus = "available" | "allocated" | "maintenance" | "disposed";

export interface CategorySummary {
  id: string;
  name: string;
  serial_number?: string;
}

export interface Asset {
  id: string;
  serial_number: string;
  name: string;
  brand: string;
  model: string;
  status: AssetStatus;
  purchase_date: string | null;
  purchase_value: string | null;
  notes: string | null;
  category_id: string;
  category: CategorySummary;
  created_at: string;
  updated_at: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface AssetSummary {
  id: string;
  serial_number: string;
  name: string;
}

export interface Allocation {
  id: string;
  asset_id: string;
  user_id: string;
  allocated_at: string;
  returned_at: string | null;
  notes: string | null;
  is_active: boolean;
  asset: AssetSummary;
  user: UserSummary;
  created_at: string;
  updated_at: string;
}

export interface TokenPayload {
  sub: string;
  role: "admin" | "employee";
  exp: number;
}
