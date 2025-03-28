import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "firebaseApp";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import AuthContext from "context/AuthContext";
import { MyInfo, COLLECTIONS } from "types/schema";
import Loader from "./Loader";

export default function MyInfoForm() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [formData, setFormData] = useState<Partial<MyInfo>>({
    companyName: "",
    tradingName: "",
    businessNumber: "",
    address: "",
    telNo: "",
    faxNo: "",
    contactInfo: {
      name: "",
      title: "",
      telNo: "",
      mobNo: "",
      email: "",
    },
    bankInfo: {
      bankName: "",
      accountNumber: "",
      accountHolder: "",
      swiftCode: "",
    },
    shippingInfo: {
      origin: "",
      shipment: "",
      packing: "",
      validity: "",
    },
    logoUrl: "",
    description: "",
  });

  useEffect(() => {
    const fetchMyInfo = async () => {
      try {
        const myInfoDoc = await getDoc(doc(db, COLLECTIONS.MY_INFO, "company"));
        if (myInfoDoc.exists()) {
          setFormData(myInfoDoc.data() as MyInfo);
        }
      } catch (error) {
        console.error("Error fetching company info:", error);
        toast.error("회사 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyInfo();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof MyInfo] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      await setDoc(doc(db, COLLECTIONS.MY_INFO, "company"), {
        ...formData,
        updatedAt: new Date().toISOString(),
      });

      toast.success("회사 정보가 저장되었습니다.");
      navigate("/");
    } catch (error) {
      console.error("Error saving company info:", error);
      toast.error("회사 정보 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">접근 권한이 없습니다</h2>
          <p className="text-gray-600 mb-8">슈퍼 관리자만 접근할 수 있는 페이지입니다.</p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            회사 정보 관리
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">회사 정보</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                  회사명
                </label>
                <input
                  type="text"
                  name="companyName"
                  id="companyName"
                  value={formData.companyName || ""}
                  onChange={handleChange}
                  className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label htmlFor="tradingName" className="block text-sm font-medium text-gray-700">
                  거래명
                </label>
                <input
                  type="text"
                  name="tradingName"
                  id="tradingName"
                  value={formData.tradingName || ""}
                  onChange={handleChange}
                  className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label htmlFor="businessNumber" className="block text-sm font-medium text-gray-700">
                  사업자등록번호
                </label>
                <input
                  type="text"
                  name="businessNumber"
                  id="businessNumber"
                  value={formData.businessNumber || ""}
                  onChange={handleChange}
                  className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  회사 주소
                </label>
                <input
                  type="text"
                  name="address"
                  id="address"
                  value={formData.address || ""}
                  onChange={handleChange}
                  className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label htmlFor="telNo" className="block text-sm font-medium text-gray-700">
                    전화번호
                </label>
                <input
                    type="text"
                    name="telNo"
                    id="telNo"
                    value={formData.telNo || ""}
                    onChange={handleChange}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    required
                />
              </div>
              <div>
                <label htmlFor="faxNo" className="block text-sm font-medium text-gray-700">
                    팩스번호
                </label>
                <input
                    type="text"
                    name="faxNo"
                    id="faxNo"
                    value={formData.faxNo || ""}
                    onChange={handleChange}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    required
                />
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">담당자 정보</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="contactInfo.name" className="block text-sm font-medium text-gray-700">
                    담당자명
                  </label>
                  <input
                    type="text"
                    name="contactInfo.name"
                    id="contactInfo.name"
                    value={formData.contactInfo?.name || ""}
                    onChange={handleChange}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="contactInfo.title" className="block text-sm font-medium text-gray-700">
                    직위
                  </label>
                  <input
                    type="text"
                    name="contactInfo.title"
                    id="contactInfo.title"
                    value={formData.contactInfo?.title || ""}
                    onChange={handleChange}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="contactInfo.telNo" className="block text-sm font-medium text-gray-700">
                    전화번호
                  </label>
                  <input
                    type="text"
                    name="contactInfo.telNo"
                    id="contactInfo.telNo"
                    value={formData.contactInfo?.telNo || ""}
                    onChange={handleChange}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="contactInfo.mobNo" className="block text-sm font-medium text-gray-700">
                    휴대폰
                  </label>
                  <input
                    type="text"
                    name="contactInfo.mobNo"
                    id="contactInfo.mobNo"
                    value={formData.contactInfo?.mobNo || ""}
                    onChange={handleChange}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="contactInfo.email" className="block text-sm font-medium text-gray-700">
                    이메일
                  </label>
                  <input
                    type="email"
                    name="contactInfo.email"
                    id="contactInfo.email"
                    value={formData.contactInfo?.email || ""}
                    onChange={handleChange}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">계좌 정보</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="bankInfo.bankName" className="block text-sm font-medium text-gray-700">
                    은행명
                  </label>
                  <input
                    type="text"
                    name="bankInfo.bankName"
                    id="bankInfo.bankName"
                    value={formData.bankInfo?.bankName || ""}
                    onChange={handleChange}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="bankInfo.accountNumber" className="block text-sm font-medium text-gray-700">
                    계좌번호
                  </label>
                  <input
                    type="text"
                    name="bankInfo.accountNumber"
                    id="bankInfo.accountNumber"
                    value={formData.bankInfo?.accountNumber || ""}
                    onChange={handleChange}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="bankInfo.accountHolder" className="block text-sm font-medium text-gray-700">
                    예금주
                  </label>
                  <input
                    type="text"
                    name="bankInfo.accountHolder"
                    id="bankInfo.accountHolder"
                    value={formData.bankInfo?.accountHolder || ""}
                    onChange={handleChange}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="bankInfo.swiftCode" className="block text-sm font-medium text-gray-700">
                    SWIFT CODE
                  </label>
                  <input
                    type="text"
                    name="bankInfo.swiftCode"
                    id="bankInfo.swiftCode"
                    value={formData.bankInfo?.swiftCode || ""}
                    onChange={handleChange}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">배송 정보</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="shippingInfo.origin" className="block text-sm font-medium text-gray-700">
                    원산지
                  </label>
                  <input
                    type="text"
                    name="shippingInfo.origin"
                    id="shippingInfo.origin"
                    value={formData.shippingInfo?.origin || ""}
                    onChange={handleChange}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="shippingInfo.shipment" className="block text-sm font-medium text-gray-700">
                    배송 조건
                  </label>
                  <input
                    type="text"
                    name="shippingInfo.shipment"
                    id="shippingInfo.shipment"
                    value={formData.shippingInfo?.shipment || ""}
                    onChange={handleChange}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="shippingInfo.packing" className="block text-sm font-medium text-gray-700">
                    포장 조건
                  </label>
                  <input
                    type="text"
                    name="shippingInfo.packing"
                    id="shippingInfo.packing"
                    value={formData.shippingInfo?.packing || ""}
                    onChange={handleChange}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="shippingInfo.validity" className="block text-sm font-medium text-gray-700">
                    유효기간
                  </label>
                  <input
                    type="text"
                    name="shippingInfo.validity"
                    id="shippingInfo.validity"
                    value={formData.shippingInfo?.validity || ""}
                    onChange={handleChange}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700">
                회사 로고 URL
              </label>
              <input
                type="text"
                name="logoUrl"
                id="logoUrl"
                value={formData.logoUrl || ""}
                onChange={handleChange}
                className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
            </div>

            <div className="mt-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                회사 설명
              </label>
              <textarea
                name="description"
                id="description"
                rows={4}
                value={formData.description || ""}
                onChange={handleChange}
                className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
} 