import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { db } from 'firebaseApp';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { COLLECTIONS, MyInfo, Order, User } from 'types/schema';
import Loader from 'components/common/Loader';
import { createCheckoutSession, redirectToCheckout } from 'utils/stripe';
import { toast } from 'react-toastify';
import Invoice from './Invoice';
import PaymentButtons from './PaymentButtons';

interface LocationState {
  orderId: string;
}

export default function OrderComplete() {
  const { orderId } = useParams();
  const location = useLocation();
  const state = location.state as LocationState;
  const orderNumber = state?.orderId || 'Order number information is missing';

  const [order, setOrder] = useState<Order | null>(null);
  const [orderUser, setOrderUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [myInfo, setMyInfo] = useState<MyInfo | null>(null);
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) return;

      try {
        setIsLoading(true);
        const orderDoc = await getDoc(doc(db, COLLECTIONS.ORDERS, orderId));
        
        if (orderDoc.exists()) {
          const orderData = { ...orderDoc.data(), id: orderDoc.id } as Order;
          setOrder(orderData);

          // 주문자의 사용자 정보 가져오기
          const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, orderData.userId));
          if (userDoc.exists()) {
            const userData = { ...userDoc.data(), id: userDoc.id } as User;
            setOrderUser(userData);
          }

          // myInfo 데이터 가져오기
          const myInfoDoc = await getDoc(doc(db, COLLECTIONS.MY_INFO, 'company'));
          if (myInfoDoc.exists()) {
            const myInfoData = { ...myInfoDoc.data(), id: myInfoDoc.id } as MyInfo;
            setMyInfo(myInfoData);
          }

          // CFR인 경우 DHL API로 운송료 계산 (임시 구현)
          if (orderData.shippingTerms === 'CFR') {
            // 임시로 주문 금액의 5%를 운송료로 설정
            const tempShippingCost = orderData.totalAmount * 0.05;
            setShippingCost(tempShippingCost);
          }
        }
      } catch (error) {
        console.error('Error loading order information:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  // Stripe 결제를 처리하는 함수
  const handlePayment = async () => {
    if (!order) return;
    
    try {
      setIsInitiatingPayment(true);
      
      // 총 결제 금액 계산 (CFR인 경우 운송료 포함)
      const totalAmount = order.shippingTerms === 'CFR' 
        ? order.totalAmount + shippingCost 
        : order.totalAmount;
      
      // Stripe 결제 세션 생성
      const session = await createCheckoutSession(order.orderId, totalAmount);
      
      // Stripe 결제 페이지로 리다이렉트
      await redirectToCheckout(session.id);
      
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Error processing payment. Please try again later.');
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  // 주문 취소 함수 추가
  const handleCancelOrder = async () => {
    if (!order || order.status !== 'pending') return;

    try {
      await updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), {
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
        updatedBy: order.userEmail || order.userId
      });

      // 주문 정보 다시 로드
      const updatedOrderDoc = await getDoc(doc(db, COLLECTIONS.ORDERS, order.id));
      if (updatedOrderDoc.exists()) {
        const updatedOrderData = { ...updatedOrderDoc.data(), id: updatedOrderDoc.id } as Order;
        setOrder(updatedOrderData);
      }

      toast.success('Order cancelled successfully.');
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Error cancelling order.');
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Order Confirmation and Payment</h1>
        <p className="text-gray-600">Check order information and make payment.</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between mb-6 pb-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">Order Information</h2>
            <p className="text-gray-600">Order Number: {orderNumber}</p>
            <p className="text-gray-600">Order Date: {order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}</p>
          </div>
          <div className="mt-4 md:mt-0">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Payment Status</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Pending Payment
            </span>
          </div>
        </div>

        {/* 주문자 배송지 정보 섹션 */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Order Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Order Information</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Company Name: {orderUser?.fullCompanyName}</p>
                <p className="text-sm text-gray-600">Contact Person: {orderUser?.personInCharge.name}</p>
                <p className="text-sm text-gray-600">Email: {orderUser?.email}</p>
                <p className="text-sm text-gray-600">Phone Number: {orderUser?.telNo}</p>
                <p className="text-sm text-gray-600">Mobile Number: {orderUser?.mobNo}</p>
                <p className="text-sm text-gray-600">Address: {orderUser?.companyAddress}</p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Shipping Information</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Company Name: {order?.shipTo?.companyName}</p>
                <p className="text-sm text-gray-600">Contact Person: {order?.shipTo?.contactName}</p>
                <p className="text-sm text-gray-600">Phone Number: {order?.shipTo?.telNo}</p>
                <p className="text-sm text-gray-600">Mobile Number: {order?.shipTo?.mobNo}</p>
                <p className="text-sm text-gray-600">Email: {order?.shipTo?.email}</p>
                <p className="text-sm text-gray-600">Address: {order?.shipTo?.address}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            <span className="text-gray-600">Shipping Terms</span>
            <span className="text-gray-900">{order?.shippingTerms === 'FOB' ? 'FOB (Free)' : 'CFR (Shipping Cost Included)'}</span>
          </div>
        </div>

        {order && (
          <>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Order Products</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items.map((item) => (
                    <tr key={item.productId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <img 
                              className="h-10 w-10 rounded-full object-cover" 
                              src={item.imageUrl.thumbnail} 
                              alt={item.name} 
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">{item.categoryName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.discountPrice ? (
                          <div>
                            <div className="text-sm text-gray-500 line-through">{formatPrice(item.price)}</div>
                            <div className="text-sm text-primary-600">{formatPrice(item.discountPrice)}</div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-900">{formatPrice(item.price)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPrice(parseFloat(((item.discountPrice || item.price) * item.quantity).toFixed(2)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">{formatPrice(parseFloat(order.totalAmount.toFixed(2)))}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Shipping Fee</span>
                <span className="text-gray-900">
                  {order.shippingTerms === 'CFR' ? formatPrice(shippingCost) : '$0.00'}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-gray-900">Total</span>
                <span className="text-primary-600">
                  {formatPrice(parseFloat((order.totalAmount + (order.shippingTerms === 'CFR' ? shippingCost : 0)).toFixed(2)))}
                </span>
              </div>
            </div>
          </>
        )}
      </div>


      {order && orderUser && order.status === 'pending' && (
        <div className="mt-8 flex justify-between items-center">
          <div className="flex space-x-4">
            {myInfo && <Invoice order={order} user={orderUser} myInfo={myInfo} />}
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleCancelOrder}
              className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel Order
            </button>
            <PaymentButtons 
              order={order} 
              userId={order.userId} 
              userEmail={order.userEmail}
              onOrderUpdate={(updatedOrder) => setOrder(updatedOrder)}
            />
          </div>
        </div>
      )}
    </div>

  );
} 