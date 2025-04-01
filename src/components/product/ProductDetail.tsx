import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { db, storage } from "firebaseApp";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { toast } from "react-toastify";
import AuthContext from "context/AuthContext";
import Loader from "components/common/Loader";

interface ProductDetailType {
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
  createdBy?: string;
  updatedBy?: string;
}

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useContext(AuthContext);


  const [product, setProduct] = useState<ProductDetailType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // 상품 상세 정보 불러오기
  useEffect(() => {
    const fetchProductDetail = async () => {
      if (!productId) return;

      setIsLoading(true);
      try {
        const productDoc = await getDoc(doc(db, "products", productId));
        
        if (productDoc.exists()) {
          setProduct({
            ...productDoc.data() as ProductDetailType,
            id: productDoc.id,
          });
        } else {
          toast.error("상품 정보를 찾을 수 없습니다.");
          navigate("/products");
        }
      } catch (error) {
        console.error("Error fetching product details:", error);
        toast.error("상품 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductDetail();
  }, [productId, navigate]);



  // 가격 포맷팅 함수
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  if (isLoading) {
    return <Loader />;
  }

  if (!product) {
    return <div className="error">상품 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="container product-detail">
      <div className="product-detail__header">
        <h1>{product.name}</h1>

      </div>

      <div className="product-detail__content">
        <div className="product-detail__image">
          <img src={product.imageUrl} alt={product.name} />
        </div>
        
        <div className="product-detail__info">
          <div className="product-detail__item">
            <span className="product-detail__label">카테고리</span>
            <span className="product-detail__value badge">{product.categoryName}</span>
          </div>
          
          <div className="product-detail__item">
            <span className="product-detail__label">가격</span>
            <span className="product-detail__value product-detail__price">
              {formatPrice(product.price)}
            </span>
          </div>
          
          <div className="product-detail__item">
            <span className="product-detail__label">재고 현황</span>
            <span className={`product-detail__value badge ${product.stockStatus === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {product.stockStatus === 'ok' ? '정상' : '품절'}
            </span>
          </div>
          

          
          <div className="product-detail__description">
            <h3>상품 설명</h3>
            <p>{product.description}</p>
          </div>
          
          <div className="product-detail__meta">
            <div className="product-detail__created">
              등록일: {product.createdAt}
              {product.createdBy && ` (${product.createdBy})`}
            </div>
            {product.updatedAt && (
              <div className="product-detail__updated">
                최근 수정일: {product.updatedAt}
                {product.updatedBy && ` (${product.updatedBy})`}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="product-detail__footer">
        <Link to="/products" className="product-detail__btn--back">
          상품 목록으로 돌아가기
        </Link>
      </div>
    </div>
  );
}