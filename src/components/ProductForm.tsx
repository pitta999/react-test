import { useState, useEffect, useContext } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { db, storage } from "firebaseApp";
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, deleteDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-toastify";
import AuthContext from "context/AuthContext";
import { ProductCategory, COLLECTIONS, ProductionStatus } from "types/schema";
import Loader from "./Loader";

// 상품 카테고리 타입 정의
export type ProductCategoryType = "clothing" | "electronics" | "furniture" | "books" | "food" | "other";
export const PRODUCT_CATEGORIES: ProductCategoryType[] = ["clothing", "electronics", "furniture", "books", "food", "other"];

interface ProductFormProps {
  // 필요한 props가 있다면 여기에 추가
}

export default function ProductForm() {
  const { productId } = useParams(); // 수정 모드일 경우 productId가 있음
  const isEditMode = !!productId;
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // 폼 상태 관리
  const [name, setName] = useState<string>("");
  const [price, setPrice] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
  const [stock, setStock] = useState<number>(0);
  const [stockStatus, setStockStatus] = useState<'ok' | 'nok'>('ok');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [status, setStatus] = useState<boolean>(true);  // 사용/미사용 상태 추가
  const [hsCode, setHsCode] = useState<string>("");  // HS Code
  const [origin, setOrigin] = useState<string>("KR");  // 원산지 (기본값: KR)
  const [weight, setWeight] = useState<number>(0);  // 무게 (기본값: 0)
  const [productionStatus, setProductionStatus] = useState<ProductionStatus>('inproduction');

  // 카테고리 목록 불러오기
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "productCategories"));
        const categoryList: ProductCategory[] = [];
        querySnapshot.forEach((doc) => {
          categoryList.push(doc.data() as ProductCategory);
        });
        setCategories(categoryList.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("카테고리 목록을 불러오는 중 오류가 발생했습니다.");
      }
    };

    fetchCategories();
  }, []);

  // 수정 모드일 경우 상품 정보 불러오기
  useEffect(() => {
    const fetchProductData = async () => {
      if (isEditMode && productId) {
        setIsLoading(true);
        try {
          const productDoc = await getDoc(doc(db, "products", productId));
          if (productDoc.exists()) {
            const productData = productDoc.data();
            setName(productData.name || "");
            setPrice(productData.price || 0);
            setDescription(productData.description || "");
            setSelectedCategoryId(productData.categoryId || "");
            setStock(productData.stock || 0);
            setStockStatus(productData.stockStatus || 'ok');
            setImageUrl(productData.imageUrl || "");
            setPreviewUrl(productData.imageUrl || "");
            setStatus(productData.status ?? true);  // 사용/미사용 상태 설정
            setHsCode(productData.hsCode || "");  // HS Code
            setOrigin(productData.origin || "KR");  // 원산지
            setWeight(productData.weight || 0);  // 무게
            setProductionStatus(productData.productionStatus || 'inproduction');
          } else {
            toast.error("상품 정보를 찾을 수 없습니다.");
            navigate("/products");
          }
        } catch (error: any) {
          console.error("Error fetching product data:", error);
          toast.error("상품 정보를 불러오는 중 오류가 발생했습니다.");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchProductData();
  }, [productId, isEditMode, navigate]);

  // 이미지 파일 변경 핸들러
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // 이미지 파일 유효성 검사
      if (!file.type.startsWith("image/")) {
        setError("이미지 파일만 업로드할 수 있습니다.");
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB 제한
        setError("이미지 크기는 5MB 이하여야 합니다.");
        return;
      }
      
      setImageFile(file);
      setError("");
      
      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 유효성 검사
  const validateForm = () => {
    if (!name.trim()) {
      setError("상품명을 입력해주세요.");
      return false;
    }
    
    if (price <= 0) {
      setError("가격은 0보다 커야 합니다.");
      return false;
    }
    
    // 카테고리 검사 수정
    if (!selectedCategoryId && categories.length === 0) {
      setError("카테고리를 선택해주세요.");
      return false;
    }
    
    if (!description.trim()) {
      setError("상품 설명을 입력해주세요.");
      return false;
    }
    
    if (stock < 0) {
      setError("재고는 0 이상이어야 합니다.");
      return false;
    }
    
    if (!isEditMode && !imageFile) {
      setError("상품 이미지를 업로드해주세요.");
      return false;
    }
    
    setError("");
    return true;
  };

  // 이미지 업로드 함수
  const uploadImage = async (): Promise<string> => {
    if (!imageFile) {
      return imageUrl; // 이미지 파일이 없으면 기존 URL 반환 (수정 모드)
    }
    
    const fileId = uuidv4();
    const fileExtension = imageFile.name.split('.').pop();
    const storageRef = ref(storage, `products/${fileId}.${fileExtension}`);
    
    const uploadTask = uploadBytesResumable(storageRef, imageFile);
    
    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // 진행률 업데이트 - 필요하다면 여기에 로직 추가
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress}%`);
        },
        (error) => {
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  // 폼 제출 핸들러
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      let productImageUrl = imageUrl;
      
      if (imageFile) {
        if (isEditMode && imageUrl) {
          try {
            const oldImageRef = ref(storage, imageUrl);
            await deleteObject(oldImageRef);
          } catch (error) {
            console.error("기존 이미지 삭제 실패:", error);
          }
        }
        
        productImageUrl = await uploadImage();
      }

      // 카테고리 ID가 없으면 첫 번째 카테고리 사용
      const categoryId = selectedCategoryId || categories[0]?.id;
      const selectedCategory = categories.find(cat => cat.id === categoryId);
      if (!selectedCategory) {
        throw new Error("선택한 카테고리를 찾을 수 없습니다.");
      }
      
      const productData = {
        name,
        price: Number(price),
        description,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        stock: Number(stock),
        stockStatus,
        status,  // 사용/미사용 상태 추가
        hsCode,  // HS Code 추가
        origin,  // 원산지 추가
        weight: Number(weight),  // 무게 추가
        productionStatus,
        imageUrl: productImageUrl,
        updatedAt: new Date().toLocaleString("ko-KR"),
        updatedBy: user?.email,
      };
      
      let newProductId = "";

      if (isEditMode && productId) {
        await updateDoc(doc(db, COLLECTIONS.PRODUCTS, productId), productData);
        toast.success("상품 정보가 수정되었습니다.");
      } else {
        // 새 상품 등록
        const productRef = doc(db, COLLECTIONS.PRODUCTS, uuidv4());
        newProductId = productRef.id;
        await setDoc(productRef, {
          ...productData,
          id: productRef.id,
          createdAt: new Date().toLocaleString("ko-KR"),
          createdBy: user?.email,
        });

        // 모든 고객의 customerPrices 문서에 새 상품 추가
        const customerPricesSnapshot = await getDocs(collection(db, COLLECTIONS.CUSTOMER_PRICES));
        const updatePromises = customerPricesSnapshot.docs.map(async (customerPriceDoc) => {
          const customerPriceData = customerPriceDoc.data();
          const newPrices = [...customerPriceData.prices, {
            productId: newProductId,
            productName: name,
            customPrice: Number(price), // 초기 맞춤가격은 정가로 설정
            categoryId: selectedCategory.id,
            categoryName: selectedCategory.name,
          }];

          await updateDoc(doc(db, COLLECTIONS.CUSTOMER_PRICES, customerPriceDoc.id), {
            prices: newPrices,
            updatedAt: new Date().toLocaleString("ko-KR"),
            updatedBy: user?.email,
          });
        });

        await Promise.all(updatePromises);
        toast.success("상품이 등록되었습니다.");
      }
      navigate("/products/manage");
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(error?.message || "상품 저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 상품 삭제 핸들러
  const handleDelete = async () => {
    if (!productId) return;

    const confirmed = window.confirm("이 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.");
    if (!confirmed) return;

    setIsLoading(true);
    try {
      // 이미지가 있다면 Storage에서 삭제
      if (imageUrl) {
        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        } catch (error) {
          console.error("Error deleting image:", error);
        }
      }

      await deleteDoc(doc(db, "products", productId));
      toast.success("상품이 삭제되었습니다.");
      navigate("/products/manage");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("상품 삭제 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">
            {isEditMode ? "상품 수정" : "상품 등록"}
          </h1>
        </div>

        <div className="mb-6">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            상품명
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            가격 (USD)
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="number"
              id="price"
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
              placeholder="0.00"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              required
            />
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="hsCode" className="block text-sm font-medium text-gray-700 mb-2">
            HS Code
          </label>
          <input
            type="text"
            id="hsCode"
            value={hsCode}
            onChange={(e) => setHsCode(e.target.value)}

            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="origin" className="block text-sm font-medium text-gray-700 mb-2">
            원산지
          </label>
          <input
            type="text"
            id="origin"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-2">
            무게 (g)
          </label>
          <input
            type="number"
            id="weight"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            카테고리
          </label>
          <select
            id="category"
            value={selectedCategoryId || (categories[0]?.id || '')}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="mt-2">
            <Link to="/products/categories" className="text-sm text-primary-600 hover:text-primary-900">
              카테고리 관리
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-2">
            재고 수량
          </label>
          <input
            type="number"
            id="stock"
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
            placeholder="재고 수량을 입력하세요"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="stockStatus" className="block text-sm font-medium text-gray-700 mb-2">
            재고 현황
          </label>
          <select
            id="stockStatus"
            value={stockStatus}
            onChange={(e) => setStockStatus(e.target.value as 'ok' | 'nok')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="ok">정상</option>
            <option value="nok">품절</option>
          </select>
        </div>

        <div className="mb-6">
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
            사용 여부
          </label>
          <select
            id="status"
            value={status ? "true" : "false"}
            onChange={(e) => setStatus(e.target.value === "true")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="true">사용</option>
            <option value="false">미사용</option>
          </select>
        </div>

        <div className="mb-6">
          <label htmlFor="productionStatus" className="block text-sm font-medium text-gray-700 mb-2">
            생산 상태
          </label>
          <select
            id="productionStatus"
            value={productionStatus}
            onChange={(e) => setProductionStatus(e.target.value as ProductionStatus)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="inproduction">inproduction</option>
            <option value="discontinued">discontinued</option>
            <option value="out of sales">out of sales</option>
          </select>
        </div>

        <div className="mb-6">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            상품 설명
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="상품에 대한 상세 설명을 입력하세요"
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
            상품 이미지
          </label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full"
          />
          {previewUrl && (
            <div className="mt-4">
              <img src={previewUrl} alt="상품 이미지 미리보기" className="max-w-xs rounded-md" />
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <Link
            to="/products/manage"
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-center"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "처리 중..." : isEditMode ? "수정하기" : "등록하기"}
          </button>
          {isEditMode && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              title="삭제"
            >
              🗑️
            </button>
          )}
        </div>
      </form>
    </div>
  );
}