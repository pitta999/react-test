import { useState, useContext, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { app, db } from "firebaseApp";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs, collection } from "firebase/firestore";
import { toast } from "react-toastify";
import AuthContext from "context/AuthContext";
import { UserCategory } from "./UserCategoryForm";

interface UserFormData {
  email: string;
  fullCompanyName: string;
  tradingName: string;
  companyAddress: string;
  personInCharge: {
    name: string;
    title: string;
  };
  telNo: string;
  mobNo: string;
  webAddress: string;
  businessType: 'B2B' | 'B2C' | 'Other';
  installationService: 'Yes' | 'No';
  salesProducts: string;
  tradeAmount: string;
  preferentialModel: string;
  estimatedPurchase: string;
  categoryId: string;
  categoryName: string;
  categoryLevel: number;
}

export default function UserForm() {
  const { userId } = useParams();
  const isEditMode = !!userId;
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const auth = getAuth(app);

  const [error, setError] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [passwordConfirm, setPasswordConfirm] = useState<string>("");
  const [fullCompanyName, setFullCompanyName] = useState<string>("");
  const [tradingName, setTradingName] = useState<string>("");
  const [companyAddress, setCompanyAddress] = useState<string>("");
  const [personInChargeName, setPersonInChargeName] = useState<string>("");
  const [personInChargeTitle, setPersonInChargeTitle] = useState<string>("");
  const [telNo, setTelNo] = useState<string>("");
  const [mobNo, setMobNo] = useState<string>("");
  const [webAddress, setWebAddress] = useState<string>("");
  const [businessType, setBusinessType] = useState<'B2B' | 'B2C' | 'Other'>('B2B');
  const [installationService, setInstallationService] = useState<'Yes' | 'No'>('Yes');
  const [salesProducts, setSalesProducts] = useState<string>("");
  const [tradeAmount, setTradeAmount] = useState<string>("");
  const [preferentialModel, setPreferentialModel] = useState<string>("");
  const [estimatedPurchase, setEstimatedPurchase] = useState<string>("");
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 회원 등급 목록 불러오기
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "userCategories"));
        const categoryList: UserCategory[] = [];
        querySnapshot.forEach((doc) => {
          categoryList.push(doc.data() as UserCategory);
        });
        const sortedCategories = categoryList.sort((a, b) => a.level - b.level);
        setCategories(sortedCategories);
        if (sortedCategories.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(sortedCategories[0].id);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("회원 등급 목록을 불러오는 중 오류가 발생했습니다.");
      }
    };

    fetchCategories();
  }, [selectedCategoryId]);

  // 수정 모드일 경우 사용자 정보 불러오기
  useEffect(() => {
    const fetchUserData = async () => {
      if (isEditMode && userId) {
        setIsLoading(true);
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserFormData;
            setEmail(userData.email || "");
            setFullCompanyName(userData.fullCompanyName || "");
            setTradingName(userData.tradingName || "");
            setCompanyAddress(userData.companyAddress || "");
            setPersonInChargeName(userData.personInCharge.name || "");
            setPersonInChargeTitle(userData.personInCharge.title || "");
            setTelNo(userData.telNo || "");
            setMobNo(userData.mobNo || "");
            setWebAddress(userData.webAddress || "");
            setBusinessType(userData.businessType || "B2B");
            setInstallationService(userData.installationService || "Yes");
            setSalesProducts(userData.salesProducts || "");
            setTradeAmount(userData.tradeAmount || "");
            setPreferentialModel(userData.preferentialModel || "");
            setEstimatedPurchase(userData.estimatedPurchase || "");
            setSelectedCategoryId(userData.categoryId || "");
          } else {
            toast.error("사용자 정보를 찾을 수 없습니다.");
            navigate("/users");
          }
        } catch (error: any) {
          console.error("Error fetching user data:", error);
          toast.error("사용자 정보를 불러오는 중 오류가 발생했습니다.");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchUserData();
  }, [userId, isEditMode, navigate]);

  const validateForm = () => {
    // 이메일 형식 검사
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    if (!email.match(emailRegex)) {
      setError("이메일 형식이 올바르지 않습니다.");
      return false;
    }

    // 비밀번호 검사 (새 사용자 등록 시에만)
    if (!isEditMode) {
      if (password.length < 8) {
        setError("비밀번호는 8자리 이상이어야 합니다.");
        return false;
      }

      if (password !== passwordConfirm) {
        setError("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        return false;
      }
    }

    // 전화번호 형식 검사 (숫자만)
    const phoneRegex = /^[0-9]*$/;
    if (!telNo.match(phoneRegex) || !mobNo.match(phoneRegex)) {
      setError("전화번호는 숫자만 입력 가능합니다.");
      return false;
    }

    if (!selectedCategoryId) {
      setError("회원 등급을 선택해주세요.");
      return false;
    }

    setError("");
    return true;
  };

  const handleCreateUser = async () => {
    try {
      // 현재 로그인된 관리자 정보 저장
      const adminEmail = user?.email;
      const adminPassword = prompt("관리자 계정의 비밀번호를 입력하세요.");

      if (!adminEmail || !adminPassword) {
        toast.error("관리자 계정 정보를 가져올 수 없습니다.");
        return;
      }

      // 선택된 카테고리 정보 가져오기
      const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
      if (!selectedCategory) {
        throw new Error("선택한 회원 등급을 찾을 수 없습니다.");
      }

      // 새 사용자 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Firestore에 추가 사용자 정보 저장
      await setDoc(doc(db, "users", newUser.uid), {
        email: email,
        fullCompanyName,
        tradingName,
        companyAddress,
        personInCharge: {
          name: personInChargeName,
          title: personInChargeTitle
        },
        telNo,
        mobNo,
        webAddress,
        businessType,
        installationService,
        salesProducts,
        tradeAmount,
        preferentialModel,
        estimatedPurchase,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        categoryLevel: selectedCategory.level,
        createdAt: new Date().toLocaleString("ko-KR"),
        uid: newUser.uid,
      });

      toast.success("사용자가 성공적으로 등록되었습니다.");

      // 관리자 계정으로 다시 로그인
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      toast.info("관리자 계정으로 복귀했습니다.");

      navigate("/users");
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error?.code || "사용자 등록 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateUser = async () => {
    if (!userId) return;
    
    try {
      const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
      if (!selectedCategory) {
        throw new Error("선택한 회원 등급을 찾을 수 없습니다.");
      }

      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        fullCompanyName,
        tradingName,
        companyAddress,
        personInCharge: {
          name: personInChargeName,
          title: personInChargeTitle
        },
        telNo,
        mobNo,
        webAddress,
        businessType,
        installationService,
        salesProducts,
        tradeAmount,
        preferentialModel,
        estimatedPurchase,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        categoryLevel: selectedCategory.level,
        updatedAt: new Date().toLocaleString("ko-KR"),
      });

      toast.success("사용자 정보가 성공적으로 업데이트되었습니다.");
      navigate(`/users/${userId}`);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error?.code || "사용자 정보 업데이트 중 오류가 발생했습니다.");
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      if (isEditMode) {
        await handleUpdateUser();
      } else {
        await handleCreateUser();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 사용자 삭제 핸들러
  const handleDelete = async () => {
    if (!userId || !user?.email) return;

    const confirmed = window.confirm("이 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.");
    if (!confirmed) return;

    // 관리자 비밀번호 확인
    const adminPassword = prompt("관리자 계정의 비밀번호를 입력하세요.");
    if (!adminPassword) {
      toast.error("관리자 인증이 필요합니다.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. 현재 관리자 재인증
      await signInWithEmailAndPassword(auth, user.email, adminPassword);

      // 2. Firestore에서 사용자 데이터 가져오기
      const userDoc = await getDoc(doc(db, "users", userId));
      if (!userDoc.exists()) {
        throw new Error("사용자 정보를 찾을 수 없습니다.");
      }
      const userData = userDoc.data();

      // 3. Firestore에서 사용자 데이터 삭제
      await deleteDoc(doc(db, "users", userId));

      // 4. Firebase Authentication에서 사용자 삭제
      try {
        const userCredential = await signInWithEmailAndPassword(auth, userData.email, "temporary_access");
        const userToDelete = userCredential.user;
        await deleteUser(userToDelete);
      } catch (authError) {
        console.error("Error deleting user from Authentication:", authError);
        toast.warning("사용자 계정은 Firestore에서만 삭제되었습니다. Authentication에서 수동으로 삭제가 필요할 수 있습니다.");
      }

      // 5. 관리자로 다시 로그인
      await signInWithEmailAndPassword(auth, user.email, adminPassword);

      toast.success("사용자가 성공적으로 삭제되었습니다.");
      navigate("/users");
    } catch (error) {
      console.error("Error during delete process:", error);
      toast.error("사용자 삭제 중 오류가 발생했습니다. 관리자 인증을 확인해주세요.");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditMode ? "사용자 정보 수정" : "사용자 등록"}
        </h2>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">기본 정보</h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-500">
                  이메일
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isEditMode}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  required
                />
              </div>

              {!isEditMode && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-500">
                      비밀번호
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-500">
                      비밀번호 확인
                    </label>
                    <input
                      type="password"
                      id="password_confirm"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label htmlFor="membershipLevel" className="block text-sm font-medium text-gray-500">
                  회원 등급
                </label>
                <select
                  id="membershipLevel"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map((category) => (
                    <option value={category.id} key={category.id}>
                      {category.name} (Level {category.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">회사 정보</h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label htmlFor="fullCompanyName" className="block text-sm font-medium text-gray-500">
                  Full Company Name
                </label>
                <input
                  type="text"
                  id="fullCompanyName"
                  value={fullCompanyName}
                  onChange={(e) => setFullCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="tradingName" className="block text-sm font-medium text-gray-500">
                  Trading Name
                </label>
                <input
                  type="text"
                  id="tradingName"
                  value={tradingName}
                  onChange={(e) => setTradingName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-500">
                  Company Address
                </label>
                <input
                  type="text"
                  id="companyAddress"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="personInChargeName" className="block text-sm font-medium text-gray-500">
                    Person in Charge (Name)
                  </label>
                  <input
                    type="text"
                    id="personInChargeName"
                    value={personInChargeName}
                    onChange={(e) => setPersonInChargeName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="personInChargeTitle" className="block text-sm font-medium text-gray-500">
                    Title
                  </label>
                  <input
                    type="text"
                    id="personInChargeTitle"
                    value={personInChargeTitle}
                    onChange={(e) => setPersonInChargeTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="telNo" className="block text-sm font-medium text-gray-500">
                    Tel No.
                  </label>
                  <input
                    type="tel"
                    id="telNo"
                    value={telNo}
                    onChange={(e) => setTelNo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="mobNo" className="block text-sm font-medium text-gray-500">
                    Mob No.
                  </label>
                  <input
                    type="tel"
                    id="mobNo"
                    value={mobNo}
                    onChange={(e) => setMobNo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="webAddress" className="block text-sm font-medium text-gray-500">
                  Web Address
                </label>
                <input
                  type="url"
                  id="webAddress"
                  value={webAddress}
                  onChange={(e) => setWebAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="businessType" className="block text-sm font-medium text-gray-500">
                    Business Type
                  </label>
                  <select
                    id="businessType"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as 'B2B' | 'B2C' | 'Other')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="B2B">B2B</option>
                    <option value="B2C">B2C</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="installationService" className="block text-sm font-medium text-gray-500">
                    Installation Service
                  </label>
                  <select
                    id="installationService"
                    value={installationService}
                    onChange={(e) => setInstallationService(e.target.value as 'Yes' | 'No')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="salesProducts" className="block text-sm font-medium text-gray-500">
                  Sales Products
                </label>
                <textarea
                  id="salesProducts"
                  value={salesProducts}
                  onChange={(e) => setSalesProducts(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="tradeAmount" className="block text-sm font-medium text-gray-500">
                  Trade Amount
                </label>
                <input
                  type="text"
                  id="tradeAmount"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="preferentialModel" className="block text-sm font-medium text-gray-500">
                  Preferential Model
                </label>
                <input
                  type="text"
                  id="preferentialModel"
                  value={preferentialModel}
                  onChange={(e) => setPreferentialModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="estimatedPurchase" className="block text-sm font-medium text-gray-500">
                  Estimated Amount of Purchase
                </label>
                <input
                  type="text"
                  id="estimatedPurchase"
                  value={estimatedPurchase}
                  onChange={(e) => setEstimatedPurchase(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
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
            <Link
              to="/users"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? "처리 중..." : isEditMode ? "수정하기" : "등록하기"}
            </button>
            {isEditMode && (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                title="삭제"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}