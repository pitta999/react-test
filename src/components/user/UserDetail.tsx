import { useState, useEffect, useContext } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { app, db } from "firebaseApp";
import { getAuth, deleteUser, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import AuthContext from "context/AuthContext";
import Loader from "components/common/Loader";
import { sendPasswordResetEmailToUser } from "utils/firebase";

interface UserDetailType {
  uid: string;
  email: string;
  fullCompanyName: string;
  tradingName: string;
  companyAddress: string;
  countryCode: string;
  vatNumber: string;
  personInCharge: {
    name: string;
    title: string;
    email: string;
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
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);

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

  const handleResetPassword = async () => {
    if (!userData?.email) return;

    const confirmed = window.confirm(`'${userData.email}' 사용자에게 비밀번호 재설정 이메일을 발송하시겠습니까?`);
    if (!confirmed) return;

    setIsResettingPassword(true);
    try {
      await sendPasswordResetEmailToUser(userData.email);
      toast.success("비밀번호 재설정 이메일이 발송되었습니다.");
    } catch (error) {
      console.error("Error sending password reset email:", error);
      toast.error("비밀번호 재설정 이메일 발송 중 오류가 발생했습니다.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (isLoading) {
    return <Loader />;
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
        <div className="flex space-x-4">
          <button
            onClick={handleResetPassword}
            disabled={isResettingPassword}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-md ${
              isResettingPassword 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {isResettingPassword ? '처리 중...' : '비밀번호 재설정'}
          </button>
          <Link
            to="/users"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          {/* 기본 정보 테이블 */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">기본 정보</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 w-1/3">이메일</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userData.email}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">회원 등급</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 text-primary-800">
                        {userData.categoryName} (Level {userData.categoryLevel})
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">국가 코드</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userData.countryCode}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">VAT 번호</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userData.vatNumber}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 회사 정보 테이블 */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">회사 정보</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 w-1/3">회사명</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userData.fullCompanyName}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">상호명</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userData.tradingName}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">회사 주소</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{userData.companyAddress}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">담당자 정보</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {userData.personInCharge.name} ({userData.personInCharge.title})
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">담당자 이메일</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userData.personInCharge.email}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">연락처</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Tel: {userData.telNo} / Mob: {userData.mobNo}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">웹사이트</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userData.webAddress}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">사업자 유형</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userData.businessType}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">설치 서비스</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userData.installationService}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">취급 제품</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{userData.salesProducts}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">거래 금액</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userData.tradeAmount}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">선호 모델</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userData.preferentialModel}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">예상 구매액</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userData.estimatedPurchase}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 등록 정보 테이블 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">등록 정보</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 w-1/3">가입일</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userData.createdAt}</td>
                  </tr>
                  {userData.updatedAt && (
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">최근 수정일</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userData.updatedAt}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}