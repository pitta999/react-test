import { useContext, useEffect, useState } from "react";
import { db } from "firebaseApp";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import AuthContext from "context/AuthContext";
import { toast } from "react-toastify";
import Loader from "components/common/Loader";
import { useNavigate } from "react-router-dom";
import Logout from "components/auth/Logout";

interface UserInfo {
  uid: string;
  email: string;
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
  createdAt: string;
  updatedAt?: string;
}

export default function ProfileInfo() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user?.uid) return;

      setIsLoading(true);
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserInfo({
            ...userDoc.data() as UserInfo,
            uid: userDoc.id,
          });
        } else {
          toast.error("사용자 정보를 찾을 수 없습니다.");
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        toast.error("사용자 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, [user]);

  const handleEdit = () => {
    navigate('/profile/edit');
  };

  if (isLoading) {
    return <Loader />;
  }

  if (!userInfo) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">User information not found.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Information</h2>
        <Logout />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center">
                <span className="w-32 text-sm font-medium text-gray-500">Email</span>
                <span className="text-sm text-gray-900">{userInfo.email}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Company Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">Company Name</span>
                <span className="text-sm text-gray-900">{userInfo.fullCompanyName}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">Trading Name</span>
                <span className="text-sm text-gray-900">{userInfo.tradingName}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">Company Address</span>
                <span className="text-sm text-gray-900">{userInfo.companyAddress}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">Country Code</span>
                <span className="text-sm text-gray-900">{userInfo.countryCode}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">VAT Number</span>
                <span className="text-sm text-gray-900">{userInfo.vatNumber}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">Person in Charge</span>
                <span className="text-sm text-gray-900">
                  {userInfo.personInCharge.name} ({userInfo.personInCharge.title})
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">Person in Charge Email</span>
                <span className="text-sm text-gray-900">{userInfo.personInCharge.email}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">Contact</span>
                <span className="text-sm text-gray-900">
                  Tel: {userInfo.telNo} / Mob: {userInfo.mobNo}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">Web Site</span>
                <span className="text-sm text-gray-900">{userInfo.webAddress}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">Business Type</span>
                <span className="text-sm text-gray-900">{userInfo.businessType}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">Installation Service</span>
                <span className="text-sm text-gray-900">{userInfo.installationService}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">Sales Products</span>
                <span className="text-sm text-gray-900">{userInfo.salesProducts}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">Trade Amount</span>
                <span className="text-sm text-gray-900">{userInfo.tradeAmount}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">Preferential Model</span>
                <span className="text-sm text-gray-900">{userInfo.preferentialModel}</span>
              </div>
              <div className="flex items-center">
                <span className="w-48 text-sm font-medium text-gray-500">Estimated Purchase</span>
                <span className="text-sm text-gray-900">{userInfo.estimatedPurchase}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Registration Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center">
                <span className="w-32 text-sm font-medium text-gray-500">Registration Date</span>
                <span className="text-sm text-gray-900">{userInfo.createdAt}</span>
              </div>
              {userInfo.updatedAt && (
                <div className="flex items-center">
                  <span className="w-32 text-sm font-medium text-gray-500">Last Updated</span>
                  <span className="text-sm text-gray-900">{userInfo.updatedAt}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleEdit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Edit Information
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 