import React, { useState, useContext, useEffect } from 'react';
import { useCart } from 'context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { db } from 'firebaseApp';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import AuthContext from 'context/AuthContext';
import { COLLECTIONS, Order, OrderStatus } from 'types/schema';

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
  const [autocomplete, setAutocomplete] = useState<any>(null);
  const [autocompleteInput, setAutocompleteInput] = useState<HTMLInputElement | null>(null);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error('사용자 정보를 불러오는 중 오류가 발생했습니다:', error);
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    // Google Places API 스크립트 로드
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.google && autocompleteInput) {
        const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInput, {
          types: ['address'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.formatted_address) {
            setShippingAddress(place.formatted_address);
          }
        });

        setAutocomplete(autocomplete);
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, [autocompleteInput]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  // 주문 처리 함수
  const handleOrder = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    if (items.length === 0) {
      toast.error("장바구니가 비어있습니다.");
      return;
    }

    if (addressType === 'new' && !shippingAddress) {
      toast.error("배송지를 입력해주세요.");
      return;
    }

    try {
      setIsProcessing(true);

      // 사용자 정보 가져오기
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
      if (!userDoc.exists()) {
        throw new Error("사용자 정보를 찾을 수 없습니다.");
      }
      
      const userData = userDoc.data();
      
      // 주문 번호 생성 (현재 시간 + 랜덤 문자열)
      const timestamp = new Date().getTime();
      const randomString = Math.random().toString(36).substring(2, 8);
      const orderId = `ORD-${timestamp}-${randomString}`;
      
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
          imageUrl: item.imageUrl,
          categoryName: item.categoryName
        })),
        subtotal: totalAmount,
        totalAmount,
        status: 'pending' as OrderStatus,
        paymentStatus: 'pending',
        shippingAddress: addressType === 'company' ? userData.companyAddress : shippingAddress,
        shippingTerms,
        createdAt: new Date().toISOString(),
        createdBy: user.email || user.uid
      };
      
      console.log('주문 데이터:', JSON.stringify(orderData));
      
      // Firestore에 주문 데이터 저장
      const orderRef = await addDoc(collection(db, COLLECTIONS.ORDERS), orderData);
      console.log('주문 저장 완료, ID:', orderRef.id);
      
      // 장바구니 비우기
      clearCart();
      
      // 주문 완료 페이지로 이동
      toast.success(`주문이 완료되었습니다. 주문번호: ${orderId}`);
      navigate(`/order-confirm/${orderRef.id}`, { state: { orderId } });
      
    } catch (error) {
      console.error("주문 처리 중 오류가 발생했습니다:", error);
      toast.error("주문 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">장바구니가 비어있습니다</h2>
          <p className="text-gray-600 mb-8">상품을 추가해주세요.</p>
          <Link
            to="/products"
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            상품 목록으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">장바구니</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                상품 정보
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                가격
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                수량
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                총 금액
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                삭제
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
                        src={item.imageUrl}
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
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <span className="text-lg font-medium text-gray-900">총 결제 금액</span>
          <span className="text-2xl font-bold text-primary-600">
            {formatPrice(parseFloat(totalAmount.toFixed(2)))}
          </span>
        </div>

        {/* 배송지 정보 섹션 수정 */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">배송지 정보</h3>
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
                <span className="ml-2 text-sm text-gray-700">회사 주소 사용</span>
              </label>
              {addressType === 'company' && (
                <div className="ml-4 p-1 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">{userData?.companyAddress || '회사 주소 정보가 없습니다.'}</p>
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
                <span className="ml-2 text-sm text-gray-700">새로운 배송지</span>
              </label>
              
              {addressType === 'new' && (
                <div className="ml-6">
                  <label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-700">
                    배송지 주소
                  </label>
                  <input
                    ref={setAutocompleteInput}
                    type="text"
                    id="shippingAddress"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="주소를 입력하거나 선택해주세요"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 운송조건 섹션 */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">운송조건</h3>
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
            계속 쇼핑하기
          </Link>
          <button
            onClick={handleOrder}
            disabled={isProcessing}
            className={`inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white ${
              isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {isProcessing ? '처리 중...' : '주문하기'}
          </button>
        </div>
      </div>
    </div>
  );
} 