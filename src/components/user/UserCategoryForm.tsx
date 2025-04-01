import { useState, useEffect, useContext } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { db } from "firebaseApp";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-toastify";
import AuthContext from "context/AuthContext";
import { UserCategory, COLLECTIONS } from "types/schema";
import Loader from "components/common/Loader";

export default function UserCategoryForm() {
  const { categoryId } = useParams();
  const isEditMode = !!categoryId;
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [level, setLevel] = useState<number>(1);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchCategoryData = async () => {
      if (isEditMode && categoryId) {
        setIsLoading(true);
        try {
          const categoryDoc = await getDoc(doc(db, COLLECTIONS.USER_CATEGORIES, categoryId));
          if (categoryDoc.exists()) {
            const categoryData = categoryDoc.data() as UserCategory;
            setName(categoryData.name);
            setDescription(categoryData.description);
            setLevel(categoryData.level);
          } else {
            toast.error("회원 등급 정보를 찾을 수 없습니다.");
            navigate("/users/categories");
          }
        } catch (error) {
          console.error("Error fetching category:", error);
          toast.error("회원 등급 정보를 불러오는 중 오류가 발생했습니다.");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchCategoryData();
  }, [categoryId, isEditMode, navigate]);

  const validateForm = () => {
    if (!name.trim()) {
      setError("회원 등급명을 입력해주세요.");
      return false;
    }
    if (!description.trim()) {
      setError("설명을 입력해주세요.");
      return false;
    }
    if (level < 1) {
      setError("등급 레벨은 1 이상이어야 합니다.");
      return false;
    }
    setError("");
    return true;
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const categoryData = {
        name,
        description,
        level,
        updatedAt: new Date().toLocaleString("ko-KR"),
        updatedBy: user?.email,
      };

      if (isEditMode && categoryId) {
        await updateDoc(doc(db, COLLECTIONS.USER_CATEGORIES, categoryId), categoryData);
        toast.success("회원 등급이 수정되었습니다.");
      } else {
        const newCategoryRef = doc(db, COLLECTIONS.USER_CATEGORIES, uuidv4());
        await setDoc(newCategoryRef, {
          ...categoryData,
          id: newCategoryRef.id,
          createdAt: new Date().toLocaleString("ko-KR"),
          createdBy: user?.email,
        });
        toast.success("회원 등급이 등록되었습니다.");
      }
      navigate("/users/categories");
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("회원 등급 저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <form onSubmit={onSubmit} className="max-w-2xl mx-auto bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditMode ? "회원 등급 수정" : "새 회원 등급 등록"}
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                등급명
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label htmlFor="level" className="block text-sm font-medium text-gray-700">
                등급 레벨
              </label>
              <input
                type="number"
                id="level"
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                min="1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                설명
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate("/users/categories")}
              className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-primary-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400"
            >
              {isEditMode ? "수정하기" : "등록하기"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 