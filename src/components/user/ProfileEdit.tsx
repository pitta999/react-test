import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "firebaseApp";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import AuthContext from "context/AuthContext";
import Loader from "components/common/Loader";
import AddressInput from "../common/AddressInput";

interface UserFormData {
  fullCompanyName: string;
  tradingName: string;
  companyAddress: string;
  countryCode: string;
  vatNumber: string;
  personInCharge: {
    name: string;
    title: string;
    email: string;
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
}

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [fullCompanyName, setFullCompanyName] = useState<string>("");
  const [tradingName, setTradingName] = useState<string>("");
  const [companyAddress, setCompanyAddress] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("");
  const [vatNumber, setVatNumber] = useState<string>("");
  const [personInChargeName, setPersonInChargeName] = useState<string>("");
  const [personInChargeTitle, setPersonInChargeTitle] = useState<string>("");
  const [personInChargeEmail, setPersonInChargeEmail] = useState<string>("");
  const [telNo, setTelNo] = useState<string>("");
  const [mobNo, setMobNo] = useState<string>("");
  const [webAddress, setWebAddress] = useState<string>("");
  const [businessType, setBusinessType] = useState<'B2B' | 'B2C' | 'Other'>('B2B');
  const [installationService, setInstallationService] = useState<'Yes' | 'No'>('Yes');
  const [salesProducts, setSalesProducts] = useState<string>("");
  const [tradeAmount, setTradeAmount] = useState<string>("");
  const [preferentialModel, setPreferentialModel] = useState<string>("");
  const [estimatedPurchase, setEstimatedPurchase] = useState<string>("");

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return;

      setIsLoading(true);
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserFormData;
          setFullCompanyName(userData.fullCompanyName || "");
          setTradingName(userData.tradingName || "");
          setCompanyAddress(userData.companyAddress || "");
          setCountryCode(userData.countryCode || "");
          setVatNumber(userData.vatNumber || "");
          setPersonInChargeName(userData.personInCharge.name || "");
          setPersonInChargeTitle(userData.personInCharge.title || "");
          setPersonInChargeEmail(userData.personInCharge.email || "");
          setTelNo(userData.telNo || "");
          setMobNo(userData.mobNo || "");
          setWebAddress(userData.webAddress || "");
          setBusinessType(userData.businessType || "B2B");
          setInstallationService(userData.installationService || "Yes");
          setSalesProducts(userData.salesProducts || "");
          setTradeAmount(userData.tradeAmount || "");
          setPreferentialModel(userData.preferentialModel || "");
          setEstimatedPurchase(userData.estimatedPurchase || "");
        } else {
          toast.error("사용자 정보를 찾을 수 없습니다.");
          navigate("/profile");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("사용자 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user, navigate]);

  const validateForm = () => {
    // 전화번호 형식 검사 (숫자만)
    const phoneRegex = /^[0-9]*$/;
    if (!telNo.match(phoneRegex) || !mobNo.match(phoneRegex)) {
      setError("전화번호는 숫자만 입력 가능합니다.");
      return false;
    }

    setError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        fullCompanyName,
        tradingName,
        companyAddress,
        countryCode,
        vatNumber,
        personInCharge: {
          name: personInChargeName,
          title: personInChargeTitle,
          email: personInChargeEmail
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
        updatedAt: new Date().toLocaleString("ko-KR"),
      });

      toast.success("정보가 성공적으로 업데이트되었습니다.");
      navigate("/profile");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("정보 업데이트 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Edit My Information</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Company Information</h3>
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
                <label htmlFor="countryCode" className="block text-sm font-medium text-gray-500">
                  Country Code
                </label>
                <input
                  type="text"
                  id="countryCode"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="KR"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="vatNumber" className="block text-sm font-medium text-gray-500">
                  VAT Number
                </label>
                <input
                  type="text"
                  id="vatNumber"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="VAT Number"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-500">
                  Company Address
                </label>
                <AddressInput
                  value={companyAddress}
                  onChange={setCompanyAddress}
                  placeholder="Enter company address"
                  className="w-full"
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

              <div className="space-y-2">
                <label htmlFor="personInChargeEmail" className="block text-sm font-medium text-gray-500">
                  Person in Charge (Email)
                </label>
                <input
                  type="email"
                  id="personInChargeEmail"
                  value={personInChargeEmail}
                  onChange={(e) => setPersonInChargeEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter the email of the person in charge"
                  required
                />
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
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? "Processing..." : "Update"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
