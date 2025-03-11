import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { db, storage } from "firebaseApp";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { toast } from "react-toastify";
import AuthContext from "context/AuthContext";
import { ProductCategoryType } from "./ProductForm";

interface ProductDetailType {
  id: string;
  name: string;
  price: number;
  description: string;
  category: ProductCategoryType;
  stock: number;
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

  // 상품 삭제 핸들러
  const handleDelete = async () => {
    if (!product || !productId) return;

    // 관리자 권한 검사 추가
    if (!isAdmin) {
        toast.error("관리자만 상품을 삭제할 수 있습니다.");
        return;
    }

    // 삭제 확인
    const confirmed = window.confirm(`'${product.name}' 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
    
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      // 이미지 삭제
      if (product.imageUrl) {
        try {
          const imageRef = ref(storage, product.imageUrl);
          await deleteObject(imageRef);
        } catch (error) {
          console.error("Error deleting product image:", error);
          // 이미지 삭제 실패해도 상품 삭제는 계속 진행
        }
      }
      
      // Firestore에서 상품 문서 삭제
      await deleteDoc(doc(db, "products", productId));
      
      toast.success("상품이 성공적으로 삭제되었습니다.");
      navigate("/products");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("상품 삭제 중 오류가 발생했습니다.");
      setIsDeleting(false);
    }
  };

  // 가격 포맷팅 함수
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  if (isLoading) {
    return <div className="loader">로딩 중...</div>;
  }

  if (!product) {
    return <div className="error">상품 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="container product-detail">
      <div className="product-detail__header">
        <h1>{product.name}</h1>
        {isAdmin && (
          <div className="product-detail__actions">
            <Link to={`/products/${productId}/edit`} className="product-detail__btn--edit">
              수정
            </Link>
            <button 
              onClick={handleDelete} 
              className="product-detail__btn--delete"
              disabled={isDeleting}
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </button>
          </div>
        )}
      </div>

      <div className="product-detail__content">
        <div className="product-detail__image">
          <img src={product.imageUrl} alt={product.name} />
        </div>
        
        <div className="product-detail__info">
          <div className="product-detail__item">
            <span className="product-detail__label">카테고리</span>
            <span className="product-detail__value badge">{product.category}</span>
          </div>
          
          <div className="product-detail__item">
            <span className="product-detail__label">가격</span>
            <span className="product-detail__value product-detail__price">
              {formatPrice(product.price)}원
            </span>
          </div>
          
          <div className="product-detail__item">
            <span className="product-detail__label">재고</span>
            <span className="product-detail__value">
              {product.stock > 0 ? `${product.stock}개` : '품절'}
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
          
          {product.stock > 0 && (
            <div className="product-detail__buy">
              <button className="product-detail__btn--cart">장바구니에 담기</button>
              <button className="product-detail__btn--buy">바로 구매하기</button>
            </div>
          )}
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