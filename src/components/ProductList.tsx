import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { db } from "firebaseApp";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import AuthContext from "context/AuthContext";
import { ProductCategoryType } from "./ProductForm";

interface ProductType {
  id: string;
  name: string;
  price: number;
  description: string;
  category: ProductCategoryType;
  stock: number;
  imageUrl: string;
  createdAt: string;
  updatedAt?: string;
}

export default function ProductList() {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { user } = useContext(AuthContext);

  // 어드민 권한 확인
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        // users 컬렉션에서 현재 사용자의 문서를 가져옴
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
          // 사용자 문서에 role 또는 isAdmin 필드가 있는지 확인
          const userData = userDoc.data();
          setIsAdmin(userData.role === 'admin' || userData.isAdmin === true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // 상품 목록 불러오기
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const productsQuery = query(
          collection(db, "products"),
          orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(productsQuery);
        const productsList: ProductType[] = [];
        
        querySnapshot.forEach((doc) => {
          const productData = doc.data() as ProductType;
          productsList.push({
            ...productData,
            id: doc.id,
          });
        });
        
        setProducts(productsList);
      } catch (error) {
        console.error("Error fetching products:", error);
        toast.error("상품 목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  // 카테고리별 필터링
  const filteredProducts = selectedCategory === "all"
    ? products
    : products.filter(product => product.category === selectedCategory);

  // 가격 포맷팅 함수
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  if (isLoading) {
    return <div className="loader">로딩 중...</div>;
  }

  return (
    <div className="container">
      <div className="product-list-header">
        <h1>상품 목록</h1>
        {isAdmin && (
          <Link to="/products/new" className="product-list__btn--add">
            + 새 상품 등록
          </Link>
        )}
      </div>

      <div className="product-list__filters">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="product-list__filter"
        >
          <option value="all">전체 카테고리</option>
          <option value="clothing">의류</option>
          <option value="electronics">전자제품</option>
          <option value="furniture">가구</option>
          <option value="books">도서</option>
          <option value="food">식품</option>
          <option value="other">기타</option>
        </select>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="product-list__empty">
          <p>등록된 상품이 없습니다.</p>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-card__image">
                <img src={product.imageUrl} alt={product.name} />
              </div>
              <div className="product-card__content">
                <h3 className="product-card__title">{product.name}</h3>
                <p className="product-card__price">{formatPrice(product.price)}원</p>
                <p className="product-card__category">{product.category}</p>
                <div className="product-card__stock">
                  재고: {product.stock > 0 ? product.stock : '품절'}
                </div>
                <Link to={`/products/${product.id}`} className="product-card__btn--view">
                  상세 보기
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}