import { Link } from "react-router-dom";
import { useContext } from "react";
import AuthContext from "context/AuthContext";

export default function Header() {
  const { user, isAdmin } = useContext(AuthContext);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-gray-900 hover:text-primary-600">
            React Blog
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link to="/posts" className="text-gray-600 hover:text-gray-900">
              게시글
            </Link>
            <Link to="/products" className="text-gray-600 hover:text-gray-900">
              상품
            </Link>
            
            {user ? (
              <>
                {isAdmin && (
                  <>
                    <Link to="/users" className="text-red-600 hover:text-red-700 font-medium">
                      사용자 관리
                    </Link>
                    <Link to="/categories" className="text-red-600 hover:text-red-700 font-medium">
                      카테고리 관리
                    </Link>
                    <Link to="/products/manage" className="text-red-600 hover:text-red-700 font-medium">
                      상품 관리
                    </Link>
                  </>
                )}
                <Link to="/profile" className="text-gray-600 hover:text-gray-900">
                  프로필
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-gray-900">
                  로그인
                </Link>
                <Link 
                  to="/signup" 
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}