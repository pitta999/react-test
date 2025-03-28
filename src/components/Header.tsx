import { Link } from "react-router-dom";
import { useContext } from "react";
import AuthContext from "context/AuthContext";
import { useCart } from "context/CartContext";

export default function Header() {
  const { user, isAdmin, isSuperAdmin } = useContext(AuthContext);
  const { totalItems } = useCart();

  console.log("Header - isAdmin:", isAdmin, "user:", user); // 디버깅용

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-gray-900 hover:text-primary-600">
            B2B Order Portal
          </Link>
          
          <div className="flex items-center space-x-6">
            
            
            {user ? (
              <>
                {isAdmin && (
                  <>
                    <Link
                      to="/users"
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      사용자
                    </Link>
                    <Link
                      to="/products/manage"
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      상품
                    </Link>
                    <Link
                      to="/admin/orders"
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      주문내역
                    </Link>
                  </>
                )}
                {isSuperAdmin && (
                  <Link
                    to="/my-info"
                    className="text-red-600 hover:text-red-700 font-medium"
                  >
                    회사 정보
                  </Link>
                )}
                <Link to="/posts" className="text-gray-600 hover:text-gray-900">
                  게시글
                </Link>
                <Link to="/products" className="text-gray-600 hover:text-gray-900">
                  상품
                </Link>
                <Link to="/cart" className="text-gray-600 hover:text-gray-900 relative">
                  장바구니
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="text-gray-600 hover:text-gray-900">
                  프로필
                </Link>
                <Link
                  to="/order-history"
                  className="text-gray-600 hover:text-gray-900"
                >
                  주문 내역
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