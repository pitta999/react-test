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
  isSuperAdmin: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isSuperAdmin: false,
  isLoading: true
});

export const AuthContextProvider = ({ children }: AuthProps) => {
  const auth = getAuth(app);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      // 사용자가 로그인한 경우 admin 권한 확인
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          
          if (userDoc.exists()) {
            const categoryLevel = userDoc.data().categoryLevel;
            
            // categoryLevel이 99인 경우 슈퍼 관리자
            if (categoryLevel === 99) {
              setIsAdmin(true);
              setIsSuperAdmin(true);
            } 
            // categoryLevel이 98인 경우 일반 관리자
            else if (categoryLevel === 98) {
              setIsAdmin(true);
              setIsSuperAdmin(false);
            } 
            // 그 외 경우는 일반 사용자
            else {
              setIsAdmin(false);
              setIsSuperAdmin(false);
            }
          } else {
            setIsAdmin(false);
            setIsSuperAdmin(false);
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
          setIsSuperAdmin(false);
        }
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
      
      setIsLoading(false);
    });

    // 컴포넌트 언마운트 시 구독 해제
    return () => unsubscribe();
  }, [auth]);

  return (
    <AuthContext.Provider value={{ user: currentUser, isAdmin, isSuperAdmin, isLoading }}>
      {!isLoading ? children : <div>Loading...</div>}
    </AuthContext.Provider>
  );
};

export default AuthContext;