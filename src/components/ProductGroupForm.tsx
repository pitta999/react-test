import { useState, useEffect, useContext } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { db } from "firebaseApp";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-toastify";
import AuthContext from "context/AuthContext";
import { ProductGroup, COLLECTIONS } from "types/schema";
import Loader from "./Loader";

export default function ProductGroupForm() {
  const { groupId } = useParams();
  const isEditMode = !!groupId;
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // 폼 상태 관리
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 수정 모드일 경우 그룹 정보 불러오기
  useEffect(() => {
    const fetchGroupData = async () => {
      if (isEditMode && groupId) {
        setIsLoading(true);
        try {
          const groupDoc = await getDoc(doc(db, "productGroups", groupId));
          if (groupDoc.exists()) {
            const groupData = groupDoc.data() as ProductGroup;
            setName(groupData.name || "");
            setDescription(groupData.description || "");
          } else {
            toast.error("그룹 정보를 찾을 수 없습니다.");
            navigate("/groups");
          }
        } catch (error: any) {
          console.error("Error fetching group data:", error);
          toast.error("그룹 정보를 불러오는 중 오류가 발생했습니다.");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchGroupData();
  }, [groupId, isEditMode, navigate]);

  // 유효성 검사
  const validateForm = () => {
    if (!name.trim()) {
      setError("그룹명을 입력해주세요.");
      return false;
    }
    setError("");
    return true;
  };

  // 폼 제출 핸들러
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const groupData: Omit<ProductGroup, 'id'> = {
        name: name.trim(),
        description: description.trim(),
        updatedAt: new Date().toLocaleString("ko-KR"),
        updatedBy: user?.email || "unknown",
        createdAt: new Date().toLocaleString("ko-KR"),
        createdBy: user?.email || "unknown",
      };
      
      if (isEditMode && groupId) {
        // 기존 그룹 업데이트
        await updateDoc(doc(db, "productGroups", groupId), groupData);
        toast.success("그룹이 수정되었습니다.");
      } else {
        // 새 그룹 등록
        const newGroupId = uuidv4();
        await setDoc(doc(db, "productGroups", newGroupId), {
          id: newGroupId,
          ...groupData,
        });
        toast.success("그룹이 등록되었습니다.");
      }
      navigate("/groups");
    } catch (error: any) {
      console.error("Error saving group:", error);
      toast.error(error?.message || "그룹 저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 그룹 삭제 핸들러
  const handleDelete = async () => {
    if (!groupId) return;

    const confirmed = window.confirm("이 그룹을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.");
    if (!confirmed) return;

    setIsLoading(true);
    try {
      await deleteDoc(doc(db, "productGroups", groupId));
      toast.success("그룹이 삭제되었습니다.");
      navigate("/groups");
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("그룹 삭제 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">
            {isEditMode ? "그룹 수정" : "그룹 등록"}
          </h1>
        </div>
        
        <div className="mb-6">
          <label 
            htmlFor="name" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            그룹명
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="그룹명을 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div className="mb-6">
          <label 
            htmlFor="description" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            설명
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="그룹에 대한 설명을 입력하세요"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {error && (
          <div className="mb-6">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}
        
        <div className="flex gap-4">
          <Link
            to="/groups"
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-center"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "처리 중..." : isEditMode ? "수정하기" : "등록하기"}
          </button>
          {isEditMode && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              title="삭제"
            >
              🗑️
            </button>
          )}
        </div>
      </form>
    </div>
  );
} 