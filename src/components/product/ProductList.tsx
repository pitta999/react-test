import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { db } from "firebaseApp";
import { collection, getDocs, query, orderBy, where, doc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import AuthContext from "context/AuthContext";
import { useCart } from "context/CartContext";
import CartSidebar from "components/product/CartSidebar";
import Loader from "components/common/Loader";
import { COLLECTIONS, CustomerPrice, ProductRelationship } from "types/schema";

interface ProductType {
  id: string;
  name: string;
  price: number;
  description: string;
  categoryId: string;
  categoryName: string;
  stock: number;
  stockStatus: 'ok' | 'nok';
  imageUrl: {
    thumbnail: string;
    small: string;
    original: string;
  };
  status: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  sortOrder?: number;
}

interface UserData {
  categoryId: string;
  categoryName: string;
  categoryLevel: number;
}

interface ProductQuantity {
  [key: string]: number;
}

interface CartItem {
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

export default function ProductList() {
  const [categorizedProducts, setCategorizedProducts] = useState<{[key: string]: ProductType[]}>({});
  const [categories, setCategories] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [customerPrices, setCustomerPrices] = useState<CustomerPrice | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [quantities, setQuantities] = useState<ProductQuantity>({});
  const { user, isAdmin } = useContext(AuthContext);
  const { addItem, items, removeItem, updateQuantity, setIsCartOpen } = useCart();
  
  // 상세보기 모달 상태
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [isProductLoading, setIsProductLoading] = useState<boolean>(false);
  const [relatedProducts, setRelatedProducts] = useState<{[key: string]: ProductType[]}>({});
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // 정렬 관련 상태 추가
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'sortOrder', direction: 'asc' });

  const [isLoadingRelated, setIsLoadingRelated] = useState<{[key: string]: boolean}>({});

  // 정렬 함수
  const sortProducts = (products: ProductType[]) => {
    return [...products].sort((a, b) => {
      if (sortConfig.key === 'sortOrder') {
        return sortConfig.direction === 'asc'
          ? (a.sortOrder || 0) - (b.sortOrder || 0)
          : (b.sortOrder || 0) - (a.sortOrder || 0);
      }
      if (sortConfig.key === 'name') {
        return sortConfig.direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      if (sortConfig.key === 'price') {
        return sortConfig.direction === 'asc'
          ? a.price - b.price
          : b.price - a.price;
      }
      if (sortConfig.key === 'stock') {
        return sortConfig.direction === 'asc'
          ? a.stock - b.stock
          : b.stock - a.stock;
      }
      if (sortConfig.key === 'stockStatus') {
        return sortConfig.direction === 'asc'
          ? a.stockStatus.localeCompare(b.stockStatus)
          : b.stockStatus.localeCompare(a.stockStatus);
      }
      if (sortConfig.key === 'createdAt') {
        return sortConfig.direction === 'asc'
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });
  };

  // 정렬 핸들러
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 정렬 아이콘 컴포넌트
  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' 
      ? <span className="ml-1">↑</span>
      : <span className="ml-1">↓</span>;
  };

  // 사용자 정보와 맞춤 가격 불러오기
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          // 사용자 정보 가져오기
          const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData({
              categoryId: data.categoryId,
              categoryName: data.categoryName,
              categoryLevel: data.categoryLevel
            });
          }

          // 맞춤 가격 가져오기
          const customerPriceDoc = await getDoc(doc(db, COLLECTIONS.CUSTOMER_PRICES, user.uid));
          if (customerPriceDoc.exists()) {
            setCustomerPrices(customerPriceDoc.data() as CustomerPrice);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();
  }, [user]);

  // 카테고리 목록 불러오기
  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.PRODUCT_CATEGORIES));
      const categoryMap: {[key: string]: string} = {};
      querySnapshot.forEach((doc) => {
        categoryMap[doc.id] = doc.data().name;
      });
      setCategories(categoryMap);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  // 상품 목록 불러오기
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const productsQuery = query(
          collection(db, COLLECTIONS.PRODUCTS),
          orderBy("sortOrder", "asc")
        );
        
        const querySnapshot = await getDocs(productsQuery);
        const allProducts: ProductType[] = [];
        
        querySnapshot.forEach((doc) => {
          const productData = doc.data() as ProductType;
          allProducts.push({
            ...productData,
            id: doc.id,
          });
        });
        
        // 카테고리별로 상품 분류
        const categorized: {[key: string]: ProductType[]} = {};
        allProducts.forEach(product => {
          if (!categorized[product.categoryName]) {
            categorized[product.categoryName] = [];
          }
          categorized[product.categoryName].push(product);
        });

        // 카테고리 순서 지정
        const categoryOrder = ['dashcam', 'accessory', 'companion'];
        const orderedCategories = Object.keys(categorized).sort((a, b) => {
          const indexA = categoryOrder.indexOf(a);
          const indexB = categoryOrder.indexOf(b);
          if (indexA === -1 && indexB === -1) return a.localeCompare(b);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });

        const orderedCategorizedProducts: {[key: string]: ProductType[]} = {};
        orderedCategories.forEach(categoryName => {
          orderedCategorizedProducts[categoryName] = categorized[categoryName];
        });

        setCategorizedProducts(orderedCategorizedProducts);
      } catch (error) {
        console.error("Error fetching products:", error);
        toast.error("상품 목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategories();
    fetchProducts();
  }, []);

  // 상품 상세 정보 가져오기
  const fetchProductDetail = async (productId: string) => {
    setIsProductLoading(true);
    try {
      const productDoc = await getDoc(doc(db, COLLECTIONS.PRODUCTS, productId));
      
      if (productDoc.exists()) {
        setSelectedProduct({
          ...productDoc.data() as ProductType,
          id: productDoc.id,
        });
        setIsModalOpen(true);
      } else {
        toast.error("상품 정보를 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
      toast.error("상품 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsProductLoading(false);
    }
  };

  // 검색어에 따라 상품 필터링하는 함수
  const filterProducts = (products: ProductType[]) => {
    if (!searchQuery.trim()) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query)
    );
  };

  // 가격 포맷팅 함수
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  // 할인가격 계산 함수
  const getDiscountPrice = (product: ProductType) => {
    if (!customerPrices) return null;
    
    const customPrice = customerPrices.prices.find(
      price => price.productId === product.id
    );
    
    return customPrice?.customPrice || null;
  };

  // 수량 변경 핸들러
  const handleQuantityChange = (productId: string, value: string) => {
    const numValue = parseInt(value) || 1;
    setQuantities(prev => ({
      ...prev,
      [productId]: numValue
    }));

    // 장바구니에 있는 상품이면 수량 업데이트
    if (isInCart(productId)) {
      updateQuantity(productId, numValue);
    }
  };

  // 합계 계산 함수
  const calculateTotal = (product: ProductType) => {
    const quantity = quantities[product.id] || 1;
    const price = getDiscountPrice(product) || product.price;
    return quantity * price;
  };

  // 장바구니 담기/제거 핸들러
  const handleCartToggle = (product: ProductType) => {
    const quantity = quantities[product.id] || 1;
    const inCart = isInCart(product.id);

    if (inCart) {
      // 장바구니에서 제거
      removeItem(product.id);
      // 수량 초기화
      setQuantities(prev => ({
        ...prev,
        [product.id]: 1
      }));
    } else {
      // 장바구니에 추가
      const discountPrice = getDiscountPrice(product);
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        discountPrice: discountPrice || undefined,
        quantity: quantity,
        imageUrl: product.imageUrl,
        categoryName: product.categoryName
      });
    }
  };

  // 상품이 장바구니에 있는지 확인하는 함수
  const isInCart = (productId: string) => {
    return items.some(item => item.id === productId);
  };

  // 장바구니에 있는 상품의 수량 가져오기
  const getCartQuantity = (productId: string) => {
    const cartItem = items.find(item => item.id === productId);
    return cartItem ? cartItem.quantity : 1;
  };

  // 상세보기 모달 닫기
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  // 상세보기 모달 컴포넌트
  const ProductDetailModal = () => {
    if (!selectedProduct) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black bg-opacity-50 p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">{selectedProduct.name}</h2>
            <button 
              onClick={closeModal}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="md:w-1/2">
                <img src={selectedProduct.imageUrl.original} alt={selectedProduct.name} className="w-full h-auto rounded-lg object-cover" />
              </div>
              
              <div className="md:w-1/2">
                <div className="mb-4">
                  <span className="text-sm text-gray-500">Category</span>
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ml-2">
                    {selectedProduct.categoryName}
                  </div>
                </div>
                
                <div className="mb-4">
                  <span className="text-sm text-gray-500">Price</span>
                  <div className="text-xl font-semibold text-gray-900 mt-1">
                    {formatPrice(selectedProduct.price)}
                  </div>
                </div>
                
                <div className="mb-4">
                  <span className="text-sm text-gray-500">Stock Status</span>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedProduct.stockStatus === 'ok' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedProduct.stockStatus === 'ok' ? 'OK' : 'NOK'}
                    </span>
                  </div>
                </div>
                
                <div className="mb-8">
                  <h3 className="text-sm text-gray-500 mb-2">Product Description</h3>
                  <p className="text-gray-700 whitespace-pre-line">{selectedProduct.description}</p>
                </div>
                
                <div className="text-xs text-gray-500">
                  <div>Created Date: {selectedProduct.createdAt}
                    {selectedProduct.createdBy && ` (${selectedProduct.createdBy})`}
                  </div>
                  {selectedProduct.updatedAt && (
                    <div>Last Updated Date: {selectedProduct.updatedAt}
                      {selectedProduct.updatedBy && ` (${selectedProduct.updatedBy})`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // 연관 상품 가져오기
  const fetchRelatedProducts = async (productId: string) => {
    setIsLoadingRelated(prev => ({ ...prev, [productId]: true }));
    try {
      // 1. sourceProductId로 조회
      const sourceQuery = query(
        collection(db, COLLECTIONS.PRODUCT_RELATIONSHIPS),
        where("sourceProductId", "==", productId)
      );
      
      // 2. targetProductId로 조회 (양방향 관계인 경우)
      const targetQuery = query(
        collection(db, COLLECTIONS.PRODUCT_RELATIONSHIPS),
        where("targetProductId", "==", productId),
        where("bidirectional", "==", true)
      );

      // 두 쿼리를 병렬로 실행
      const [sourceSnapshot, targetSnapshot] = await Promise.all([
        getDocs(sourceQuery),
        getDocs(targetQuery)
      ]);

      const relatedProductIds = new Set<string>();
      
      // sourceProductId로 조회된 결과 처리
      sourceSnapshot.forEach((doc) => {
        const relationship = doc.data() as ProductRelationship;
        relatedProductIds.add(relationship.targetProductId);
      });

      // targetProductId로 조회된 결과 처리
      targetSnapshot.forEach((doc) => {
        const relationship = doc.data() as ProductRelationship;
        relatedProductIds.add(relationship.sourceProductId);
      });

      // 연관 상품 정보를 한 번에 가져오기
      const relatedProductsData: ProductType[] = [];
      const productPromises = Array.from(relatedProductIds).map(async (id) => {
        const productDoc = await getDoc(doc(db, COLLECTIONS.PRODUCTS, id));
        if (productDoc.exists()) {
          return {
            ...productDoc.data() as ProductType,
            id: productDoc.id,
          };
        }
      });

      const products = await Promise.all(productPromises);
      relatedProductsData.push(...products.filter((product): product is ProductType => product !== undefined));

      setRelatedProducts(prev => ({
        ...prev,
        [productId]: relatedProductsData
      }));
    } catch (error) {
      console.error("Error fetching related products:", error);
      toast.error("연관 상품을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoadingRelated(prev => ({ ...prev, [productId]: false }));
    }
  };

  // 연관 상품 버튼 클릭 핸들러
  const handleRelatedProductsClick = (productId: string) => {
    setSelectedProductId(prev => prev === productId ? null : productId);
    if (!relatedProducts[productId]) {
      fetchRelatedProducts(productId);
    }
  };

  // 연관 상품을 카테고리별로 분류하는 함수
  const categorizeRelatedProducts = (products: ProductType[]) => {
    const categorized: {[key: string]: ProductType[]} = {};
    products.forEach(product => {
      if (!categorized[product.categoryName]) {
        categorized[product.categoryName] = [];
      }
      categorized[product.categoryName].push(product);
    });

    // 카테고리 순서 지정
    const categoryOrder = ['dashcam', 'accessory', 'companion'];
    const orderedCategories = Object.keys(categorized).sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    const orderedCategorizedProducts: {[key: string]: ProductType[]} = {};
    orderedCategories.forEach(categoryName => {
      orderedCategorizedProducts[categoryName] = categorized[categoryName];
    });

    return orderedCategorizedProducts;
  };

  // 상품 행 렌더링 함수 수정
  const renderProductRow = (product: ProductType) => {
    const discountPrice = getDiscountPrice(product);
    const total = calculateTotal(product);
    const isSelected = selectedProductId === product.id;
    const inCart = isInCart(product.id);
    const cartQuantity = getCartQuantity(product.id);
    const isLoading = isLoadingRelated[product.id];

    return (
      <>
        <tr key={product.id} className={`hover:bg-gray-50 ${inCart ? 'bg-blue-50' : ''}`}>
          <td className="px-4 py-2 whitespace-nowrap">
            <div className="flex items-center">
              <div className="h-8 w-8 flex-shrink-0">
                <img className="h-8 w-8 rounded-full object-cover" src={product.imageUrl.thumbnail} alt={product.name} />
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900 truncate max-w-[320px]" title={product.name}>{product.name}</div>
              </div>
            </div>
          </td>
          <td className="px-1 py-2 whitespace-nowrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              product.stockStatus === 'ok' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {product.stockStatus === 'ok' ? 'OK' : 'NOK'}
            </span>
          </td>
          <td className="px-1 py-2 whitespace-nowrap text-right">
            <div className="text-sm text-gray-900">{formatPrice(product.price)}</div>
          </td>
          <td className="px-1 py-2 whitespace-nowrap text-right">
            {discountPrice ? (
              <div className="text-sm text-primary-600 font-semibold">
                {formatPrice(discountPrice)}
                <span className="text-xs text-gray-500 ml-1">
                  ({Math.round((1 - discountPrice / product.price) * 100)}% ↓)
                </span>
              </div>
            ) : (
              <div className="text-sm text-gray-500">-</div>
            )}
          </td>
          <td className="px-1 py-2 whitespace-nowrap text-right">
            <input
              type="number"
              min="1"
              value={inCart ? cartQuantity : (quantities[product.id] || 1)}
              onChange={(e) => handleQuantityChange(product.id, e.target.value)}
              className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
            />
          </td>
          <td className="px-1 py-2 whitespace-nowrap text-right">
            <div className="text-sm font-semibold text-primary-600">
              {formatPrice(total)}
            </div>
          </td>
          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
            <div className="flex items-center space-x-2 justify-end">
              <button
                onClick={() => handleRelatedProductsClick(product.id)}
                className={`w-16 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                  isSelected 
                    ? 'bg-primary-600 text-white hover:bg-primary-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  </>
                ) : (
                  'Related'
                )}
              </button>
              <button
                onClick={() => fetchProductDetail(product.id)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5ZM9.30884 10.0159C8.53901 10.6318 7.56251 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.56251 10.6318 8.53901 10.0159 9.30884L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30884 10.0159Z"
                    fill="#000000"
                  />
                </svg>
              </button>
              <button 
                onClick={() => handleCartToggle(product)}
                className={`w-16 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                  inCart 
                    ? 'bg-primary-600 text-white hover:bg-primary-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                disabled={product.stockStatus !== 'ok'}
              >
                Cart
              </button>
              
            </div>
          </td>
        </tr>
        {isSelected && relatedProducts[product.id] && relatedProducts[product.id].length > 0 && (
          renderRelatedProductsSection(relatedProducts[product.id])
        )}
      </>
    );
  };

  // 섹션 렌더링 함수 수정
  const renderProductSection = (title: string, products: ProductType[]) => (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="w-[400px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                Product Name {sortConfig.key === 'name' && <SortIcon columnKey="name" />}
              </th>
              <th 
                className="w-[40px] px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('stockStatus')}
              >
                Stock {sortConfig.key === 'stockStatus' && <SortIcon columnKey="stockStatus" />}
              </th>
              <th 
                className="w-[70px] px-1 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('price')}
              >
                MRSP {sortConfig.key === 'price' && <SortIcon columnKey="price" />}
              </th>
              <th className="w-[120px] px-1 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier Price
              </th>
              <th className="w-[100px] px-1 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="w-[120px] px-1 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="w-[200px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortProducts(products).map((product) => renderProductRow(product))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500">
                  No products registered.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // 연관 상품 섹션 렌더링 함수 수정
  const renderRelatedProductsSection = (products: ProductType[]) => {
    const categorizedProducts = categorizeRelatedProducts(products);

    return (
      <>
        {Object.entries(categorizedProducts).map(([categoryName, categoryProducts]) => (
          <>
            <tr key={`category-${categoryName}`} className="bg-gray-200">
              <td colSpan={7} className="px-4 py-1">
                <div className="text-sm font-medium text-gray-700">Related Products : <span className="font-bold">{categoryName}</span></div>
              </td>
            </tr>
            {categoryProducts.map((product) => {
              const discountPrice = getDiscountPrice(product);
              const total = calculateTotal(product);
              const inCart = isInCart(product.id);
              const cartQuantity = getCartQuantity(product.id);
              return (
                <tr key={product.id} className={`bg-gray-50 hover:bg-gray-100 ${inCart ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 flex-shrink-0"></div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[320px]" title={product.name}>{product.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.stockStatus === 'ok' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.stockStatus === 'ok' ? 'OK' : 'NOK'}
                    </span>
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">{formatPrice(product.price)}</div>
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap text-right">
                    {discountPrice ? (
                      <div className="text-sm text-primary-600 font-semibold">
                        {formatPrice(discountPrice)}
                        <span className="text-xs text-gray-500 ml-1">
                          ({Math.round((1 - discountPrice / product.price) * 100)}% ↓)
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">-</div>
                    )}
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap text-right">
                    <input
                      type="number"
                      min="1"
                      value={inCart ? cartQuantity : (quantities[product.id] || 1)}
                      onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                    />
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-primary-600">
                      {formatPrice(total)}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2 justify-end">
                      <button
                        onClick={() => fetchProductDetail(product.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5ZM9.30884 10.0159C8.53901 10.6318 7.56251 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.56251 10.6318 8.53901 10.0159 9.30884L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30884 10.0159Z"
                            fill="#000000"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleCartToggle(product)}
                        className={`w-16 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                          inCart 
                            ? 'bg-primary-600 text-white hover:bg-primary-700' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        disabled={product.stockStatus !== 'ok'}
                      >
                        Cart
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </>
        ))}
        <tr className="bg-gray-200">
          <td colSpan={7} className=""></td>
        </tr>
      </>
    );
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-[1600px]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Product List</h1>
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Search product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {Object.keys(categorizedProducts).map(categoryName => (
          renderProductSection(categoryName, filterProducts(categorizedProducts[categoryName]))
        ))}
      </div>
      <CartSidebar />
      
      {/* 플로팅 카트 버튼 */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-colors z-40"
        aria-label="Open cart"
      >
        <div className="relative">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          {items.length > 0 && (
            <span className="absolute -top-4 -right-4 bg-white text-primary-600 text-xs rounded-full h-5 w-5 flex items-center justify-center border border-primary-600">
              {items.length}
            </span>
          )}
        </div>
      </button>
      
      {/* 상세보기 모달 */}
      {isModalOpen && <ProductDetailModal />}
      {isProductLoading && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"><Loader /></div>}
    </>
  );
}