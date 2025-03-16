import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { db } from "firebaseApp";
import { doc, getDoc } from "firebase/firestore";

import { CustomerPriceHistory, User, COLLECTIONS } from "types/schema";
import { getUserById } from "utils/firebase";
import AuthContext from "context/AuthContext";
import Loader from "./Loader";

export default function UserPriceHistory() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<User | null>(null);
  const [history, setHistory] = useState<CustomerPriceHistory | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!userId) {
          toast.error("사용자 ID가 필요합니다.");
          navigate("/users");
          return;
        }

        // 사용자 정보 가져오기
        const userData = await getUserById(userId);
        if (!userData) {
          toast.error("사용자를 찾을 수 없습니다.");
          navigate("/users");
          return;
        }
        setUserData(userData);

        // 가격 수정 이력 가져오기
        const historyRef = doc(db, COLLECTIONS.CUSTOMER_PRICE_HISTORY, userId);
        const historyDoc = await getDoc(historyRef);
        
        if (historyDoc.exists()) {
          setHistory(historyDoc.data() as CustomerPriceHistory);
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
          {userData.fullCompanyName} 가격 수정 이력
        </h2>
        <div className="flex space-x-2">
          <Link
            to={`/users/${userId}/price`}
            className="text-primary-600 hover:text-primary-900 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            가격 설정
          </Link>
        </div>
      </div>

      {!history || history.history.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          가격 수정 이력이 없습니다.
        </div>
      ) : (
        <div className="space-y-6">
          {[...history.history].reverse().map((item, index) => (
            <div key={index} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900">
                      수정자: {item.adminEmail}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {item.updatedAt}
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        제품명
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        이전 가격
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        변경 가격
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        가격 변동
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {item.changes.map((change, changeIndex) => (
                      <tr key={changeIndex} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {change.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {change.previousPrice.toLocaleString()}원
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {change.newPrice.toLocaleString()}원
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          change.newPrice > change.previousPrice 
                            ? 'text-red-600' 
                            : change.newPrice < change.previousPrice 
                              ? 'text-blue-600' 
                              : 'text-gray-500'
                        }`}>
                          {change.newPrice > change.previousPrice ? '+' : ''}
                          {(change.newPrice - change.previousPrice).toLocaleString()}원
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 