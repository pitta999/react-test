import { Route, Routes, Navigate } from "react-router-dom";
import Home from "pages/home";
import PostList from "pages/posts";
import PostDetail from "pages/posts/detail";
import PostNew from "pages/posts/new";
import PostEdit from "pages/posts/edit";
import ProfilePage from "pages/profile";
import LoginPage from "pages/login";
import SignupPage from "pages/signup";
// import RegistUser from "pages/registuser";
import UserListPage from "pages/users/index"; // index.tsx를 가리킴
import UserDetailPage from "pages/users/detail";
import UserFormPage from "pages/users/form";

interface RouterProps {
  isAuthenticated: boolean;
  isAdmin: boolean; // 어드민 여부를 나타내는 prop 추가
}

export default function Router({ isAuthenticated, isAdmin  }: RouterProps) {
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
            {/* 어드민 전용 사용자 관리 라우트 */}
            <Route 
              path="/users" 
              element={isAdmin ? <UserListPage /> : <Navigate replace to="/" />} 
            />
            <Route 
              path="/users/new" 
              element={isAdmin ? <UserFormPage /> : <Navigate replace to="/" />} 
            />
            <Route 
              path="/users/:userId" 
              element={isAdmin ? <UserDetailPage /> : <Navigate replace to="/" />} 
            />
            <Route 
              path="/users/:userId/edit" 
              element={isAdmin ? <UserFormPage /> : <Navigate replace to="/" />} 
            />
            <Route path="*" element={<Navigate replace to="/" />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="*" element={<LoginPage />} />
          </>
        )}
      </Routes>
    </>
  );
}
