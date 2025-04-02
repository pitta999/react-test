import React, { useState, useContext, useEffect } from 'react';
import { useCart } from 'context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { db } from 'firebaseApp';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import AuthContext from 'context/AuthContext';
import { COLLECTIONS, Order, OrderStatus } from 'types/schema';
import AddressInput from 'components/common/AddressInput';

declare global {
  interface Window {
    google: any;
  }
}

export default function Cart() {
  const { items, removeItem, updateQuantity, totalAmount, clearCart } = useCart();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [addressType, setAddressType] = useState<'company' | 'new'>('company');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingTerms, setShippingTerms] = useState<'FOB' | 'CFR'>('FOB');
  const [userData, setUserData] = useState<any>(null);
  const [newShippingInfo, setNewShippingInfo] = useState({
    companyName: '',
    contactName: '',
    telNo: '',
    mobNo: '',
    email: ''
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setNewShippingInfo({
            companyName: data.fullCompanyName || '',
            contactName: data.personInCharge?.name || '',
            telNo: data.telNo || '',
            mobNo: data.mobNo || '',
            email: data.email || ''
          });
        }
      } catch (error) {
        console.error('Error occurred while loading user information:', error);
      }
    };

    fetchUserData();
  }, [user]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const handleNewShippingInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewShippingInfo(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // 주문 처리 함수
  const handleOrder = async () => {
    if (!user) {
      toast.error("Login is required.");
      return;
    }

    if (items.length === 0) {
      toast.error("Cart is empty.");
      return;
    }

    if (addressType === 'new' && !shippingAddress) {
      toast.error("Please enter the shipping address.");
      return;
    }

    try {
      setIsProcessing(true);

      // 사용자 정보 가져오기
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
      if (!userDoc.exists()) {
        throw new Error("User information not found.");
      }
      
      const userData = userDoc.data();
      
      // 주문 번호 생성 (년월일-시간분초-랜덤스트링2개)
      const now = new Date();
      const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
      const timeStr = now.toTimeString().slice(0, 6).replace(/:/g, '');
      const randomStr = Math.random().toString(36).substring(2, 4);
      const orderId = `ORD-${dateStr}-${timeStr}-${randomStr}`;
      
      // 배송지 정보 설정
      const shipTo = addressType === 'company' 
        ? {
            companyName: userData.fullCompanyName || '',
            contactName: userData.personInCharge?.name || '',
            telNo: userData.telNo || '',
            mobNo: userData.mobNo || '',
            address: userData.companyAddress || '',
            email: userData.email || ''
          }
        : {
            companyName: newShippingInfo.companyName,
            contactName: newShippingInfo.contactName,
            telNo: newShippingInfo.telNo,
            mobNo: newShippingInfo.mobNo,
            address: shippingAddress,
            email: newShippingInfo.email
          };
      
      // 주문 데이터 생성
      const orderData: Omit<Order, 'id'> = {
        orderId,
        userId: user.uid,
        userEmail: user.email || '',
        companyName: userData.fullCompanyName || '',
        items: items.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          discountPrice: item.discountPrice,
          quantity: item.quantity,
          imageUrl: {
            thumbnail: item.imageUrl.thumbnail,
            small: item.imageUrl.small,
            original: item.imageUrl.original
          },
          categoryName: item.categoryName
        })),
        subtotal: totalAmount,
        totalAmount,
        status: 'pending' as OrderStatus,
        paymentStatus: 'pending',
        shippingTerms,
        shipTo,
        createdAt: new Date().toISOString(),
        createdBy: user.email || user.uid
      };
      
      console.log('Order data:', JSON.stringify(orderData));
      
      // Firestore에 주문 데이터 저장
      const orderRef = await addDoc(collection(db, COLLECTIONS.ORDERS), orderData);
      console.log('Order saved, ID:', orderRef.id);
      
      // 장바구니 비우기
      clearCart();
      
      // 주문 완료 페이지로 이동
      toast.success(`Order completed. Order number: ${orderId}`);
      navigate(`/order-confirm/${orderRef.id}`, { state: { orderId } });
      
    } catch (error) {
      console.error("Error occurred during order processing:", error);
      toast.error("Error occurred during order processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Cart is empty</h2>
          <p className="text-gray-600 mb-8">Please add products.</p>
          <Link
            to="/products"
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            Go to Product List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Cart</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                Product Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Delete
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-20 w-20">
                      <img
                        className="h-20 w-20 rounded object-cover"
                        src={item.imageUrl.small}
                        alt={item.name}
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {item.discountPrice ? (
                      <>
                        <span className="line-through text-gray-500">
                          {formatPrice(item.price)}
                        </span>
                        <br />
                        <span className="text-primary-600">
                          {formatPrice(item.discountPrice)}
                        </span>
                      </>
                    ) : (
                      <span>{formatPrice(item.price)}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-2 py-1 border rounded-l hover:bg-gray-50"
                    >
                      -
                    </button>
                    <span className="px-4 py-1 border-t border-b min-w-[40px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-2 py-1 border rounded-r hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPrice(parseFloat(((item.discountPrice || item.price) * item.quantity).toFixed(2)))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <span className="text-lg font-medium text-gray-900">Total Payment</span>
          <span className="text-2xl font-bold text-primary-600">
            {formatPrice(parseFloat(totalAmount.toFixed(2)))}
          </span>
        </div>

        {/* 배송지 정보 섹션 수정 */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Shipping Info</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="company"
                  checked={addressType === 'company'}
                  onChange={(e) => setAddressType(e.target.value as 'company' | 'new')}
                  className="form-radio h-4 w-4 text-primary-600"
                />
                <span className="ml-2 text-sm text-gray-700">Use Company Address</span>
              </label>
              {addressType === 'company' && (
                <div className="ml-6 space-y-2 p-4 bg-gray-50 rounded-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Company Name</p>
                      <p className="text-sm text-gray-600">{userData?.fullCompanyName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Contact Name</p>
                      <p className="text-sm text-gray-600">{userData?.personInCharge?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Tel No</p>
                      <p className="text-sm text-gray-600">{userData?.telNo || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Mobile No</p>
                      <p className="text-sm text-gray-600">{userData?.mobNo || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <p className="text-sm text-gray-600">{userData?.email || '-'}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-700">Address</p>
                    <p className="text-sm text-gray-600">{userData?.companyAddress || '-'}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="new"
                  checked={addressType === 'new'}
                  onChange={(e) => setAddressType(e.target.value as 'company' | 'new')}
                  className="form-radio h-4 w-4 text-primary-600"
                />
                <span className="ml-2 text-sm text-gray-700">New Shipping Address</span>
              </label>
              
              {addressType === 'new' && (
                <div className="ml-6 space-y-4 p-4 bg-gray-50 rounded-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                        Company Name
                      </label>
                      <input
                        type="text"
                        id="companyName"
                        value={newShippingInfo.companyName}
                        onChange={handleNewShippingInfoChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="contactName" className="block text-sm font-medium text-gray-700">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        id="contactName"
                        value={newShippingInfo.contactName}
                        onChange={handleNewShippingInfoChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="telNo" className="block text-sm font-medium text-gray-700">
                        Tel No
                      </label>
                      <input
                        type="text"
                        id="telNo"
                        value={newShippingInfo.telNo}
                        onChange={handleNewShippingInfoChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="mobNo" className="block text-sm font-medium text-gray-700">
                        Mobile No
                      </label>
                      <input
                        type="text"
                        id="mobNo"
                        value={newShippingInfo.mobNo}
                        onChange={handleNewShippingInfoChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={newShippingInfo.email}
                        onChange={handleNewShippingInfoChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-700">
                      Shipping Address
                    </label>
                    <AddressInput
                      value={shippingAddress}
                      onChange={setShippingAddress}
                      placeholder="Enter or select address"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 운송조건 섹션 */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Shipping Terms</h3>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="FOB"
                checked={shippingTerms === 'FOB'}
                onChange={(e) => setShippingTerms(e.target.value as 'FOB' | 'CFR')}
                className="form-radio h-4 w-4 text-primary-600"
              />
              <span className="ml-2 text-sm text-gray-700">FOB</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="CFR"
                checked={shippingTerms === 'CFR'}
                onChange={(e) => setShippingTerms(e.target.value as 'FOB' | 'CFR')}
                className="form-radio h-4 w-4 text-primary-600"
              />
              <span className="ml-2 text-sm text-gray-700">CFR</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Link
            to="/products"
            className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Continue Shopping
          </Link>
          <button
            onClick={handleOrder}
            disabled={isProcessing}
            className={`inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white ${
              isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {isProcessing ? 'Processing...' : 'Order Now'}
          </button>
        </div>
      </div>
    </div>
  );
} 