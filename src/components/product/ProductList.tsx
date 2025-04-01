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
  const { addItem, items, removeItem, updateQuantity } = useCart();
  
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
  }>({ key: 'createdAt', direction: 'asc' });

  // 정렬 함수
  const sortProducts = (products: ProductType[]) => {
    return [...products].sort((a, b) => {
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
                  <span className="text-sm text-gray-500">카테고리</span>
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ml-2">
                    {selectedProduct.categoryName}
                  </div>
                </div>
                
                <div className="mb-4">
                  <span className="text-sm text-gray-500">가격</span>
                  <div className="text-xl font-semibold text-gray-900 mt-1">
                    {formatPrice(selectedProduct.price)}
                  </div>
                </div>
                
                <div className="mb-4">
                  <span className="text-sm text-gray-500">재고 현황</span>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedProduct.stockStatus === 'ok' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedProduct.stockStatus === 'ok' ? '정상' : '품절'}
                    </span>
                  </div>
                </div>
                
                <div className="mb-8">
                  <h3 className="text-sm text-gray-500 mb-2">상품 설명</h3>
                  <p className="text-gray-700 whitespace-pre-line">{selectedProduct.description}</p>
                </div>
                
                <div className="text-xs text-gray-500">
                  <div>등록일: {selectedProduct.createdAt}
                    {selectedProduct.createdBy && ` (${selectedProduct.createdBy})`}
                  </div>
                  {selectedProduct.updatedAt && (
                    <div>최근 수정일: {selectedProduct.updatedAt}
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
    try {
      const relationshipsQuery = query(
        collection(db, COLLECTIONS.PRODUCT_RELATIONSHIPS),
        where("sourceProductId", "==", productId)
      );
      
      const querySnapshot = await getDocs(relationshipsQuery);
      const relatedProductIds: string[] = [];
      
      querySnapshot.forEach((doc) => {
        const relationship = doc.data() as ProductRelationship;
        relatedProductIds.push(relationship.targetProductId);
      });

      // 연관 상품 정보 가져오기
      const relatedProductsData: ProductType[] = [];
      for (const id of relatedProductIds) {
        const productDoc = await getDoc(doc(db, COLLECTIONS.PRODUCTS, id));
        if (productDoc.exists()) {
          relatedProductsData.push({
            ...productDoc.data() as ProductType,
            id: productDoc.id,
          });
        }
      }

      setRelatedProducts(prev => ({
        ...prev,
        [productId]: relatedProductsData
      }));
    } catch (error) {
      console.error("Error fetching related products:", error);
      toast.error("연관 상품을 불러오는 중 오류가 발생했습니다.");
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

    return (
      <>
        <tr key={product.id} className={`hover:bg-gray-50 ${inCart ? 'bg-blue-50' : ''}`}>
          <td className="w-2/5 px-6 py-1 whitespace-nowrap">
            <div className="flex items-center">
              <div className="h-8 w-8 flex-shrink-0">
                <img className="h-8 w-8 rounded-full object-cover" src={product.imageUrl.thumbnail} alt={product.name} />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">{product.name}</div>
              </div>
            </div>
          </td>
          <td className="w-1/10 px-6 py-1 whitespace-nowrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              product.stockStatus === 'ok' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {product.stockStatus === 'ok' ? '정상' : '품절'}
            </span>
          </td>
          <td className="w-1/5 px-6 py-1 whitespace-nowrap text-right">
            <div className="text-sm text-gray-900">{formatPrice(product.price)}</div>
          </td>
          <td className="w-1/5 px-6 py-1 whitespace-nowrap text-right">
            {discountPrice ? (
              <div className="text-sm text-primary-600 font-semibold">
                {formatPrice(discountPrice)}
                <span className="text-xs text-gray-500 ml-1">
                  ({Math.round((1 - discountPrice / product.price) * 100)}% 할인)
                </span>
              </div>
            ) : (
              <div className="text-sm text-gray-500">-</div>
            )}
          </td>
          <td className="w-1/10 px-6 py-1 whitespace-nowrap text-right">
            <input
              type="number"
              min="1"
              value={inCart ? cartQuantity : (quantities[product.id] || 1)}
              onChange={(e) => handleQuantityChange(product.id, e.target.value)}
              className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
            />
          </td>
          <td className="w-1/5 px-6 py-1 whitespace-nowrap text-right">
            <div className="text-sm font-semibold text-primary-600">
              {formatPrice(total)}
            </div>
          </td>
          <td className="w-1/5 px-6 py-1 whitespace-nowrap text-sm font-medium">
            <button
              onClick={() => fetchProductDetail(product.id)}
              className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 mr-3 transition-colors"
            >
              Detail
            </button>
            <button 
              onClick={() => handleCartToggle(product)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors mr-3 ${
                inCart 
                  ? 'bg-primary-600 text-white hover:bg-primary-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              disabled={product.stockStatus !== 'ok'}
            >
              Cart
            </button>
            <button
              onClick={() => handleRelatedProductsClick(product.id)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                isSelected 
                  ? 'bg-primary-600 text-white hover:bg-primary-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Related
            </button>
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
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="w-2/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                상품명 {sortConfig.key === 'name' && <SortIcon columnKey="name" />}
              </th>
              <th 
                className="w-1/10 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('stockStatus')}
              >
                재고 {sortConfig.key === 'stockStatus' && <SortIcon columnKey="stockStatus" />}
              </th>
              <th 
                className="w-1/5 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('price')}
              >
                소비자가 {sortConfig.key === 'price' && <SortIcon columnKey="price" />}
              </th>
              <th className="w-1/5 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                공급가
              </th>
              <th className="w-1/10 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                수량
              </th>
              <th className="w-1/5 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                합계
              </th>
              <th className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortProducts(products).map((product) => renderProductRow(product))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  등록된 상품이 없습니다.
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
            <tr key={`category-${categoryName}`} className="bg-gray-300">
              <td colSpan={7} className="px-6 py-1">
                <div className="text-sm font-medium text-gray-700">연관 상품: {categoryName}</div>
              </td>
            </tr>
            {categoryProducts.map((product) => {
              const discountPrice = getDiscountPrice(product);
              const total = calculateTotal(product);
              const inCart = isInCart(product.id);
              const cartQuantity = getCartQuantity(product.id);
              return (
                <tr key={product.id} className={`bg-gray-100 hover:bg-gray-200 ${inCart ? 'bg-blue-50' : ''}`}>
                  <td className="w-2/5 px-6 py-1 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  </td>
                  <td className="w-1/10 px-6 py-1 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.stockStatus === 'ok' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.stockStatus === 'ok' ? '정상' : '품절'}
                    </span>
                  </td>
                  <td className="w-1/5 px-6 py-1 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">{formatPrice(product.price)}</div>
                  </td>
                  <td className="w-1/5 px-6 py-1 whitespace-nowrap text-right">
                    {discountPrice ? (
                      <div className="text-sm text-primary-600 font-semibold">
                        {formatPrice(discountPrice)}
                        <span className="text-xs text-gray-500 ml-1">
                          ({Math.round((1 - discountPrice / product.price) * 100)}% 할인)
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">-</div>
                    )}
                  </td>
                  <td className="w-1/10 px-6 py-1 whitespace-nowrap text-right">
                    <input
                      type="number"
                      min="1"
                      value={inCart ? cartQuantity : (quantities[product.id] || 1)}
                      onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                    />
                  </td>
                  <td className="w-1/5 px-6 py-1 whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-primary-600">
                      {formatPrice(total)}
                    </div>
                  </td>
                  <td className="w-1/5 px-6 py-1 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => fetchProductDetail(product.id)}
                      className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 mr-3 transition-colors"
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => handleCartToggle(product)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        inCart 
                          ? 'bg-primary-600 text-white hover:bg-primary-700' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      disabled={product.stockStatus !== 'ok'}
                    >
                      Cart
                    </button>
                  </td>
                </tr>
              );
            })}
          </>
        ))}
      </>
    );
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">상품 목록</h1>
          <div className="flex items-center">
            <input
              type="text"
              placeholder="상품 검색..."
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
      
      {/* 상세보기 모달 */}
      {isModalOpen && <ProductDetailModal />}
      {isProductLoading && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"><Loader /></div>}
    </>
  );
}