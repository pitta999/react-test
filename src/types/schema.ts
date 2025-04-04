// Firebase 컬렉션 이름 상수 정의
export const COLLECTIONS = {
  USERS: 'users',
  USER_CATEGORIES: 'userCategories',
  PRODUCTS: 'products',
  PRODUCT_CATEGORIES: 'productCategories',
  CARTS: 'carts',
  POSTS: 'posts',
  CUSTOMER_PRICES: 'customerPrices',
  CUSTOMER_PRICE_HISTORY: 'customerPriceHistory',
} as const;

// 공통 필드 타입 정의
export interface BaseDocument {
  id: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

// 사용자 관련 타입 정의
export interface User extends BaseDocument {
  email: string;
  fullCompanyName: string;
  tradingName: string;
  companyAddress: string;
  personInCharge: {
    name: string;
    title: string;
  };
  telNo: string;
  mobNo: string;
  webAddress: string;
  businessType: 'B2B' | 'B2C' | 'Other';
  installationService: 'Yes' | 'No';
  salesProducts: string;
  tradeAmount: string;
  preferentialModel: string;
  estimatedPurchase: string;
  categoryId: string;
  categoryName: string;
  categoryLevel: number;
}

export interface UserCategory extends BaseDocument {
  name: string;
  description: string;
  level: number;
}

// 상품 관련 타입 정의
export interface Product extends BaseDocument {
  name: string;
  price: number;
  description: string;
  categoryId: string;
  categoryName: string;
  stock: number;
  stockStatus: 'ok' | 'nok';
  imageUrl: string;
  discountPrices: Array<{
    categoryId: string;
    categoryName: string;
    categoryLevel: number;
    price: number;
  }>;
}

export interface ProductCategory extends BaseDocument {
  name: string;
  description: string;
}

// 장바구니 관련 타입 정의
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  discountPrice?: number;
  categoryName: string;
}

export interface Cart extends BaseDocument {
  userId: string;
  items: CartItem[];
}

// 게시글 관련 타입 정의
export interface Post extends BaseDocument {
  title: string;
  summary: string;
  content: string;
  category: string;
  author: {
    id: string;
    email: string;
    name?: string;
  };
  comments: Comment[];
}

export interface Comment extends BaseDocument {
  content: string;
  author: {
    id: string;
    email: string;
    name?: string;
  };
}

// 고객별 맞춤 가격 타입 정의
export interface CustomerPrice extends BaseDocument {
  userId: string;  // 사용자 UID
  userEmail: string;  // 사용자 이메일
  companyName: string;  // 회사명
  prices: Array<{
    productId: string;
    productName: string;
    customPrice: number;   // 맞춤가격
    categoryId: string;
    categoryName: string;
  }>;
}

// 고객별 맞춤 가격 수정 이력 타입 정의
export interface PriceHistoryItem {
  adminEmail: string;
  updatedAt: string;
  changes: Array<{
    productId: string;
    productName: string;
    previousPrice: number;
    newPrice: number;
  }>;
}

export interface CustomerPriceHistory extends BaseDocument {
  userId: string;
  userEmail: string;
  companyName: string;
  history: PriceHistoryItem[];
} 