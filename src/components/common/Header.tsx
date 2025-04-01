import { Link } from "react-router-dom";
import { useContext, useState } from "react";
import AuthContext from "context/AuthContext";
import { useCart } from "context/CartContext";

interface DropdownProps {
  label: string;
  items: { label: string; to: string }[];
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

function Dropdown({ label, items, isAdmin, isSuperAdmin }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleMouseEnter = () => {
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
  };

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button className="text-red-600 hover:text-red-700 py-2">
        {label}
      </button>
      
      {isOpen && (
        <div 
          className="absolute left-0 w-48 bg-white rounded-md shadow-lg py-1 z-50"
          style={{ top: '100%' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {items.map((item, index) => (
            <Link
              key={index}
              to={item.to}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { user, isAdmin, isSuperAdmin } = useContext(AuthContext);
  const { totalItems } = useCart();

  console.log("Header - isAdmin:", isAdmin, "isSuperAdmin:", isSuperAdmin, "user:", user); // 디버깅용

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
                {(isAdmin || isSuperAdmin) && (
                  <Dropdown
                    label="관리"
                    items={[
                      { label: "회사 정보 관리", to: "/my-info" },
                      { label: "사용자 관리", to: "/users" },
                      { label: "상품 관리", to: "/products/manage" },
                      { label: "상품 엑셀 업로드", to: "/products/sheet/newExcel" },
                      { label: "상품 일괄 수정", to: "/products/sheet/editSheet" }
                    ]}
                    isAdmin={isAdmin}
                    isSuperAdmin={isSuperAdmin}
                  />
                )}
                {(isAdmin || isSuperAdmin) && (
                  <Dropdown
                    label="내역"
                    items={[
                      { label: "주문내역", to: "/admin/orders" }
                    ]}
                    isAdmin={isAdmin}
                    isSuperAdmin={isSuperAdmin}
                  />
                )}
                {/* <Link to="/posts" className="text-gray-600 hover:text-gray-900">
                  게시글
                </Link> */}
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