import { useState, useEffect, useContext } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { db, storage } from "firebaseApp";
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, deleteDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-toastify";
import AuthContext from "context/AuthContext";
import { ProductCategory, COLLECTIONS, ProductionStatus, ProductGroup } from "types/schema";
import Loader from "components/common/Loader";

// 상품 카테고리 타입 정의
export type ProductCategoryType = "clothing" | "electronics" | "furniture" | "books" | "food" | "other";
export const PRODUCT_CATEGORIES: ProductCategoryType[] = ["clothing", "electronics", "furniture", "books", "food", "other"];

interface ProductFormProps {
  // 필요한 props가 있다면 여기에 추가
}

// 이미지 리사이즈 함수
const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // 비율 유지하면서 리사이즈
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/jpeg', 0.8);
      
      URL.revokeObjectURL(img.src);
    };
    
    img.onerror = reject;
  });
};

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
  const [imageUrl, setImageUrl] = useState<{ thumbnail: string; small: string; original: string }>({
    thumbnail: '',
    small: '',
    original: ''
  });
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [status, setStatus] = useState<boolean>(true);  // 사용/미사용 상태 추가
  const [hsCode, setHsCode] = useState<string>("");  // HS Code
  const [origin, setOrigin] = useState<string>("KR");  // 원산지 (기본값: KR)
  const [weight, setWeight] = useState<number>(0);  // 무게 (기본값: 0)
  const [productionStatus, setProductionStatus] = useState<ProductionStatus>('inproduction');
  const [upc, setUpc] = useState<string>("");  // UPC 코드
  const [ean, setEan] = useState<string>("");  // EAN 코드
  const [sortOrder, setSortOrder] = useState<number>(0);  // 정렬 순서

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

    const fetchGroups = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "productGroups"));
        const groupList: ProductGroup[] = [];
        querySnapshot.forEach((doc) => {
          groupList.push(doc.data() as ProductGroup);
        });
        setGroups(groupList.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Error fetching groups:", error);
        toast.error("그룹 목록을 불러오는 중 오류가 발생했습니다.");
      }
    };

    fetchCategories();
    fetchGroups();
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
            setSelectedGroupId(productData.groupId || "");
            setStock(productData.stock || 0);
            setStockStatus(productData.stockStatus || 'ok');
            setImageUrl(productData.imageUrl || {
              thumbnail: '',
              small: '',
              original: ''
            });
            setPreviewUrl(productData.imageUrl?.original || "");
            setStatus(productData.status ?? true);  // 사용/미사용 상태 설정
            setHsCode(productData.hsCode || "");  // HS Code
            setOrigin(productData.origin || "KR");  // 원산지
            setWeight(productData.weight || 0);  // 무게
            setProductionStatus(productData.productionStatus || 'inproduction');
            setUpc(productData.upc || "");  // UPC 코드
            setEan(productData.ean || "");  // EAN 코드
            setSortOrder(productData.sortOrder || 0);
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
      
      if (!file.type.startsWith("image/")) {
        setError("이미지 파일만 업로드할 수 있습니다.");
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError("이미지 크기는 5MB 이하여야 합니다.");
        return;
      }
      
      setImageFile(file);
      setError("");
      
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
  const uploadImage = async (): Promise<{ thumbnail: string; small: string; original: string }> => {
    if (!imageFile) {
      return imageUrl; // 이미지 파일이 없으면 기존 URL 반환 (수정 모드)
    }
    
    const fileId = uuidv4();
    const fileExtension = imageFile.name.split('.').pop();
    
    // 각 크기별 이미지 리사이즈 및 업로드
    const sizes = [
      { name: 'thumbnail', width: 32, height: 32 },
      { name: 'small', width: 80, height: 80 },
      { name: 'original', width: 400, height: 400 }
    ];
    
    const uploadPromises = sizes.map(async ({ name, width, height }) => {
      const resizedBlob = await resizeImage(imageFile, width, height);
      const storageRef = ref(storage, `products/${fileId}_${name}.${fileExtension}`);
      
      const uploadTask = uploadBytesResumable(storageRef, resizedBlob);
      
      return new Promise<string>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload progress for ${name}: ${progress}%`);
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
    });
    
    const [thumbnail, small, original] = await Promise.all(uploadPromises);
    return { thumbnail, small, original };
  };

  // 폼 제출 핸들러
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      let productImageUrls = imageUrl;
      
      if (imageFile) {
        if (isEditMode && imageUrl.original) {
          try {
            // 기존 이미지들 삭제
            await Promise.all([
              deleteObject(ref(storage, imageUrl.thumbnail)),
              deleteObject(ref(storage, imageUrl.small)),
              deleteObject(ref(storage, imageUrl.original))
            ]);
          } catch (error) {
            console.error("기존 이미지 삭제 실패:", error);
          }
        }
        
        productImageUrls = await uploadImage();
      }

      const categoryId = selectedCategoryId || categories[0]?.id;
      const selectedCategory = categories.find(cat => cat.id === categoryId);
      if (!selectedCategory) {
        throw new Error("선택한 카테고리를 찾을 수 없습니다.");
      }

      const groupId = selectedGroupId || groups[0]?.id;
      const selectedGroup = groups.find(group => group.id === groupId);
      if (!selectedGroup) {
        throw new Error("선택한 그룹을 찾을 수 없습니다.");
      }
      
      const productData = {
        name,
        price: Number(price),
        description,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        groupId: selectedGroup.id,
        groupName: selectedGroup.name,
        stock: Number(stock),
        stockStatus,
        status,
        hsCode,
        origin,
        weight: Number(weight),
        productionStatus,
        upc,
        ean,
        sortOrder: Number(sortOrder),
        imageUrl: productImageUrls,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email,
      };
      
      let newProductId = "";

      if (isEditMode && productId) {
        await updateDoc(doc(db, COLLECTIONS.PRODUCTS, productId), productData);
        toast.success("상품 정보가 수정되었습니다.");
      } else {
        const productRef = doc(db, COLLECTIONS.PRODUCTS, uuidv4());
        newProductId = productRef.id;
        await setDoc(productRef, {
          ...productData,
          id: productRef.id,
          createdAt: new Date().toISOString(),
          createdBy: user?.email,
        });

        // 모든 고객의 customerPrices 문서에 새 상품 추가
        const customerPricesSnapshot = await getDocs(collection(db, COLLECTIONS.CUSTOMER_PRICES));
        const updatePromises = customerPricesSnapshot.docs.map(async (customerPriceDoc) => {
          const customerPriceData = customerPriceDoc.data();
          const newPrices = [...customerPriceData.prices, {
            productId: newProductId,
            productName: name,
            customPrice: Number(price),
            categoryId: selectedCategory.id,
            categoryName: selectedCategory.name,
            groupId: selectedGroup.id,
            groupName: selectedGroup.name,
          }];

          await updateDoc(doc(db, COLLECTIONS.CUSTOMER_PRICES, customerPriceDoc.id), {
            prices: newPrices,
            updatedAt: new Date().toISOString(),
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
      if (imageUrl.original) {
        try {
          await Promise.all([
            deleteObject(ref(storage, imageUrl.thumbnail)),
            deleteObject(ref(storage, imageUrl.small)),
            deleteObject(ref(storage, imageUrl.original))
          ]);
        } catch (error) {
          console.error("Error deleting images:", error);
        }
      }

      // customerPrices 컬렉션에서 상품 삭제
      const customerPricesSnapshot = await getDocs(collection(db, COLLECTIONS.CUSTOMER_PRICES));
      const updatePromises = customerPricesSnapshot.docs.map(async (customerPriceDoc) => {
        const customerPriceData = customerPriceDoc.data();
        const updatedPrices = customerPriceData.prices.filter(
          (price: any) => price.productId !== productId
        );

        await updateDoc(doc(db, COLLECTIONS.CUSTOMER_PRICES, customerPriceDoc.id), {
          prices: updatedPrices,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email,
        });
      });

      await Promise.all(updatePromises);

      // 상품 삭제
      await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, productId));
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
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2" title="상품의 이름을 입력하세요. 고객에게 표시되는 이름입니다.">
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
          <label htmlFor="price" className="block text-sm font-medium text-gray-700" title="상품의 기본 판매 가격을 USD로 입력하세요.">
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
          <label htmlFor="hsCode" className="block text-sm font-medium text-gray-700 mb-2" title="상품의 HS 코드를 입력하세요. 관세청에서 지정한 상품 분류 코드입니다.">
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
          <label htmlFor="origin" className="block text-sm font-medium text-gray-700 mb-2" title="상품의 원산지를 입력하세요. 기본값은 'KR'(한국)입니다.">
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
          <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-2" title="상품의 무게를 그램(g) 단위로 입력하세요.">
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

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="upc" className="block text-sm font-medium text-gray-700 mb-2" title="상품의 UPC 코드를 입력하세요. 글로벌 상품 식별 코드입니다.">
              UPC 코드
            </label>
            <input
              type="text"
              id="upc"
              value={upc}
              onChange={(e) => setUpc(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="UPC 코드를 입력하세요"
            />
          </div>
          <div>
            <label htmlFor="ean" className="block text-sm font-medium text-gray-700 mb-2" title="상품의 EAN 코드를 입력하세요. 유럽 상품 식별 코드입니다.">
              EAN 코드
            </label>
            <input
              type="text"
              id="ean"
              value={ean}
              onChange={(e) => setEan(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="EAN 코드를 입력하세요"
            />
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-2" title="상품의 정렬 순서를 입력하세요. 숫자가 작을수록 앞에 표시됩니다.">
            정렬 순서
          </label>
          <input
            type="number"
            id="sortOrder"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="정렬 순서를 입력하세요"
            min="0"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2" title="상품이 속할 카테고리를 선택하세요. 카테고리 관리에서 새로운 카테고리를 추가할 수 있습니다.">
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
          <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-2" title="상품이 속할 그룹을 선택하세요. 그룹 관리에서 새로운 그룹을 추가할 수 있습니다.">
            그룹
          </label>
          <select
            id="group"
            value={selectedGroupId || (groups[0]?.id || '')}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <div className="mt-2">
            <Link to="/groups" className="text-sm text-primary-600 hover:text-primary-900">
              그룹 관리
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-2" title="현재 보유한 상품의 재고 수량을 입력하세요.">
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
          <label htmlFor="stockStatus" className="block text-sm font-medium text-gray-700 mb-2" title="상품의 재고 상태를 선택하세요. '정상'은 재고가 있는 상태, '품절'은 재고가 없는 상태입니다.">
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
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2" title="상품의 사용 여부를 선택하세요. '미사용'으로 설정하면 상품이 고객에게 표시되지 않습니다.">
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
          <label htmlFor="productionStatus" className="block text-sm font-medium text-gray-700 mb-2" title="상품의 생산 상태를 선택하세요. 'inproduction'은 생산 중, 'discontinued'는 단종, 'out of sales'는 판매 중단을 의미합니다.">
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
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2" title="상품에 대한 상세 설명을 입력하세요. 고객에게 표시되는 상품 설명입니다.">
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
          <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2" title="상품 이미지를 업로드하세요. 지원되는 형식: JPG, PNG, GIF. 최대 파일 크기: 5MB. 32px,80px, 400px로 자동 리사이징 됩니다.">
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