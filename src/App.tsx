import { useEffect, useState, useContext } from "react";
import { app } from "firebaseApp";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ThemeContext from "context/ThemeContext";
import { AuthContextProvider } from "context/AuthContext";
import { CartProvider } from 'context/CartContext';

import Router from "./components/Router";
import Loader from "components/Loader";

function App() {
  const context = useContext(ThemeContext);
  const auth = getAuth(app);
  // auth를 체크하기 전에 (initialize 전)에는 loader를 띄워주는 용도
  const [init, setInit] = useState<boolean>(false);
  // auth의 currentUser가 있으면 authenticated로 변경
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setInit(true);
    });

    return () => unsubscribe();
  }, [auth]);

  return (
    <AuthContextProvider>
      <CartProvider>
        <div className={context.theme === "light" ? "white" : "dark"}>
          <ToastContainer />
          {init ? <Router isAuthenticated={isAuthenticated} /> : <Loader />}
        </div>
      </CartProvider>
    </AuthContextProvider>
  );
}

export default App;