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
  ORDERS: 'orders',
  PRODUCT_RELATIONSHIPS: 'productRelationships',
  MY_INFO: 'myInfo',
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
  countryCode: string;  // 국가 코드 추가
  vatNumber: string;    // VAT 번호 추가
  personInCharge: {
    name: string;
    title: string;
    email: string;  // 이메일 필드 추가
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

// 생산 상태 타입 정의
export type ProductionStatus = 'inproduction' | 'discontinued' | 'out of sales';

// 상품 그룹 타입 정의
export interface ProductGroup extends BaseDocument {
  name: string;
  description: string;
}

// 상품 관련 타입 정의
export interface Product extends BaseDocument {
  name: string;
  price: number;
  description: string;
  categoryId: string;
  categoryName: string;
  groupId: string;
  groupName: string;
  stock: number;
  stockStatus: 'ok' | 'nok';
  imageUrl: {
    thumbnail: string;    // 32x32
    small: string;        // 80x80
    original: string;     // 400x400
  };
  status: boolean;  // true: 사용, false: 미사용
  hsCode: string;  // HS Code
  origin: string;  // 원산지
  weight: number;  // 무게
  productionStatus: ProductionStatus;  // 생산 상태 추가
  upc: string;     // UPC 코드
  ean: string;     // EAN 코드
  sortOrder: number;  // 정렬 순서
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
  imageUrl: {
    thumbnail: string;
    small: string;
    original: string;
  };
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

// 주문 상태 타입
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

// 주문 아이템 타입
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  discountPrice?: number;
  quantity: number;
  imageUrl: {
    thumbnail: string;
    small: string;
    original: string;
  };
  categoryName: string;
}

// 주문 타입
export interface Order extends BaseDocument {
  orderId: string;         // 주문 고유 번호
  userId: string;          // 주문자 ID
  userEmail: string;       // 주문자 이메일 
  companyName: string;     // 회사명
  items: OrderItem[];      // 주문 아이템 목록
  subtotal: number;        // 소계 (배송비 제외한 금액)
  totalAmount: number;     // 총 금액
  status: OrderStatus;     // 주문 상태
  shippingTerms: 'FOB' | 'CFR'; // 운송 조건
  shipTo: {               // 배송지 정보
    companyName: string;  // 회사명
    contactName: string;  // 담당자
    telNo: string;       // 전화번호
    mobNo: string;       // 휴대폰
    address: string;     // 주소
    email: string;       // 이메일
  };
  contactInfo?: string;    // 연락처
  notes?: string;          // 주문 메모
  paymentStatus?: 'pending' | 'paid' | 'failed'; // 결제 상태
  paymentMethod?: string;  // 결제 방법
  paymentId?: string;      // 결제 ID (Stripe 등의 외부 결제 시스템)
  shippingCost?: number;   // 배송비
  ttPayment?: {           // T/T 결제 관련 정보
    remittanceFiles: {    // 송금증 파일 목록
      id: string;         // 파일 ID
      name: string;       // 파일명
      url: string;        // 파일 URL
      uploadedAt: string; // 업로드 시간
    }[];
    status: 'pending' | 'approved' | 'rejected'; // T/T 결제 상태
    adminNote?: string;   // 관리자 메모
  };
}

// 연관 상품 관계 타입
export interface ProductRelationship extends BaseDocument {
  sourceProductId: string;
  targetProductId: string;
  bidirectional: boolean;
  sourceProduct?: Product;  // 조회 시 사용할 소스 상품 정보
  targetProduct?: Product;  // 조회 시 사용할 타겟 상품 정보
}

// 회사 정보 타입 정의
export interface MyInfo extends BaseDocument {
  companyName: string;        // 회사명
  tradingName: string;        // 거래명
  businessNumber: string;     // 사업자등록번호
  address: string;           // 회사 주소
  telNo: string,
  faxNo: string,
  contactInfo: {
    name: string;           // 담당자명
    title: string;          // 직위
    telNo: string;         // 전화번호
    mobNo: string;         // 휴대폰
    email: string;         // 이메일
  };
  bankInfo: {
    bankName: string;      // 은행명
    accountNumber: string; // 계좌번호
    accountHolder: string; // 예금주
    swiftCode: string;     // SWIFT CODE
  };
  shippingInfo: {
    origin: string;        // 원산지
    shipment: string;      // 배송 조건
    packing: string;       // 포장 조건
    validity: string;      // 유효기간
  };
  logoUrl?: string;        // 회사 로고 URL
  description?: string;    // 회사 설명
} 