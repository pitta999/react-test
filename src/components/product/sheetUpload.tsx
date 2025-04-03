import React, { useState, useCallback, useEffect } from 'react';
import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from '@tanstack/react-table';
import { db } from 'firebaseApp';
import { collection, getDocs, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { COLLECTIONS, Product } from 'types/schema';
import { toast } from 'react-toastify';
import Loader from 'components/common/Loader';

interface SheetData extends Product {
  isModified?: boolean;
}

interface CategoryInfo {
  id: string;
  name: string;
}

const columns: ColumnDef<SheetData>[] = [
  { 
    header: '상품명', 
    accessorKey: 'name',
    size: 300,
  },
  { header: '가격', accessorKey: 'price' },
  { header: '설명', accessorKey: 'description' },
  { header: '카테고리', accessorKey: 'categoryName' },
  { header: '그룹', accessorKey: 'groupName' },
  { header: '재고', accessorKey: 'stock' },
  { header: '재고상태', accessorKey: 'stockStatus' },
  { header: '상태', accessorKey: 'status' },
  { header: 'HS코드', accessorKey: 'hsCode' },
  { header: '원산지', accessorKey: 'origin' },
  { header: '무게', accessorKey: 'weight' },
  { header: '생산상태', accessorKey: 'productionStatus' },
  { header: 'UPC', accessorKey: 'upc' },
  { header: 'EAN', accessorKey: 'ean' },
  { header: '정렬순서', accessorKey: 'sortOrder' },
];

export default function SheetUpload() {
  const [data, setData] = useState<SheetData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // 카테고리 목록 불러오기
  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.PRODUCT_CATEGORIES));
      const categoryList: CategoryInfo[] = [];
      querySnapshot.forEach((doc) => {
        categoryList.push({
          id: doc.id,
          name: doc.data().name
        });
      });
      setCategories(categoryList);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("카테고리 목록을 불러오는 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 상품 목록 불러오기
  const fetchProducts = async () => {
    if (!selectedCategory) {
      toast.error("카테고리를 선택해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      // 먼저 카테고리 ID로 필터링
      const productsQuery = query(
        collection(db, COLLECTIONS.PRODUCTS),
        where("categoryId", "==", selectedCategory)
      );
      
      const querySnapshot = await getDocs(productsQuery);
      const products: SheetData[] = [];
      
      querySnapshot.forEach((doc) => {
        const productData = doc.data() as Product;
        products.push({
          ...productData,
          id: doc.id,
          isModified: false
        });
      });
      
      // 메모리에서 정렬
      products.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      
      setData(products);
      toast.success('상품 목록을 불러왔습니다.');
    } catch (error: any) {
      console.error('상품 목록 불러오기 실패:', error);
      if (error.code === 'permission-denied') {
        toast.error('데이터베이스 접근 권한이 없습니다.');
      } else if (error.code === 'not-found') {
        toast.error('상품 데이터를 찾을 수 없습니다.');
      } else {
        toast.error(`상품 목록을 불러오는 중 오류가 발생했습니다: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 셀 값 변경 핸들러
  const handleCellChange = (rowIndex: number, columnId: keyof SheetData, value: any) => {
    const updatedData = [...data];
    updatedData[rowIndex] = {
      ...updatedData[rowIndex],
      [columnId]: value,
      isModified: true
    };
    setData(updatedData);
  };

  // 일괄 저장 핸들러
  const handleSave = async () => {
    const modifiedProducts = data.filter(product => product.isModified);
    
    if (modifiedProducts.length === 0) {
      toast.info('수정된 상품이 없습니다.');
      return;
    }

    setIsSaving(true);
    try {
      const updatePromises = modifiedProducts.map(product => {
        const { id, isModified, ...productData } = product;
        return updateDoc(doc(db, COLLECTIONS.PRODUCTS, id), {
          ...productData,
          updatedAt: new Date().toISOString()
        });
      });

      await Promise.all(updatePromises);
      toast.success('상품 정보가 성공적으로 수정되었습니다.');
      
      // 수정 완료 후 목록 새로고침
      fetchProducts();
    } catch (error) {
      console.error('상품 정보 수정 실패:', error);
      toast.error('상품 정보 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 셀 렌더링 함수
  const renderCell = (rowIndex: number, columnId: keyof SheetData, value: any) => {
    const commonProps = {
      onChange: (e: any) => handleCellChange(rowIndex, columnId, e.target.value),
      className: "w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500",
    };

    switch (columnId) {
      case 'name':
        return (
          <input
            {...commonProps}
            type="text"
            value={value}
            className={`${commonProps.className} min-w-[300px] ${
              data[rowIndex].isModified ? 'bg-blue-50' : ''
            }`}
          />
        );
      case 'stockStatus':
        return (
          <select
            {...commonProps}
            value={value}
            className={`${commonProps.className} ${
              data[rowIndex].isModified ? 'bg-blue-50' : ''
            }`}
          >
            <option value="ok">정상</option>
            <option value="nok">품절</option>
          </select>
        );
      case 'status':
        return (
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => handleCellChange(rowIndex, columnId, e.target.checked)}
            className={`w-4 h-4 ${
              data[rowIndex].isModified ? 'bg-blue-50' : ''
            }`}
          />
        );
      case 'productionStatus':
        return (
          <select
            {...commonProps}
            value={value}
            className={`${commonProps.className} ${
              data[rowIndex].isModified ? 'bg-blue-50' : ''
            }`}
          >
            <option value="inproduction">inproduction</option>
            <option value="discontinued">discontinued</option>
            <option value="out of sales">out of sales</option>
          </select>
        );
      case 'price':
      case 'stock':
      case 'weight':
      case 'sortOrder':
        return (
          <input
            {...commonProps}
            type="number"
            value={value}
            min="0"
            className={`${commonProps.className} ${
              data[rowIndex].isModified ? 'bg-blue-50' : ''
            }`}
          />
        );
      default:
        return (
          <input
            {...commonProps}
            type="text"
            value={value}
            className={`${commonProps.className} ${
              data[rowIndex].isModified ? 'bg-blue-50' : ''
            }`}
          />
        );
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">상품 일괄 수정</h2>
        <div className="flex space-x-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">카테고리 선택</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <button
            onClick={fetchProducts}
            disabled={!selectedCategory}
            className={`px-4 py-2 rounded-md text-white ${
              !selectedCategory
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            불러오기
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || data.filter(row => row.isModified).length === 0}
            className={`px-4 py-2 rounded-md text-white ${
              isSaving || data.filter(row => row.isModified).length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSaving ? '수정 중...' : '수정하기'}
          </button>
        </div>
      </div>

      {data.length > 0 && (
        <div className="overflow-x-auto border rounded-lg">
          <div className="min-w-[2000px] relative">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header, index) => (
                      <th
                        key={header.id}
                        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ${
                          index === 0 ? 'sticky left-0 bg-gray-50 z-20 border-r border-gray-200' : ''
                        }`}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table.getRowModel().rows.map((row, rowIndex) => (
                  <tr 
                    key={row.id}
                    className={`${
                      rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } ${
                      data[rowIndex].isModified ? 'bg-blue-50' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => (
                      <td
                        key={cell.id}
                        className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${
                          cellIndex === 0 ? `sticky left-0 z-10 border-r border-gray-200 ${
                            rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }` : ''
                        } ${data[rowIndex].isModified ? 'bg-blue-50' : ''}`}
                      >
                        {renderCell(rowIndex, cell.column.id as keyof SheetData, cell.getValue())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p>사용 방법:</p>
        <ol className="list-decimal list-inside">
          <li>카테고리를 선택합니다.</li>
          <li>'불러오기' 버튼을 클릭하여 상품 목록을 불러옵니다.</li>
          <li>수정이 필요한 셀을 클릭하여 값을 변경합니다.</li>
          <li>수정된 상품은 파란색 배경으로 표시됩니다.</li>
          <li>'저장하기' 버튼을 클릭하여 변경사항을 저장합니다.</li>
        </ol>
      </div>
    </div>
  );
}
