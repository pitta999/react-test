export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  categoryId: string; // 카테고리 참조 ID
  categoryName: string; // 카테고리 이름 (조회 편의를 위해 중복 저장)
  stock: number;
  stockStatus: 'ok' | 'nok'; // 재고 현황 상태
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
} 