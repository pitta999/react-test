import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "firebaseApp";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { Product, COLLECTIONS } from "types/schema";
import Loader from "./Loader";

export default function ProductManage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 카테고리 목록 불러오기
  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "productCategories"));
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
      const querySnapshot = await getDocs(collection(db, "products"));
      const productList: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Product;
        productList.push({ ...data, id: doc.id });
      });
      setProducts(productList.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
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

  // 상품 삭제
  const handleDelete = async (productId: string) => {
    if (window.confirm("이 상품을 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, "products", productId));
        toast.success("상품이 삭제되었습니다.");
        fetchProducts(); // 목록 새로고침
      } catch (error) {
        console.error("Error deleting product:", error);
        toast.error("상품 삭제 중 오류가 발생했습니다.");
      }
    }
  };

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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상품명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                카테고리
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                가격
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                재고
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                재고 현황
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                사용 여부
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                등록일
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
                  {product.price.toLocaleString()}원
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
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  등록된 상품이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 