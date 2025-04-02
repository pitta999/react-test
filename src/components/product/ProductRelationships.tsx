import React, { useState, useEffect, useContext } from 'react';
import { db } from 'firebaseApp';
import { collection, query, getDocs, addDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { COLLECTIONS, Product, ProductRelationship, ProductCategory } from 'types/schema';
import AuthContext from 'context/AuthContext';
import { toast } from 'react-toastify';
import Loader from 'components/common/Loader';

type SortField = 'sourceProduct' | 'targetProduct' | 'relationshipType' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export default function ProductRelationships() {
  const { user, isAdmin } = useContext(AuthContext);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [relationships, setRelationships] = useState<ProductRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedSourceProduct, setSelectedSourceProduct] = useState<string>('');
  const [selectedTargetProducts, setSelectedTargetProducts] = useState<string[]>([]);
  const [isBidirectional, setIsBidirectional] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [sourceCategory, setSourceCategory] = useState<string>('');
  const [targetCategory, setTargetCategory] = useState<string>('');
  const [filteredSourceProducts, setFilteredSourceProducts] = useState<Product[]>([]);
  const [filteredTargetProducts, setFilteredTargetProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchProducts();
    fetchCategories();
    fetchRelationships();
  }, [isAdmin]);

  const fetchCategories = async () => {
    try {
      const categoriesQuery = query(collection(db, COLLECTIONS.PRODUCT_CATEGORIES));
      const querySnapshot = await getDocs(categoriesQuery);
      const categoriesList = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as ProductCategory[];
      setCategories(categoriesList);
    } catch (error) {
      console.error('카테고리 목록을 불러오는 중 오류가 발생했습니다:', error);
      toast.error('카테고리 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  const fetchProducts = async () => {
    try {
      const productsQuery = query(collection(db, COLLECTIONS.PRODUCTS));
      const querySnapshot = await getDocs(productsQuery);
      const productsList = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Product[];
      
      // sortOrder로 정렬
      productsList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      
      setProducts(productsList);
    } catch (error) {
      console.error('상품 목록을 불러오는 중 오류가 발생했습니다:', error);
      toast.error('상품 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  const fetchRelationships = async () => {
    try {
      const relationshipsQuery = query(collection(db, COLLECTIONS.PRODUCT_RELATIONSHIPS));
      const querySnapshot = await getDocs(relationshipsQuery);
      const relationshipsList = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as ProductRelationship[];
      setRelationships(relationshipsList);
    } catch (error) {
      console.error('연관 상품 관계를 불러오는 중 오류가 발생했습니다:', error);
      toast.error('연관 상품 관계를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRelationship = async () => {
    if (!selectedSourceProduct || selectedTargetProducts.length === 0) {
      toast.error('소스 상품과 타겟 상품을 선택해주세요.');
      return;
    }

    try {
      setIsAdding(true);
      // 중복 관계 체크
      for (const targetProductId of selectedTargetProducts) {
        const existingRelationship = relationships.find(
          rel => rel.sourceProductId === selectedSourceProduct && 
                 rel.targetProductId === targetProductId
        );

        if (existingRelationship) {
          toast.error('이미 존재하는 연관 관계가 있습니다.');
          return;
        }
      }

      // 새로운 관계 추가 (여러 문서)
      for (const targetProductId of selectedTargetProducts) {
        await addDoc(collection(db, COLLECTIONS.PRODUCT_RELATIONSHIPS), {
          sourceProductId: selectedSourceProduct,
          targetProductId: targetProductId,
          bidirectional: isBidirectional,
          createdAt: new Date().toISOString(),
          createdBy: user?.email || user?.uid
        });
      }

      toast.success('연관 상품 관계가 추가되었습니다.');
      fetchRelationships();
      setSelectedSourceProduct('');
      setSelectedTargetProducts([]);
      setIsBidirectional(true);
    } catch (error) {
      console.error('연관 상품 관계 추가 중 오류가 발생했습니다:', error);
      toast.error('연관 상품 관계 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleTargetProductToggle = (productId: string) => {
    setSelectedTargetProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleDeleteRelationship = async (relationshipId: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.PRODUCT_RELATIONSHIPS, relationshipId));
      toast.success('연관 상품 관계가 삭제되었습니다.');
      fetchRelationships();
    } catch (error) {
      console.error('연관 상품 관계 삭제 중 오류가 발생했습니다:', error);
      toast.error('연관 상품 관계 삭제 중 오류가 발생했습니다.');
    }
  };

  const filteredRelationships = relationships.filter(relationship => {
    if (!selectedProduct) return true;
    
    return relationship.sourceProductId === selectedProduct || 
           relationship.targetProductId === selectedProduct;
  });

  const filteredProducts = products
    .filter(product => {
      if (!selectedCategory) return true;
      return product.categoryId === selectedCategory;
    })
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedRelationships = () => {
    return [...filteredRelationships].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'sourceProduct':
          const sourceProductA = products.find(p => p.id === a.sourceProductId)?.name || '';
          const sourceProductB = products.find(p => p.id === b.sourceProductId)?.name || '';
          comparison = sourceProductA.localeCompare(sourceProductB);
          break;
        case 'targetProduct':
          const targetProductA = products.find(p => p.id === a.targetProductId)?.name || '';
          const targetProductB = products.find(p => p.id === b.targetProductId)?.name || '';
          comparison = targetProductA.localeCompare(targetProductB);
          break;
        case 'relationshipType':
          comparison = (a.bidirectional ? 1 : 0) - (b.bidirectional ? 1 : 0);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // 소스 카테고리 변경 시 해당 카테고리의 상품 필터링
  useEffect(() => {
    if (sourceCategory) {
      const filtered = products
        .filter(product => product.categoryId === sourceCategory)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setFilteredSourceProducts(filtered);
      setSelectedSourceProduct(''); // 카테고리가 변경되면 선택된 상품 초기화
    } else {
      setFilteredSourceProducts(products);
    }
  }, [sourceCategory, products]);

  // 타겟 카테고리 변경 시 해당 카테고리의 상품 필터링
  useEffect(() => {
    if (targetCategory) {
      const filtered = products
        .filter(product => product.categoryId === targetCategory)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setFilteredTargetProducts(filtered);
      setSelectedTargetProducts([]); // 카테고리가 변경되면 선택된 상품 초기화
    } else {
      setFilteredTargetProducts(products);
    }
  }, [targetCategory, products]);

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">접근 권한이 없습니다</h2>
          <p className="text-gray-600 mb-8">관리자만 접근할 수 있는 페이지입니다.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">연관 상품 관리</h1>

      {/* 연관 상품 추가 폼 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">연관 상품 추가</h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-2 gap-8">
            {/* 소스 상품 선택 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">소스 상품</h4>
              <div className="space-y-4">
                <div>
                  <select
                    id="sourceCategory"
                    value={sourceCategory}
                    onChange={(e) => setSourceCategory(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-lg bg-white shadow-sm"
                  >
                    <option value="">카테고리 선택</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    id="sourceProduct"
                    value={selectedSourceProduct}
                    onChange={(e) => setSelectedSourceProduct(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-lg bg-white shadow-sm"
                    disabled={!sourceCategory}
                  >
                    <option value="">상품 선택</option>
                    {filteredSourceProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 타겟 상품 선택 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">타겟 상품</h4>
              <div className="space-y-4">
                <div>
                  <select
                    id="targetCategory"
                    value={targetCategory}
                    onChange={(e) => setTargetCategory(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-lg bg-white shadow-sm"
                  >
                    <option value="">카테고리 선택</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                  <div className="divide-y divide-gray-200">
                    {filteredTargetProducts.map((product) => (
                      <div
                        key={product.id}
                        className={`flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                          selectedTargetProducts.includes(product.id) ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleTargetProductToggle(product.id)}
                      >
                        <label 
                          className="flex items-center cursor-pointer w-full" 
                          onClick={(e) => e.stopPropagation()} // label 이벤트 전파 중지
                        >
                          <input
                            type="checkbox"
                            checked={selectedTargetProducts.includes(product.id)}
                            onChange={() => handleTargetProductToggle(product.id)} // 체크박스 자체 이벤트 핸들러
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            onClick={(e) => e.stopPropagation()} // 이 부분이 중요! 체크박스 클릭 이벤트만 중지
                          />
                          <span 
                            className="ml-3 text-sm text-gray-900"
                            // onClick={() => handleTargetProductToggle(product.id)} // span 자체 이벤트 핸들러
                          >
                            {product.name}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center">
            <input
              id="bidirectional"
              type="checkbox"
              checked={isBidirectional}
              onChange={(e) => setIsBidirectional(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="bidirectional" className="ml-2 block text-sm text-gray-900">
              양방향 관계
            </label>
          </div>

          <div className="mt-6">
            <button
              onClick={handleAddRelationship}
              disabled={isAdding}
              className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  추가 중...
                </>
              ) : (
                '연관 상품 추가'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 연관 상품 필터 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">연관 상품 필터</h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-4">
            <div>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedProduct('');
                }}
                className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-lg bg-white shadow-sm"
              >
                <option value="">전체 카테고리</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                id="product"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-lg bg-white shadow-sm"
                disabled={!selectedCategory}
              >
                <option value="">전체 상품</option>
                {filteredProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 연관 상품 목록 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {selectedProduct 
              ? `${products.find(p => p.id === selectedProduct)?.name || '알 수 없음'}의 연관 상품 목록`
              : '전체 연관 상품 목록'}
          </h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('sourceProduct')}
                  >
                    <div className="flex items-center">
                      소스 상품
                      {sortField === 'sourceProduct' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('targetProduct')}
                  >
                    <div className="flex items-center">
                      타겟 상품
                      {sortField === 'targetProduct' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('relationshipType')}
                  >
                    <div className="flex items-center">
                      관계 유형
                      {sortField === 'relationshipType' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center">
                      생성일
                      {sortField === 'createdAt' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getSortedRelationships().map((relationship) => {
                  const sourceProduct = products.find(p => p.id === relationship.sourceProductId);
                  const targetProduct = products.find(p => p.id === relationship.targetProductId);

                  return (
                    <tr key={relationship.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {sourceProduct?.name || '알 수 없음'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {targetProduct?.name || '알 수 없음'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          relationship.bidirectional
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {relationship.bidirectional ? '양방향' : '단방향'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(relationship.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDeleteRelationship(relationship.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 