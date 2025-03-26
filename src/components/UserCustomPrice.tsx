import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { db } from "firebaseApp";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { CustomerPrice, Product, User, COLLECTIONS, PriceHistoryItem } from "types/schema";
import { getCustomerPrices, getProductsByCategory, getUserById, updateCustomerPrices } from "utils/firebase";
import AuthContext from "context/AuthContext";
import Loader from "./Loader";

interface PriceFormData {
  productId: string;
  productName: string;
  customPrice: number;
  categoryId: string;
  categoryName: string;
}

// 계산 공식 인터페이스
interface PriceFormula {
  multiplier: number; // 곱하기 값
  roundType: 'round' | 'ceil' | 'floor'; // 반올림, 올림, 내림
  roundDigit: number; // 자릿수
  adjustment: number; // 더하기/빼기 값
  adjustmentType: 'add' | 'subtract'; // 더하기 또는 빼기
}

export default function UserCustomPrice() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: authUser, isAdmin } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<PriceFormData[]>([]);
  const [originalPrices, setOriginalPrices] = useState<PriceFormData[]>([]);
  
  // 정렬 관련 상태
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  }>({ key: 'categoryName', direction: 'ascending' });
  
  // 일괄 계산 관련 상태
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [formula, setFormula] = useState<PriceFormula>({
    multiplier: 0.9, // 기본값 90%
    roundType: 'round',
    roundDigit: 0, // 기본값을 1달러 단위로 변경
    adjustment: 0,
    adjustmentType: 'add'
  });

  // 정렬 요청 처리 함수
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    
    // 같은 키로 다시 정렬하면 방향을 반대로 변경
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    setSortConfig({ key, direction });
  };

  // 정렬된 가격 목록 계산
  const getSortedPrices = () => {
    const sortablePrices = [...prices];
    
    if (sortConfig.key) {
      sortablePrices.sort((a, b) => {
        // 기본 카테고리 정렬
        if (sortConfig.key !== 'categoryName' && a.categoryName !== b.categoryName) {
          return a.categoryName.localeCompare(b.categoryName);
        }
        
        // 기본 제품명 정렬 (카테고리가 같을 경우)
        if (sortConfig.key !== 'categoryName' && sortConfig.key !== 'productName' && 
            a.categoryName === b.categoryName) {
          return a.productName.localeCompare(b.productName);
        }
        
        // 지정된 키로 정렬
        if (sortConfig.key === 'originalPrice') {
          const aProduct = products.find(p => p.id === a.productId);
          const bProduct = products.find(p => p.id === b.productId);
          const aPrice = aProduct?.price || 0;
          const bPrice = bProduct?.price || 0;
          return sortConfig.direction === 'ascending' ? aPrice - bPrice : bPrice - aPrice;
        } else if (sortConfig.key === 'customPrice') {
          return sortConfig.direction === 'ascending' 
            ? a.customPrice - b.customPrice 
            : b.customPrice - a.customPrice;
        } else {
          // 문자열 비교 (카테고리, 제품명)
          const aValue = a[sortConfig.key as keyof PriceFormData] as string;
          const bValue = b[sortConfig.key as keyof PriceFormData] as string;
          
          if (sortConfig.direction === 'ascending') {
            return aValue.localeCompare(bValue);
          } else {
            return bValue.localeCompare(aValue);
          }
        }
      });
    }
    
    return sortablePrices;
  };

  // 화살표 렌더링 함수
  const renderSortArrow = (columnKey: string) => {
    if (sortConfig.key === columnKey) {
      return sortConfig.direction === 'ascending' ? ' ↑' : ' ↓';
    }
    return '';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!userId) {
          console.log("userId is undefined");
          toast.error("사용자 ID가 필요합니다.");
          navigate("/users");
          return;
        }
        
        console.log("Fetching user data for userId:", userId);

        // 사용자 정보 가져오기
        const userData = await getUserById(userId);
        console.log("Fetched user data:", userData);
        
        if (!userData) {
          toast.error("사용자를 찾을 수 없습니다.");
          navigate("/users");
          return;
        }
        setUserData(userData);

        // 모든 제품 가져오기
        const allProducts = await getProductsByCategory("");
        console.log("Fetched products:", allProducts);
        setProducts(allProducts);

        // 기존 맞춤 가격 가져오기
        const existingPrices = await getCustomerPrices(userId);
        console.log("Fetched customer prices:", existingPrices);
        
        if (existingPrices) {
          // 기본 정렬 적용 (카테고리 순, 제품명 순)
          const sortedPrices = [...existingPrices.prices].sort((a, b) => {
            // 카테고리로 먼저 정렬
            const categoryCompare = a.categoryName.localeCompare(b.categoryName);
            // 카테고리가 같으면 제품명으로 정렬
            return categoryCompare !== 0 ? categoryCompare : a.productName.localeCompare(b.productName);
          });
          
          setPrices(sortedPrices);
          setOriginalPrices(sortedPrices);
        } else {
          // 새로운 가격 목록 초기화
          const initialPrices = allProducts.map(product => ({
            productId: product.id,
            productName: product.name,
            customPrice: product.price,
            categoryId: product.categoryId,
            categoryName: product.categoryName,
          })).sort((a, b) => {
            // 카테고리로 먼저 정렬
            const categoryCompare = a.categoryName.localeCompare(b.categoryName);
            // 카테고리가 같으면 제품명으로 정렬
            return categoryCompare !== 0 ? categoryCompare : a.productName.localeCompare(b.productName);
          });
          
          setPrices(initialPrices);
          setOriginalPrices(initialPrices);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("데이터를 불러오는 중 오류가 발생했습니다.");
        navigate("/users");
      }
    };

    fetchData();
  }, [userId, navigate]);

  const handlePriceChange = (productId: string, value: number) => {
    // 달러 표시에 맞게 소수점 둘째 자리(센트)까지만 저장하고 나머지는 내림 처리
    const roundedValue = Math.floor(value * 100) / 100;
    
    setPrices(prev => 
      prev.map(price => 
        price.productId === productId 
          ? { ...price, customPrice: roundedValue }
          : price
      )
    );
  };

  const saveHistoryRecord = async (changedPrices: PriceFormData[]) => {
    if (!userId || !authUser || !userData) return;

    try {
      const historyRef = doc(db, COLLECTIONS.CUSTOMER_PRICE_HISTORY, userId);
      const historyDoc = await getDoc(historyRef);
      
      // 변경된 가격만 필터링
      const priceChanges = changedPrices.filter(newPrice => {
        const originalPrice = originalPrices.find(p => p.productId === newPrice.productId);
        return originalPrice && originalPrice.customPrice !== newPrice.customPrice;
      });

      if (priceChanges.length === 0) return; // 변경된 가격이 없으면 기록하지 않음

      const historyItem: PriceHistoryItem = {
        adminEmail: authUser.email || "",
        updatedAt: new Date().toLocaleString("ko-KR"),
        changes: priceChanges.map(change => {
          const originalPrice = originalPrices.find(p => p.productId === change.productId);
          return {
            productId: change.productId,
            productName: change.productName,
            previousPrice: originalPrice?.customPrice || 0,
            newPrice: change.customPrice,
          };
        }),
      };

      if (historyDoc.exists()) {
        // 기존 이력에 추가
        const existingHistory = historyDoc.data();
        await setDoc(historyRef, {
          ...existingHistory,
          history: [...existingHistory.history, historyItem],
          updatedAt: new Date().toLocaleString("ko-KR"),
          updatedBy: authUser.email,
        });
      } else {
        // 새로운 이력 문서 생성
        await setDoc(historyRef, {
          userId,
          userEmail: userData.email,
          companyName: userData.fullCompanyName,
          history: [historyItem],
          id: userId,
          createdAt: new Date().toLocaleString("ko-KR"),
          createdBy: authUser.email || "",
          updatedAt: new Date().toLocaleString("ko-KR"),
          updatedBy: authUser.email || "",
        });
      }
    } catch (error) {
      console.error("Error saving price history:", error);
      toast.error("가격 수정 이력 저장 중 오류가 발생했습니다.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    try {
      await updateCustomerPrices(userId!, {
        userId: userData.id,
        userEmail: userData.email,
        companyName: userData.fullCompanyName,
        prices,
      });

      // 가격 수정 이력 저장
      await saveHistoryRecord(prices);
      
      // 현재 가격을 원본 가격으로 업데이트
      setOriginalPrices(prices);
      
      toast.success("맞춤 가격이 저장되었습니다.");
      navigate(`/users/${userId}/price/history`);
    } catch (error) {
      console.error("Error saving prices:", error);
      toast.error("가격 저장 중 오류가 발생했습니다.");
    }
  };

  // 공식에 따라 가격 계산하는 함수
  const calculatePrice = (originalPrice: number): number => {
    // 1. 곱하기 계산
    let result = originalPrice * formula.multiplier;
    
    // 2. 반올림, 올림, 내림 계산
    const roundBase = Math.pow(10, formula.roundDigit);
    if (formula.roundType === 'round') {
      result = Math.round(result / roundBase) * roundBase;
    } else if (formula.roundType === 'ceil') {
      result = Math.ceil(result / roundBase) * roundBase;
    } else if (formula.roundType === 'floor') {
      result = Math.floor(result / roundBase) * roundBase;
    }
    
    // 3. 더하기/빼기 적용
    if (formula.adjustmentType === 'add') {
      result += formula.adjustment;
    } else {
      result -= formula.adjustment;
    }
    
    // 4. 달러 표시에 맞게 소수점 둘째 자리(센트)까지만 표시하고 나머지는 내림 처리
    return Math.floor(result * 100) / 100;
  };

  // 일괄 계산 적용 함수
  const applyFormula = () => {
    setPrices(prev => 
      prev.map(price => {
        const product = products.find(p => p.id === price.productId);
        if (!product) return price;
        
        const newCustomPrice = calculatePrice(product.price);
        return {
          ...price,
          customPrice: newCustomPrice
        };
      })
    );
    
    setShowFormulaModal(false);
    toast.success("일괄 계산이 적용되었습니다.");
  };

  // 공식 입력값 변경 핸들러
  const handleFormulaChange = (field: keyof PriceFormula, value: any) => {
    setFormula(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 가격 포맷팅 함수
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  if (!isAdmin) {
    return <div className="p-4">관리자만 접근할 수 있습니다.</div>;
  }

  if (loading || !userData) {
    return <Loader />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {userData.fullCompanyName} 맞춤 가격 설정
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFormulaModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            일괄 계산
          </button>
          <Link
            to={`/users/${userId}/price/history`}
            className="text-indigo-600 hover:text-indigo-900 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            가격 수정 이력
          </Link>
        </div>
      </div>

      {/* 일괄 계산 모달 */}
      {showFormulaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">가격 일괄 계산</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  1. 정상가 × 
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formula.multiplier}
                  onChange={(e) => handleFormulaChange('multiplier', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="곱할 값 (예: 0.9는 90%)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  값 예시: 0.9 = 정상가의 90%, 0.8 = 정상가의 80%
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  2. 반올림 방식
                </label>
                <div className="flex space-x-2 mb-2">
                  <button
                    type="button"
                    onClick={() => handleFormulaChange('roundType', 'round')}
                    className={`px-3 py-1 border rounded-md ${
                      formula.roundType === 'round' 
                        ? 'bg-indigo-100 border-indigo-500' 
                        : 'border-gray-300'
                    }`}
                  >
                    반올림
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFormulaChange('roundType', 'ceil')}
                    className={`px-3 py-1 border rounded-md ${
                      formula.roundType === 'ceil' 
                        ? 'bg-indigo-100 border-indigo-500' 
                        : 'border-gray-300'
                    }`}
                  >
                    올림
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFormulaChange('roundType', 'floor')}
                    className={`px-3 py-1 border rounded-md ${
                      formula.roundType === 'floor' 
                        ? 'bg-indigo-100 border-indigo-500' 
                        : 'border-gray-300'
                    }`}
                  >
                    내림
                  </button>
                </div>
                
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  자릿수
                </label>
                <select
                  value={formula.roundDigit}
                  onChange={(e) => handleFormulaChange('roundDigit', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value={-2}>센트 단위 ($0.01)</option>
                  <option value={-1}>10센트 단위 ($0.10)</option>
                  <option value={0}>1달러 단위 ($1)</option>
                  <option value={1}>10달러 단위 ($10)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  3. 단수 조정
                </label>
                <div className="flex space-x-2 mb-2">
                  <button
                    type="button"
                    onClick={() => handleFormulaChange('adjustmentType', 'add')}
                    className={`px-3 py-1 border rounded-md ${
                      formula.adjustmentType === 'add' 
                        ? 'bg-indigo-100 border-indigo-500' 
                        : 'border-gray-300'
                    }`}
                  >
                    더하기 (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFormulaChange('adjustmentType', 'subtract')}
                    className={`px-3 py-1 border rounded-md ${
                      formula.adjustmentType === 'subtract' 
                        ? 'bg-indigo-100 border-indigo-500' 
                        : 'border-gray-300'
                    }`}
                  >
                    빼기 (-)
                  </button>
                </div>
                
                <input
                  type="number"
                  value={formula.adjustment}
                  onChange={(e) => handleFormulaChange('adjustment', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="조정할 값"
                  step="0.01"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              >
                취소
              </button>
              <button
                type="button"
                onClick={applyFormula}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                적용하기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <form onSubmit={handleSubmit}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('categoryName')}
                >
                  카테고리{renderSortArrow('categoryName')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('productName')}
                >
                  제품명{renderSortArrow('productName')}
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('originalPrice')}
                >
                  정상가{renderSortArrow('originalPrice')}
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('customPrice')}
                >
                  맞춤가{renderSortArrow('customPrice')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getSortedPrices().map((price) => (
                <tr key={price.productId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {price.categoryName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {price.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {formatPrice(products.find(p => p.id === price.productId)?.price || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <span className="text-sm text-gray-600">
                        {price.customPrice.toFixed(2)}
                      </span>
                      <input
                        type="number"
                        value={price.customPrice}
                        onChange={(e) => handlePriceChange(price.productId, Number(e.target.value))}
                        className="w-32 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => navigate("/users")}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 