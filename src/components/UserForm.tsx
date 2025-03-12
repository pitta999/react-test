import { useState, useContext, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { app, db } from "firebaseApp";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import AuthContext from "context/AuthContext";

export type MembershipLevelType = "class1" | "class2" | "class3" | "class4" | "admin";
export const MEMBERSHIP_LEVELS: MembershipLevelType[] = ["class1", "class2", "class3", "class4", "admin"];

export default function UserForm() {
  const { userId } = useParams(); // 수정 모드일 경우 userId가 있음
  const isEditMode = !!userId;

  const [error, setError] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [passwordConfirm, setPasswordConfirm] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [membershipLevel, setMembershipLevel] = useState<MembershipLevelType>("class1");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const auth = getAuth(app);

  // 수정 모드일 경우 사용자 정보 불러오기
  useEffect(() => {
    const fetchUserData = async () => {
      if (isEditMode && userId) {
        setIsLoading(true);
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setEmail(userData.email || "");
            setAddress(userData.address || "");
            setPhoneNumber(userData.phoneNumber || "");
            setMembershipLevel(userData.membershipLevel || "class1");
          } else {
            toast.error("사용자 정보를 찾을 수 없습니다.");
            navigate("/users");
          }
        } catch (error: any) {
          console.error("Error fetching user data:", error);
          toast.error("사용자 정보를 불러오는 중 오류가 발생했습니다.");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchUserData();
  }, [userId, isEditMode, navigate]);

  const validateForm = () => {
    // 이메일 형식 검사
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    if (!email.match(emailRegex)) {
      setError("이메일 형식이 올바르지 않습니다.");
      return false;
    }

    // 비밀번호 검사 (새 사용자 등록 시에만)
    if (!isEditMode) {
      if (password.length < 8) {
        setError("비밀번호는 8자리 이상이어야 합니다.");
        return false;
      }

      if (password !== passwordConfirm) {
        setError("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        return false;
      }
    }

    // 전화번호 형식 검사 (숫자만)
    const phoneRegex = /^[0-9]*$/;
    if (!phoneNumber.match(phoneRegex)) {
      setError("전화번호는 숫자만 입력 가능합니다.");
      return false;
    }

    setError("");
    return true;
  };

  const handleCreateUser = async () => {
    try {
      // 현재 로그인된 관리자 정보 저장
      const adminEmail = user?.email;
      const adminPassword = prompt("관리자 계정의 비밀번호를 입력하세요.");

      if (!adminEmail || !adminPassword) {
        toast.error("관리자 계정 정보를 가져올 수 없습니다.");
        return;
      }

      // 새 사용자 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Firestore에 추가 사용자 정보 저장
      await setDoc(doc(db, "users", newUser.uid), {
        email: email,
        address: address,
        phoneNumber: phoneNumber,
        membershipLevel: membershipLevel,
        createdAt: new Date()?.toLocaleString("ko-KR"),
        uid: newUser.uid,
      });

      toast.success("사용자가 성공적으로 등록되었습니다.");

      // 관리자 계정으로 다시 로그인 (관리자 계정 유지)
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      toast.info("관리자 계정으로 복귀했습니다.");

      navigate("/users");
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error?.code || "사용자 등록 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateUser = async () => {
    if (!userId) return;
    
    try {
      const userRef = doc(db, "users", userId);
      
      // 비밀번호는 수정하지 않음 (Firebase Auth 비밀번호 변경은 별도 과정 필요)
      await updateDoc(userRef, {
        address: address,
        phoneNumber: phoneNumber,
        membershipLevel: membershipLevel,
        updatedAt: new Date()?.toLocaleString("ko-KR"),
      });

      toast.success("사용자 정보가 성공적으로 업데이트되었습니다.");
      navigate(`/users/${userId}`);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error?.code || "사용자 정보 업데이트 중 오류가 발생했습니다.");
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      if (isEditMode) {
        await handleUpdateUser();
      } else {
        await handleCreateUser();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 사용자 삭제 핸들러
  const handleDelete = async () => {
    if (!userId) return;

    const confirmed = window.confirm("이 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.");
    if (!confirmed) return;

    setIsLoading(true);
    try {
      await deleteDoc(doc(db, "users", userId));
      toast.success("사용자가 삭제되었습니다.");
      navigate("/users");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("사용자 삭제 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">
            {isEditMode ? "사용자 정보 수정" : "사용자 등록"}
          </h1>
          {isEditMode && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-red-600 hover:text-red-900"
            >
              삭제
            </button>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            이메일
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isEditMode}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            required
          />
        </div>

        {!isEditMode && (
          <>
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="mb-6">
              <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호 확인
              </label>
              <input
                type="password"
                id="password_confirm"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </>
        )}

        <div className="mb-6">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            주소
          </label>
          <input
            type="text"
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
            전화번호
          </label>
          <input
            type="tel"
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="01012345678"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="membershipLevel" className="block text-sm font-medium text-gray-700 mb-2">
            회원 등급
          </label>
          <select
            id="membershipLevel"
            value={membershipLevel}
            onChange={(e) => setMembershipLevel(e.target.value as MembershipLevelType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {MEMBERSHIP_LEVELS.map((level) => (
              <option value={level} key={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-6">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <Link
            to="/users"
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-center"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "처리 중..." : isEditMode ? "수정하기" : "등록하기"}
          </button>
        </div>
      </form>
    </div>
  );
}