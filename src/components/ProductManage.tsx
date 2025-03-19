import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "firebaseApp";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { Product, COLLECTIONS } from "types/schema";
import Loader from "./Loader";

type SortField = 'name' | 'category' | 'price' | 'stock' | 'stockStatus' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export default function ProductManage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categorizedProducts, setCategorizedProducts] = useState<{[key: string]: Product[]}>({});
  const [categories, setCategories] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'createdAt',
    direction: 'desc'
  });

  // 정렬 함수
  const sortProducts = (products: Product[], field: SortField, direction: SortDirection) => {
    return [...products].sort((a, b) => {
      let comparison = 0;
      
      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'category':
          comparison = (categories[a.categoryId] || '').localeCompare(categories[b.categoryId] || '');
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'stock':
          comparison = a.stock - b.stock;
          break;
        case 'stockStatus':
          comparison = a.stockStatus.localeCompare(b.stockStatus);
          break;
        case 'status':
          comparison = (a.status === b.status) ? 0 : a.status ? 1 : -1;
          break;
        case 'createdAt':
          comparison = a.createdAt.localeCompare(b.createdAt);
          break;
        default:
          comparison = 0;
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
  };

  // 정렬 핸들러
  const handleSort = (field: SortField) => {
    setSortConfig(prevConfig => ({
      field,
      direction: prevConfig.field === field && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 정렬 아이콘 렌더링
  const renderSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return '';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

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
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
      const productList: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Product;
        productList.push({ ...data, id: doc.id });
      });
      
      // 카테고리별로 상품 분류
      const categorized: {[key: string]: Product[]} = {};
      productList.forEach(product => {
        if (!categorized[product.categoryName]) {
          categorized[product.categoryName] = [];
        }
        categorized[product.categoryName].push(product);
      });

      // 각 카테고리 내에서 상품 정렬
      const sortedCategorized: {[key: string]: Product[]} = {};
      Object.keys(categorized).forEach(categoryName => {
        sortedCategorized[categoryName] = sortProducts(
          categorized[categoryName], 
          sortConfig.field, 
          sortConfig.direction
        );
      });

      // 카테고리 순서 지정
      const categoryOrder = ['dashcam', 'accessory', 'companion'];
      const orderedCategories = Object.keys(sortedCategorized).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      const orderedCategorizedProducts: {[key: string]: Product[]} = {};
      orderedCategories.forEach(categoryName => {
        orderedCategorizedProducts[categoryName] = sortedCategorized[categoryName];
      });

      setCategorizedProducts(orderedCategorizedProducts);
      setProducts(productList);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("상품 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // 정렬 설정이 변경될 때마다 카테고리별 상품 목록 업데이트
  useEffect(() => {
    const sortedCategorized: {[key: string]: Product[]} = {};
    
    // 각 카테고리별로 정렬 적용
    Object.keys(categorizedProducts).forEach(categoryName => {
      sortedCategorized[categoryName] = sortProducts(
        [...categorizedProducts[categoryName]], 
        sortConfig.field, 
        sortConfig.direction
      );
    });
    
    setCategorizedProducts(sortedCategorized);
  }, [sortConfig]);


  // 상품 테이블 렌더링 함수
  const renderProductTable = (title: string, products: Product[]) => (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                상품명 {renderSortIcon('name')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('category')}
              >
                카테고리 {renderSortIcon('category')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('price')}
              >
                가격 {renderSortIcon('price')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('stock')}
              >
                재고 {renderSortIcon('stock')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('stockStatus')}
              >
                재고 현황 {renderSortIcon('stockStatus')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                사용 여부 {renderSortIcon('status')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('createdAt')}
              >
                등록일 {renderSortIcon('createdAt')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {product.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {categories[product.categoryId] || '카테고리 없음'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.price.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.stock}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    product.stockStatus === 'ok' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.stockStatus === 'ok' ? '정상' : '품절'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    product.status 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {product.status ? '사용' : '미사용'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.createdAt}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <Link
                      to={`/products/${product.id}`}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      보기
                    </Link>
                    <Link
                      to={`/products/${product.id}/edit`}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      수정
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">상품 관리</h2>
        <Link
          to="/products/new"
          className="text-primary-600 hover:text-primary-900 flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 상품 등록
        </Link>
      </div>

      {Object.keys(categorizedProducts).map(categoryName => (
        renderProductTable(categoryName, categorizedProducts[categoryName])
      ))}
    </div>
  );
} 