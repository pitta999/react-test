import { Route, Routes, Navigate } from "react-router-dom";
import { useContext } from "react";
import AuthContext from "context/AuthContext";
import Home from "pages/home";
import PostList from "pages/posts";
import PostDetail from "pages/posts/detail";
import PostNew from "pages/posts/new";
import PostEdit from "pages/posts/edit";
import ProfilePage from "pages/profile";
import LoginPage from "pages/login";
import SignupPage from "pages/signup";
import UserList from "pages/users";
import UserDetail from "pages/users/detail";
import UserForm from "pages/users/form";
import ProductList from "pages/products";
import ProductDetail from "pages/products/detail";
import ProductNew from "pages/products/new";
import ProductEdit from "pages/products/edit";
import ProductManage from "pages/products/manage";
import ProductCategoriesPage from "pages/products/categories";
import NewProductCategoryPage from "pages/products/categories/new";
import EditProductCategoryPage from "pages/products/categories/edit/[id]";
import UserCategoriesPage from "pages/users/categories";
import NewUserCategoryPage from "pages/users/categories/new";
import EditUserCategoryPage from "pages/users/categories/edit/[id]";
import CartPage from "pages/cart";

interface RouterProps {
  isAuthenticated: boolean;
}

export default function Router({ isAuthenticated }: RouterProps) {
  const { isAdmin } = useContext(AuthContext);
  
  return (
    <>
      <Routes>
        {isAuthenticated ? (
          <>
            {/* 일반 사용자도 접근 가능한 라우트 */}
            <Route path="/" element={<Home />} />
            <Route path="/posts" element={<PostList />} />
            <Route path="/posts/:id" element={<PostDetail />} />
            <Route path="/posts/new" element={<PostNew />} />
            <Route path="/posts/edit/:id" element={<PostEdit />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/:productId" element={<ProductDetail />} />
            <Route path="/cart" element={<CartPage />} />
            
            {/* 어드민 전용 사용자 관리 라우트 */}
            <Route 
              path="/users" 
              element={isAdmin ? <UserList /> : <Navigate replace to="/" />} 
            />
            <Route 
              path="/users/new" 
              element={isAdmin ? <UserForm /> : <Navigate replace to="/" />} 
            />
            <Route 
              path="/users/:userId" 
              element={isAdmin ? <UserDetail /> : <Navigate replace to="/" />} 
            />
            <Route 
              path="/users/:userId/edit" 
              element={isAdmin ? <UserForm /> : <Navigate replace to="/" />} 
            />
            
            {/* 어드민 전용 회원 등급 관리 라우트 */}
            <Route 
              path="/users/categories" 
              element={isAdmin ? <UserCategoriesPage /> : <Navigate replace to="/" />} 
            />
            <Route 
              path="/users/categories/new" 
              element={isAdmin ? <NewUserCategoryPage /> : <Navigate replace to="/" />} 
            />
            <Route 
              path="/users/categories/edit/:categoryId" 
              element={isAdmin ? <EditUserCategoryPage /> : <Navigate replace to="/" />} 
            />
            
            {/* 어드민 전용 상품 관리 라우트 */}
            <Route 
              path="/products/manage" 
              element={isAdmin ? <ProductManage /> : <Navigate replace to="/" />} 
            />
            <Route 
              path="/products/new" 
              element={isAdmin ? <ProductNew /> : <Navigate replace to="/" />} 
            />
            <Route 
              path="/products/:productId/edit" 
              element={isAdmin ? <ProductEdit /> : <Navigate replace to="/" />} 
            />
            
            {/* 어드민 전용 상품 카테고리 라우트 */}
            <Route 
              path="/products/categories" 
              element={isAdmin ? <ProductCategoriesPage /> : <Navigate replace to="/" />} 
            />
            <Route 
              path="/products/categories/new" 
              element={isAdmin ? <NewProductCategoryPage /> : <Navigate replace to="/" />} 
            />
            <Route 
              path="/products/categories/edit/:categoryId" 
              element={isAdmin ? <EditProductCategoryPage /> : <Navigate replace to="/" />} 
            />
            
            {/* 존재하지 않는 경로는 홈으로 리다이렉트 */}
            <Route path="*" element={<Navigate replace to="/" />} />
          </>
        ) : (
          <>
            {/* 비로그인 상태에서 접근 가능한 라우트 */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            
            {/* 비로그인 상태에서는 모든 경로를 로그인 페이지로 리다이렉트 */}
            <Route path="*" element={<Navigate replace to="/login" />} />
          </>
        )}
      </Routes>
    </>
  );
}