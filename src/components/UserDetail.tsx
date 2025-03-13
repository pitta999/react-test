import { useState, useEffect, useContext } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { app, db } from "firebaseApp";
import { getAuth, deleteUser, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import AuthContext from "context/AuthContext";

interface UserDetailType {
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

export default function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const auth = getAuth(app);
  const [userData, setUserData] = useState<UserDetailType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;

      setIsLoading(true);
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        
        if (userDoc.exists()) {
          setUserData({
            ...userDoc.data() as UserDetailType,
            uid: userDoc.id,
          });
        } else {
          toast.error("사용자 정보를 찾을 수 없습니다.");
          navigate("/users");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("사용자 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [userId, navigate]);

  const handleDelete = async () => {
    if (!userData || !userId || !user?.email) return;

    const confirmed = window.confirm(`'${userData.email}' 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) return;

    // 관리자 비밀번호 확인
    const adminPassword = prompt("관리자 계정의 비밀번호를 입력하세요.");
    if (!adminPassword) {
      toast.error("관리자 인증이 필요합니다.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. 현재 관리자 재인증
      await signInWithEmailAndPassword(auth, user.email, adminPassword);

      // 2. Firestore에서 사용자 데이터 삭제
      await deleteDoc(doc(db, "users", userId));

      // 3. Firebase Authentication에서 사용자 삭제
      // 사용자 계정으로 로그인하여 삭제 (보안상의 이유로 관리자가 직접 삭제할 수 없음)
      try {
        const userCredential = await signInWithEmailAndPassword(auth, userData.email, "temporary_access");
        const userToDelete = userCredential.user;
        await deleteUser(userToDelete);
      } catch (authError) {
        console.error("Error deleting user from Authentication:", authError);
        toast.warning("사용자 계정은 Firestore에서만 삭제되었습니다. Authentication에서 수동으로 삭제가 필요할 수 있습니다.");
      }

      // 4. 관리자로 다시 로그인
      await signInWithEmailAndPassword(auth, user.email, adminPassword);

      toast.success("사용자가 성공적으로 삭제되었습니다.");
      navigate("/users");
    } catch (error) {
      console.error("Error during delete process:", error);
      toast.error("사용자 삭제 중 오류가 발생했습니다. 관리자 인증을 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!userData) {
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
        <h2 className="text-2xl font-bold text-gray-900">사용자 상세 정보</h2>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">기본 정보</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center">
                <span className="w-32 text-sm font-medium text-gray-500">이메일</span>
                <span className="text-sm text-gray-900">{userData.email}</span>
              </div>
              <div className="flex items-center">
                <span className="w-32 text-sm font-medium text-gray-500">회원 등급</span>
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 text-primary-800">
                  {userData.categoryName} (Level {userData.categoryLevel})
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">회사 정보</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">회사명</span>
                <span className="text-sm text-gray-900">{userData.fullCompanyName}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">상호명</span>
                <span className="text-sm text-gray-900">{userData.tradingName}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">회사 주소</span>
                <span className="text-sm text-gray-900">{userData.companyAddress}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">담당자 정보</span>
                <span className="text-sm text-gray-900">
                  {userData.personInCharge.name} ({userData.personInCharge.title})
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">연락처</span>
                <span className="text-sm text-gray-900">
                  Tel: {userData.telNo} / Mob: {userData.mobNo}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">웹사이트</span>
                <span className="text-sm text-gray-900">{userData.webAddress}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">사업자 유형</span>
                <span className="text-sm text-gray-900">{userData.businessType}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">설치 서비스</span>
                <span className="text-sm text-gray-900">{userData.installationService}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">취급 제품</span>
                <span className="text-sm text-gray-900">{userData.salesProducts}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">거래 금액</span>
                <span className="text-sm text-gray-900">{userData.tradeAmount}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">선호 모델</span>
                <span className="text-sm text-gray-900">{userData.preferentialModel}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">예상 구매액</span>
                <span className="text-sm text-gray-900">{userData.estimatedPurchase}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">등록 정보</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center">
                <span className="w-32 text-sm font-medium text-gray-500">가입일</span>
                <span className="text-sm text-gray-900">{userData.createdAt}</span>
              </div>
              {userData.updatedAt && (
                <div className="flex items-center">
                  <span className="w-32 text-sm font-medium text-gray-500">최근 수정일</span>
                  <span className="text-sm text-gray-900">{userData.updatedAt}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Link
          to="/users"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          사용자 목록으로 돌아가기
        </Link>
      </div>
    </div>
  );
}