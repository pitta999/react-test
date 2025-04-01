import React, { useState, useCallback } from 'react';
import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from '@tanstack/react-table';
import { db } from 'firebaseApp';
import { collection, addDoc, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { COLLECTIONS, Product } from 'types/schema';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

interface SheetData {
  name: string;
  price: number;
  description: string;
  categoryId: string;
  categoryName: string;
  groupId: string;
  groupName: string;
  stock: number;
  stockStatus: 'ok' | 'nok';
  imageUrl: {
    thumbnail: string;
    small: string;
    original: string;
  };
  status: boolean;
  hsCode: string;
  origin: string;
  weight: number;
  productionStatus: 'inproduction' | 'discontinued' | 'out of sales';
  upc: string;
  ean: string;
  sortOrder: number;
}

const columns: ColumnDef<SheetData>[] = [
  { header: '상품명', accessorKey: 'name' },
  { header: '가격', accessorKey: 'price' },
  { header: '설명', accessorKey: 'description' },
  { header: '카테고리ID', accessorKey: 'categoryId' },
  { header: '카테고리명', accessorKey: 'categoryName' },
  { header: '그룹ID', accessorKey: 'groupId' },
  { header: '그룹명', accessorKey: 'groupName' },
  { header: '재고', accessorKey: 'stock' },
  { header: '재고상태', accessorKey: 'stockStatus' },
  { header: '이미지URL', accessorKey: 'imageUrl' },
  { header: '상태', accessorKey: 'status' },
  { header: 'HS코드', accessorKey: 'hsCode' },
  { header: '원산지', accessorKey: 'origin' },
  { header: '무게', accessorKey: 'weight' },
  { header: '생산상태', accessorKey: 'productionStatus' },
  { header: 'UPC', accessorKey: 'upc' },
  { header: 'EAN', accessorKey: 'ean' },
  { header: '정렬순서', accessorKey: 'sortOrder' },
];

const createEmptyRow = (): SheetData => ({
  name: '',
  price: 0,
  description: '',
  categoryId: '',
  categoryName: '',
  groupId: '',
  groupName: '',
  stock: 0,
  stockStatus: 'nok',
  imageUrl: {
    thumbnail: '',
    small: '',
    original: ''
  },
  status: false,
  hsCode: '',
  origin: '',
  weight: 0,
  productionStatus: 'inproduction',
  upc: '',
  ean: '',
  sortOrder: 0,
});

export default function ExcelUpload() {
  const [data, setData] = useState<SheetData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // 데이터 변환 및 검증
        const processedData = jsonData.map((row: any) => ({
          name: row['상품명'] || '',
          price: Number(row['가격']) || 0,
          description: row['설명'] || '',
          categoryId: row['카테고리ID'] || '',
          categoryName: row['카테고리명'] || '',
          groupId: row['그룹ID'] || '',
          groupName: row['그룹명'] || '',
          stock: Number(row['재고']) || 0,
          stockStatus: (row['재고상태'] === 'ok' ? 'ok' : 'nok') as 'ok' | 'nok',
          imageUrl: {
            thumbnail: row['이미지URL'] || '',
            small: row['이미지URL'] || '',
            original: row['이미지URL'] || ''
          },
          status: row['상태'] === true,
          hsCode: row['HS코드'] || '',
          origin: row['원산지'] || 'KR',
          weight: Number(row['무게']) || 0,
          productionStatus: (row['생산상태'] || 'inproduction') as 'inproduction' | 'discontinued' | 'out of sales',
          upc: row['UPC'] || '',
          ean: row['EAN'] || '',
          sortOrder: Number(row['정렬순서']) || 0
        }));

        setData(processedData);
        toast.success('엑셀 파일이 성공적으로 로드되었습니다.');
      } catch (error) {
        console.error('엑셀 파일 처리 중 오류:', error);
        toast.error('엑셀 파일 처리 중 오류가 발생했습니다.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    const validData = data.filter(row => row.name.trim() !== '');
    
    if (validData.length === 0) {
      toast.error('업로드할 데이터가 없습니다.');
      return;
    }

    try {
      setIsLoading(true);
      
      // 상품 등록
      const productIds = validData.map(() => uuidv4());
      const batch = validData.map((item, index) => {
        const productId = productIds[index];
        const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
        return setDoc(productRef, {
          ...item,
          id: productId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      await Promise.all(batch);
      
      // customerPrices 업데이트
      const customerPricesSnapshot = await getDocs(collection(db, COLLECTIONS.CUSTOMER_PRICES));
      const updatePromises = customerPricesSnapshot.docs.map(async (customerPriceDoc) => {
        const customerPriceData = customerPriceDoc.data();
        const newPrices = [
          ...customerPriceData.prices,
          ...validData.map((item, index) => ({
            productId: productIds[index],
            productName: item.name,
            customPrice: item.price,
            categoryId: item.categoryId,
            categoryName: item.categoryName,
            groupId: item.groupId,
            groupName: item.groupName,
          }))
        ];

        await updateDoc(doc(db, COLLECTIONS.CUSTOMER_PRICES, customerPriceDoc.id), {
          prices: newPrices,
          updatedAt: new Date().toISOString(),
        });
      });

      await Promise.all(updatePromises);
      toast.success('상품이 성공적으로 등록되었습니다.');
      setData([]);
    } catch (error) {
      console.error('상품 등록 중 오류가 발생했습니다:', error);
      toast.error('상품 등록 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      // products 컬렉션에서 데이터 가져오기
      const productsSnapshot = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
      const productsData = productsSnapshot.docs
        .map(doc => ({
          상품명: doc.data().name || '',
          가격: doc.data().price || 0,
          설명: doc.data().description || '',
          카테고리ID: doc.data().categoryId || '',
          카테고리명: doc.data().categoryName || '',
          그룹ID: doc.data().groupId || '',
          그룹명: doc.data().groupName || '',
          재고: doc.data().stock || 0,
          재고상태: doc.data().stockStatus || 'nok',
          이미지URL: doc.data().imageUrl?.thumbnail || '',
          상태: doc.data().status || false,
          HS코드: doc.data().hsCode || '',
          원산지: doc.data().origin || 'KR',
          무게: doc.data().weight || 0,
          생산상태: doc.data().productionStatus || 'inproduction',
          UPC: doc.data().upc || '',
          EAN: doc.data().ean || '',
          정렬순서: doc.data().sortOrder || 0
        }))
        .sort((a, b) => a.정렬순서 - b.정렬순서); // sortOrder 순으로 정렬

      // 워크북 생성
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(productsData);

      // 컬럼 너비 설정
      const colWidths = [
        { wch: 30 }, // 상품명
        { wch: 15 }, // 가격
        { wch: 50 }, // 설명
        { wch: 15 }, // 카테고리ID
        { wch: 20 }, // 카테고리명
        { wch: 15 }, // 그룹ID
        { wch: 20 }, // 그룹명
        { wch: 10 }, // 재고
        { wch: 10 }, // 재고상태
        { wch: 50 }, // 이미지URL
        { wch: 10 }, // 상태
        { wch: 15 }, // HS코드
        { wch: 10 }, // 원산지
        { wch: 10 }, // 무게
        { wch: 15 }, // 생산상태
        { wch: 15 }, // UPC
        { wch: 15 }, // EAN
        { wch: 10 }, // 정렬순서
      ];
      ws['!cols'] = colWidths;

      // 워크시트를 워크북에 추가
      XLSX.utils.book_append_sheet(wb, ws, '상품 목록');

      // 파일 다운로드
      XLSX.writeFile(wb, `상품목록_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast.success('엑셀 파일이 성공적으로 다운로드되었습니다.');
    } catch (error) {
      console.error('엑셀 파일 다운로드 중 오류:', error);
      toast.error('엑셀 파일 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">엑셀 파일로 상품 일괄 등록</h2>
        <div className="flex space-x-4">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`px-4 py-2 rounded-md text-white ${
              isDownloading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isDownloading ? '다운로드 중...' : '엑셀 다운로드'}
          </button>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="excel-file"
          />
          <label
            htmlFor="excel-file"
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer"
          >
            엑셀 파일 선택
          </label>
          <button
            onClick={handleUpload}
            disabled={isLoading || data.length === 0}
            className={`px-4 py-2 rounded-md text-white ${
              isLoading || data.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? '업로드 중...' : '업로드'}
          </button>
        </div>
      </div>

      {data.length > 0 && (
        <div className="overflow-x-auto border rounded-lg">
          <div className="min-w-[2000px]">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
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
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
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
          <li>엑셀 파일을 준비합니다. (첫 번째 행은 헤더여야 합니다)</li>
          <li>'엑셀 파일 선택' 버튼을 클릭하여 파일을 선택합니다.</li>
          <li>데이터를 확인하고 '업로드' 버튼을 클릭합니다.</li>
        </ol>
        <p className="mt-2">필수 컬럼:</p>
        <ul className="list-disc list-inside">
          <li>상품명</li>
          <li>가격</li>
          <li>카테고리ID</li>
          <li>카테고리명</li>
          <li>그룹ID</li>
          <li>그룹명</li>
        </ul>
      </div>
    </div>
  );
}
