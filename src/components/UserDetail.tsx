import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { db } from "firebaseApp";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { MembershipLevelType } from "./UserForm";

interface UserDetailType {
  uid: string;
  email: string;
  address: string;
  phoneNumber: string;
  membershipLevel: MembershipLevelType;
  createdAt: string;
  updatedAt?: string;
}

export default function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
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
    if (!userData || !userId) return;

    const confirmed = window.confirm(`'${userData.email}' 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
    
    if (!confirmed) return;

    setIsLoading(true);
    try {
      await deleteDoc(doc(db, "users", userId));
      toast.success("사용자가 성공적으로 삭제되었습니다.");
      navigate("/users");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("사용자 삭제 중 오류가 발생했습니다.");
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
        <div className="flex space-x-2">
          <Link
            to={`/users/${userId}/edit`}
            className="text-primary-600 hover:text-primary-900"
          >
            수정
          </Link>
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-900"
          >
            삭제
          </button>
        </div>
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
                  {userData.membershipLevel}
                </span>
              </div>
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

          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">연락처 정보</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center">
                <span className="w-32 text-sm font-medium text-gray-500">전화번호</span>
                <span className="text-sm text-gray-900">{userData.phoneNumber}</span>
              </div>
              <div className="flex items-center">
                <span className="w-32 text-sm font-medium text-gray-500">주소</span>
                <span className="text-sm text-gray-900">{userData.address}</span>
              </div>
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