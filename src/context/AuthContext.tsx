import { ReactNode, createContext, useEffect, useState, useContext } from "react";
import { User, getAuth, onAuthStateChanged } from "firebase/auth";
import { app, db } from "firebaseApp";
import { doc, getDoc } from "firebase/firestore";

interface AuthProps {
  children: ReactNode;
}

// AuthContext 인터페이스 확장
interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isLoading: true
});

export const AuthContextProvider = ({ children }: AuthProps) => {
  const auth = getAuth(app);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      // 사용자가 로그인한 경우 admin 권한 확인
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          // categoryLevel이 99인 경우에만 관리자 권한 부여 (최고 관리자 레벨)
          if (userDoc.exists() && userDoc.data().categoryLevel === 99) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      
      setIsLoading(false);
    });

    // 컴포넌트 언마운트 시 구독 해제
    return () => unsubscribe();
  }, [auth]);

  return (
    <AuthContext.Provider value={{ user: currentUser, isAdmin, isLoading }}>
      {!isLoading ? children : <div>Loading...</div>}
    </AuthContext.Provider>
  );
};

export default AuthContext;