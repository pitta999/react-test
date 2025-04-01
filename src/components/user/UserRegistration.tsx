import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { app, db } from "firebaseApp";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import AuthContext from "context/AuthContext";

export type MembershipLevelType = "class1" | "class2" | "class3" | "class4" | "admin";
export const MEMBERSHIP_LEVELS: MembershipLevelType[] = ["class1", "class2", "class3", "class4", "admin"];

export default function UserRegistrationForm() {
  const [error, setError] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [passwordConfirm, setPasswordConfirm] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [membershipLevel, setMembershipLevel] = useState<MembershipLevelType>("class1");
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const auth = getAuth(app);
    
    // 현재 로그인된 관리자 정보 저장
    const adminEmail = user?.email;
    const adminPassword = prompt("관리자 계정의 비밀번호를 입력하세요."); // 보안상 안전한 방식은 아님

    if (!adminEmail || !adminPassword) {
      toast.error("관리자 계정 정보를 가져올 수 없습니다.");
      return;
    }

    try {
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

      toast.success("회원가입에 성공했습니다.");

      // 관리자 계정으로 다시 로그인 (관리자 계정 유지)
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      toast.info("관리자 계정으로 복귀했습니다.");

      navigate("/");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.code);
    }
  };

  return (
    <form onSubmit={onSubmit} className="form form--lg">
      <h1 className="form__title">사용자 등록</h1>
      <div className="form__block">
        <label htmlFor="email">이메일</label>
        <input type="email" name="email" id="email" required onChange={(e) => setEmail(e.target.value)} value={email} />
      </div>
      <div className="form__block">
        <label htmlFor="password">비밀번호</label>
        <input type="password" name="password" id="password" required onChange={(e) => setPassword(e.target.value)} value={password} />
      </div>
      <div className="form__block">
        <label htmlFor="password_confirm">비밀번호 확인</label>
        <input type="password" name="password_confirm" id="password_confirm" required onChange={(e) => setPasswordConfirm(e.target.value)} value={passwordConfirm} />
      </div>
      <div className="form__block">
        <label htmlFor="address">주소</label>
        <input type="text" name="address" id="address" required onChange={(e) => setAddress(e.target.value)} value={address} />
      </div>
      <div className="form__block">
        <label htmlFor="phoneNumber">전화번호</label>
        <input type="tel" name="phoneNumber" id="phoneNumber" required placeholder="01012345678" onChange={(e) => setPhoneNumber(e.target.value)} value={phoneNumber} />
      </div>
      <div className="form__block">
        <label htmlFor="membershipLevel">회원 등급</label>
        <select name="membershipLevel" id="membershipLevel" onChange={(e) => setMembershipLevel(e.target.value as MembershipLevelType)} value={membershipLevel}>
          {MEMBERSHIP_LEVELS.map((level) => (
            <option value={level} key={level}>
              {level}
            </option>
          ))}
        </select>
      </div>
      {error && error?.length > 0 && (
        <div className="form__block">
          <div className="form__error">{error}</div>
        </div>
      )}
      <div className="form__block">
        계정이 이미 있으신가요?
        <Link to="/login" className="form__link">로그인하기</Link>
      </div>
      <div className="form__block">
        <input type="submit" value="회원가입" className="form__btn--submit" disabled={error?.length > 0} />
      </div>
    </form>
  );
}
