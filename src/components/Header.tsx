import { useContext } from "react";
import { Link } from "react-router-dom";
import AuthContext from "context/AuthContext";

export default function Header() {
  const { isAdmin } = useContext(AuthContext);

  return (
    <header className="header">
      <Link to="/" className="header__logo">
        React Blog
      </Link>
      <div className="header__nav">
        <Link to="/posts/new" className="header__nav-link">글쓰기</Link>
        <Link to="/posts" className="header__nav-link">게시글</Link>
        <Link to="/profile" className="header__nav-link">프로필</Link>
        <Link to="/products" className="header__nav-link">쇼핑</Link>
        {isAdmin && (
          <>
            <Link to="/users" className="header__nav-link admin-link">회원 관리</Link>
            <Link to="/products/new" className="header__nav-link admin-link">상품 관리</Link>
          </>
        )}
      </div>
    </header>
  );
}