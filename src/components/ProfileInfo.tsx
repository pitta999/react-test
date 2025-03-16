import { useContext, useEffect, useState } from "react";
import { db } from "firebaseApp";
import { doc, getDoc } from "firebase/firestore";
import AuthContext from "context/AuthContext";
import { toast } from "react-toastify";
import Loader from "./Loader";

interface UserInfo {
  uid: string;
  email: string;
  fullCompanyName: string;
  tradingName: string;
  companyAddress: string;
  personInCharge: {
    name: string;
    title: string;
  };
  telNo: string;
  mobNo: string;
  webAddress: string;
  businessType: 'B2B' | 'B2C' | 'Other';
  installationService: 'Yes' | 'No';
  salesProducts: string;
  tradeAmount: string;
  preferentialModel: string;
  estimatedPurchase: string;
  categoryId: string;
  categoryName: string;
  categoryLevel: number;
  createdAt: string;
  updatedAt?: string;
}

export default function ProfileInfo() {
  const { user } = useContext(AuthContext);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user?.uid) return;

      setIsLoading(true);
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserInfo({
            ...userDoc.data() as UserInfo,
            uid: userDoc.id,
          });
        } else {
          toast.error("사용자 정보를 찾을 수 없습니다.");
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        toast.error("사용자 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, [user]);

  if (isLoading) {
    return <Loader />;
  }

  if (!userInfo) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">사용자 정보를 찾을 수 없습니다.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">내 정보</h2>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">기본 정보</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center">
                <span className="w-32 text-sm font-medium text-gray-500">이메일</span>
                <span className="text-sm text-gray-900">{userInfo.email}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">회사 정보</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">회사명</span>
                <span className="text-sm text-gray-900">{userInfo.fullCompanyName}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">상호명</span>
                <span className="text-sm text-gray-900">{userInfo.tradingName}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">회사 주소</span>
                <span className="text-sm text-gray-900">{userInfo.companyAddress}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">담당자 정보</span>
                <span className="text-sm text-gray-900">
                  {userInfo.personInCharge.name} ({userInfo.personInCharge.title})
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">연락처</span>
                <span className="text-sm text-gray-900">
                  Tel: {userInfo.telNo} / Mob: {userInfo.mobNo}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">웹사이트</span>
                <span className="text-sm text-gray-900">{userInfo.webAddress}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">사업자 유형</span>
                <span className="text-sm text-gray-900">{userInfo.businessType}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">설치 서비스</span>
                <span className="text-sm text-gray-900">{userInfo.installationService}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">취급 제품</span>
                <span className="text-sm text-gray-900">{userInfo.salesProducts}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">거래 금액</span>
                <span className="text-sm text-gray-900">{userInfo.tradeAmount}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">선호 모델</span>
                <span className="text-sm text-gray-900">{userInfo.preferentialModel}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">예상 구매액</span>
                <span className="text-sm text-gray-900">{userInfo.estimatedPurchase}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">등록 정보</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center">
                <span className="w-32 text-sm font-medium text-gray-500">가입일</span>
                <span className="text-sm text-gray-900">{userInfo.createdAt}</span>
              </div>
              {userInfo.updatedAt && (
                <div className="flex items-center">
                  <span className="w-32 text-sm font-medium text-gray-500">최근 수정일</span>
                  <span className="text-sm text-gray-900">{userInfo.updatedAt}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 