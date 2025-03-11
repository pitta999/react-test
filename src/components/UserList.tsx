import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "firebaseApp";
import { collection, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";
import { MembershipLevelType } from "./UserForm";

interface UserType {
  uid: string;
  email: string;
  phoneNumber: string;
  membershipLevel: MembershipLevelType;
  createdAt: string;
}

export default function UserList() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersList: UserType[] = [];
        
        querySnapshot.forEach((doc) => {
          const userData = doc.data() as UserType;
          usersList.push({
            ...userData,
            uid: doc.id,
          });
        });
        
        // 생성일 기준 내림차순 정렬 (최신순)
        usersList.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("사용자 목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (isLoading) {
    return <div className="loader">로딩 중...</div>;
  }

  return (
    <div className="container">
      <div className="user-list-header">
        <h1>사용자 관리</h1>
        <Link to="/users/new" className="user-list__btn--add">
          + 새 사용자 등록
        </Link>
      </div>

      {users.length === 0 ? (
        <div className="user-list__empty">
          <p>등록된 사용자가 없습니다.</p>
        </div>
      ) : (
        <table className="user-list-table">
          <thead>
            <tr>
              <th>이메일</th>
              <th>전화번호</th>
              <th>회원 등급</th>
              <th>가입일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.uid}>
                <td>{user.email}</td>
                <td>{user.phoneNumber}</td>
                <td>
                  <span className={`badge badge--${user.membershipLevel}`}>
                    {user.membershipLevel}
                  </span>
                </td>
                <td>{user.createdAt}</td>
                <td>
                  <Link to={`/users/${user.uid}`} className="user-list__btn--view">
                    보기
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}