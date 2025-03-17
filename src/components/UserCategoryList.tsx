import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "firebaseApp";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { UserCategory, COLLECTIONS } from "types/schema";
import Loader from "./Loader";

export default function UserCategoryList() {
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 카테고리 목록 불러오기
  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.USER_CATEGORIES));
      const categoryList: UserCategory[] = [];
      querySnapshot.forEach((doc) => {
        categoryList.push(doc.data() as UserCategory);
      });
      setCategories(categoryList.sort((a, b) => a.level - b.level));
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("회원 등급 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 카테고리 삭제
  const handleDelete = async (categoryId: string) => {
    if (window.confirm("이 회원 등급을 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, COLLECTIONS.USER_CATEGORIES, categoryId));
        toast.success("회원 등급이 삭제되었습니다.");
        fetchCategories(); // 목록 새로고침
      } catch (error) {
        console.error("Error deleting category:", error);
        toast.error("회원 등급 삭제 중 오류가 발생했습니다.");
      }
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">회원 등급 관리</h2>
        <Link
          to="/users/categories/new"
          className="text-primary-600 hover:text-primary-900 flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 회원 등급 등록
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                등급명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                레벨
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                설명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                등록일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                수정일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {category.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {category.level}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {category.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {category.createdAt}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {category.updatedAt}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <Link
                      to={`/users/categories/edit/${category.id}`}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      수정
                    </Link>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  등록된 회원 등급이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 