import { Route, Routes, Navigate } from "react-router-dom";
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
import CategoriesPage from "pages/categories";
import NewCategoryPage from "pages/categories/new";
import EditCategoryPage from "pages/categories/edit/[id]";

interface RouterProps {
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export default function Router({ isAuthenticated, isAdmin }: RouterProps) {
  return (
    <>
      <Routes>
        {isAuthenticated ? (
          <>
            <Route path="/" element={<Home />} />
            <Route path="/posts" element={<PostList />} />
            <Route path="/posts/:id" element={<PostDetail />} />
            <Route path="/posts/new" element={<PostNew />} />
            <Route path="/posts/edit/:id" element={<PostEdit />} />
            <Route path="/profile" element={<ProfilePage />} />
            
            {/* 상품 라우트 */}
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/:productId" element={<ProductDetail />} />
            
            {/* 어드민 전용 라우트 */}
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
            
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/categories/new" element={<NewCategoryPage />} />
            <Route path="/categories/edit/:categoryId" element={<EditCategoryPage />} />
            
            <Route path="*" element={<Navigate replace to="/" />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            {/* 비로그인 상태에서도 상품 목록과 상세 보기는 가능 */}
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/:productId" element={<ProductDetail />} />
            <Route path="*" element={<LoginPage />} />
          </>
        )}
      </Routes>
    </>
  );
}