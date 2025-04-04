import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { db } from "firebaseApp";
import { collection, getDocs, query, orderBy, where, doc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import AuthContext from "context/AuthContext";
import { useCart } from "context/CartContext";
import CartSidebar from "./CartSidebar";
import Loader from "./Loader";
import { COLLECTIONS, CustomerPrice } from "types/schema";

interface ProductType {
  id: string;
  name: string;
  price: number;
  description: string;
  categoryId: string;
  categoryName: string;
  stock: number;
  stockStatus: 'ok' | 'nok';
  imageUrl: string;
  createdAt: string;
  updatedAt?: string;
}

interface UserData {
  categoryId: string;
  categoryName: string;
  categoryLevel: number;
}

export default function ProductList() {
  const [dashcamProducts, setDashcamProducts] = useState<ProductType[]>([]);
  const [accessoryProducts, setAccessoryProducts] = useState<ProductType[]>([]);
  const [companionProducts, setCompanionProducts] = useState<ProductType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [customerPrices, setCustomerPrices] = useState<CustomerPrice | null>(null);
  const { user, isAdmin } = useContext(AuthContext);
  const { addItem } = useCart();

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

  // 상품 목록 불러오기
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const productsQuery = query(
          collection(db, COLLECTIONS.PRODUCTS),
          orderBy("createdAt", "desc")
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
        setDashcamProducts(allProducts.filter(product => product.categoryName === "dashcam"));
        setAccessoryProducts(allProducts.filter(product => product.categoryName === "accessory"));
        setCompanionProducts(allProducts.filter(product => product.categoryName === "companion"));
      } catch (error) {
        console.error("Error fetching products:", error);
        toast.error("상품 목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  // 가격 포맷팅 함수
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  // 할인가격 계산 함수
  const getDiscountPrice = (product: ProductType) => {
    if (!customerPrices) return null;
    
    const customPrice = customerPrices.prices.find(
      price => price.productId === product.id
    );
    
    return customPrice?.customPrice || null;
  };

  const handleAddToCart = (product: ProductType) => {
    const discountPrice = getDiscountPrice(product);
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      discountPrice: discountPrice || undefined,
      quantity: 1,
      imageUrl: product.imageUrl,
      categoryName: product.categoryName
    });
  };

  // 섹션 렌더링 함수
  const renderProductSection = (title: string, products: ProductType[]) => (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-2/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상품명
              </th>
              <th className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                정가
              </th>
              <th className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                할인가
              </th>
              <th className="w-1/10 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                재고 현황
              </th>
              <th className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => {
              const discountPrice = getDiscountPrice(product);
              return (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="w-2/5 px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <img className="h-10 w-10 rounded-full object-cover" src={product.imageUrl} alt={product.name} />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="w-1/5 px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatPrice(product.price)}원</div>
                  </td>
                  <td className="w-1/5 px-6 py-4 whitespace-nowrap">
                    {discountPrice ? (
                      <div className="text-sm text-primary-600 font-semibold">
                        {formatPrice(discountPrice)}원
                        <span className="text-xs text-gray-500 ml-1">
                          ({Math.round((1 - discountPrice / product.price) * 100)}% 할인)
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">-</div>
                    )}
                  </td>
                  <td className="w-1/10 px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.stockStatus === 'ok' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.stockStatus === 'ok' ? '정상' : '품절'}
                    </span>
                  </td>
                  <td className="w-1/5 px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      to={`/products/${product.id}`}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      상세보기
                    </Link>
                    <button 
                      onClick={() => handleAddToCart(product)}
                      className="text-primary-600 hover:text-primary-900"
                      disabled={product.stockStatus !== 'ok'}
                    >
                      주문하기
                    </button>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  등록된 상품이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

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
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {renderProductSection("DashCam", dashcamProducts)}
        {renderProductSection("Accessory", accessoryProducts)}
        {renderProductSection("Companion", companionProducts)}
      </div>
      <CartSidebar />
    </>
  );
}