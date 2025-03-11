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

    // 삭제 확인
    const confirmed = window.confirm(`'${userData.email}' 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
    
    if (!confirmed) return;

    setIsLoading(true);
    try {
      // Firestore에서 사용자 문서 삭제
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
    return <div className="loader">로딩 중...</div>;
  }

  if (!userData) {
    return <div className="error">사용자 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="container user-detail">
      <div className="user-detail__header">
        <h1>사용자 상세 정보</h1>
        <div className="user-detail__actions">
          <Link to={`/users/${userId}/edit`} className="user-detail__btn--edit">
            수정
          </Link>
          <button onClick={handleDelete} className="user-detail__btn--delete">
            삭제
          </button>
        </div>
      </div>

      <div className="user-detail__content">
        <div className="user-detail__group">
          <h3>기본 정보</h3>
          <div className="user-detail__item">
            <span className="user-detail__label">이메일</span>
            <span className="user-detail__value">{userData.email}</span>
          </div>
          <div className="user-detail__item">
            <span className="user-detail__label">회원 등급</span>
            <span className={`user-detail__value badge badge--${userData.membershipLevel}`}>
              {userData.membershipLevel}
            </span>
          </div>
          <div className="user-detail__item">
            <span className="user-detail__label">가입일</span>
            <span className="user-detail__value">{userData.createdAt}</span>
          </div>
          {userData.updatedAt && (
            <div className="user-detail__item">
              <span className="user-detail__label">최근 수정일</span>
              <span className="user-detail__value">{userData.updatedAt}</span>
            </div>
          )}
        </div>

        <div className="user-detail__group">
          <h3>연락처 정보</h3>
          <div className="user-detail__item">
            <span className="user-detail__label">전화번호</span>
            <span className="user-detail__value">{userData.phoneNumber}</span>
          </div>
          <div className="user-detail__item">
            <span className="user-detail__label">주소</span>
            <span className="user-detail__value">{userData.address}</span>
          </div>
        </div>

        <div className="user-detail__footer">
          <Link to="/users" className="user-detail__btn--back">
            사용자 목록으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}