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
  regularPrice: number;
  customPrice: number;
  categoryId: string;
  categoryName: string;
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
          setPrices(existingPrices.prices);
          setOriginalPrices(existingPrices.prices);
        } else {
          // 새로운 가격 목록 초기화
          const initialPrices = allProducts.map(product => ({
            productId: product.id,
            productName: product.name,
            regularPrice: product.price,
            customPrice: product.price,
            categoryId: product.categoryId,
            categoryName: product.categoryName,
          }));
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
    setPrices(prev => 
      prev.map(price => 
        price.productId === productId 
          ? { ...price, customPrice: value }
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
      navigate(`/users/${userId}/price`);
    } catch (error) {
      console.error("Error saving prices:", error);
      toast.error("가격 저장 중 오류가 발생했습니다.");
    }
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <form onSubmit={handleSubmit}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  카테고리
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  제품명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  정상가
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  맞춤가
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {prices.map((price) => (
                <tr key={price.productId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {price.categoryName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {price.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {price.regularPrice.toLocaleString()}원
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={price.customPrice}
                      onChange={(e) => handlePriceChange(price.productId, Number(e.target.value))}
                      className="w-32 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                      min="0"
                    />
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