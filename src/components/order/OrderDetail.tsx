import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from 'firebaseApp';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { COLLECTIONS, Order, User } from 'types/schema';
import AuthContext from 'context/AuthContext';
import Loader from '../Loader';
import { createCheckoutSession, redirectToCheckout } from 'utils/stripe';
import { toast } from 'react-toastify';
import Invoice from './Invoice';
import PaymentButtons from './PaymentButtons';

export default function OrderDetail() {
  const { orderId } = useParams();
  const { user, isAdmin } = useContext(AuthContext);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderUser, setOrderUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) return;

      try {
        setIsLoading(true);
        const orderDoc = await getDoc(doc(db, COLLECTIONS.ORDERS, orderId));
        
        if (orderDoc.exists()) {
          const orderData = { ...orderDoc.data(), id: orderDoc.id } as Order;
          
          // 주문 소유자 확인 - 관리자는 모든 주문 확인 가능
          if (!isAdmin && orderData.userId !== user?.uid) {
            setOrder(null);
            return;
          }
          
          setOrder(orderData);

          // 주문자의 사용자 정보 가져오기
          const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, orderData.userId));
          if (userDoc.exists()) {
            const userData = { ...userDoc.data(), id: userDoc.id } as User;
            setOrderUser(userData);
          }
        } else {
          setOrder(null);
        }
      } catch (error) {
        console.error('주문 정보를 불러오는 중 오류가 발생했습니다:', error);
        setOrder(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchOrderDetails();
    }
  }, [orderId, user, isAdmin]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const getStatusBadge = () => {
    if (!order) return null;

    let bgColor = '';
    let statusText = '';

    switch (order.status) {
      case 'pending':
        bgColor = 'bg-yellow-100 text-yellow-800';
        statusText = '대기중';
        break;
      case 'processing':
        bgColor = 'bg-blue-100 text-blue-800';
        statusText = '처리중';
        break;
      case 'shipped':
        bgColor = 'bg-indigo-100 text-indigo-800';
        statusText = '배송중';
        break;
      case 'delivered':
        bgColor = 'bg-green-100 text-green-800';
        statusText = '배송완료';
        break;
      case 'cancelled':
        bgColor = 'bg-red-100 text-red-800';
        statusText = '취소됨';
        break;
      default:
        bgColor = 'bg-gray-100 text-gray-800';
        statusText = '알 수 없음';
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}>
        {statusText}
      </span>
    );
  };

  const getPaymentStatusBadge = () => {
    if (!order || !order.paymentStatus) return null;

    let bgColor = '';
    let statusText = '';

    switch (order.paymentStatus) {
      case 'pending':
        bgColor = 'bg-yellow-100 text-yellow-800';
        statusText = '결제 대기중';
        break;
      case 'paid':
        bgColor = 'bg-green-100 text-green-800';
        statusText = '결제 완료';
        break;
      case 'failed':
        bgColor = 'bg-red-100 text-red-800';
        statusText = '결제 실패';
        break;
      default:
        bgColor = 'bg-gray-100 text-gray-800';
        statusText = '알 수 없음';
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}>
        {statusText}
      </span>
    );
  };

  // Stripe 결제를 처리하는 함수
  const handlePayment = async () => {
    if (!order) return;
    
    try {
      setIsInitiatingPayment(true);
      
      // Stripe 결제 세션 생성
      const session = await createCheckoutSession(order.orderId, order.totalAmount);
      
      // 주문 정보 업데이트 (결제 세션 ID 저장)
      await updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), {
        paymentId: session.id,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || user?.uid
      });
      
      // Stripe 결제 페이지로 리다이렉트
      await redirectToCheckout(session.id);
      
    } catch (error) {
      console.error('결제 처리 중 오류가 발생했습니다:', error);
      toast.error('결제 처리 중 오류가 발생했습니다. 나중에 다시 시도해주세요.');
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || order.status !== 'pending') return;

    try {
      await updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), {
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || user?.uid
      });

      // 주문 정보 다시 로드
      const updatedOrderDoc = await getDoc(doc(db, COLLECTIONS.ORDERS, order.id));
      if (updatedOrderDoc.exists()) {
        const updatedOrderData = { ...updatedOrderDoc.data(), id: updatedOrderDoc.id } as Order;
        setOrder(updatedOrderData);
      }

      toast.success('주문이 성공적으로 취소되었습니다.');
    } catch (error) {
      console.error('주문 취소 중 오류가 발생했습니다:', error);
      toast.error('주문 취소 중 오류가 발생했습니다.');
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">주문 정보를 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-8">요청하신 주문 정보가 존재하지 않거나 접근 권한이 없습니다.</p>
          <Link
            to={isAdmin ? "/admin/orders" : "/order-history"}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            주문 내역으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">주문 상세</h1>
        <Link
          to={isAdmin ? "/admin/orders" : "/order-history"}
          className="text-primary-600 hover:text-primary-700"
        >
          주문 내역으로 돌아가기
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">주문 정보</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">주문번호: {order.orderId}</p>
              <p className="max-w-2xl text-sm text-gray-500">
                주문일: {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-2">
              {getStatusBadge()}
              {getPaymentStatusBadge()}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">이메일</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {order.userEmail}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">회사명</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {order.companyName}
              </dd>
            </div>
            {order.shippingAddress && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">배송 주소</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {order.shippingAddress}
                </dd>
              </div>
            )}
            {order.contactInfo && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">연락처</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {order.contactInfo}
                </dd>
              </div>
            )}
            {order.notes && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">주문 메모</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {order.notes}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">주문 상품</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상품
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                가격
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                수량
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                소계
              </th>
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
                        src={item.imageUrl}
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.quantity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPrice((item.discountPrice || item.price) * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">결제 정보</h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">소계</span>
            <span className="text-gray-900">{formatPrice(order.totalAmount)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">배송비</span>
            <span className="text-gray-900">$0.00</span>
          </div>
          <div className="flex justify-between font-medium border-t border-gray-200 pt-4 mt-4">
            <span className="text-gray-900">합계</span>
            <span className="text-primary-600 text-xl">{formatPrice(order.totalAmount)}</span>
          </div>
        </div>
      </div>

      {order.paymentStatus === 'pending' && order.status === 'pending' && (
        <div className="mt-6 flex justify-between items-center">
          <div className="flex space-x-4">
            {orderUser && (
              <Invoice order={order} user={orderUser} />
            )}
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleCancelOrder}
              className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              주문 취소
            </button>
            <PaymentButtons 
              order={order} 
              userId={user?.uid || ''} 
              userEmail={user?.email || ''}
              onOrderUpdate={(updatedOrder) => setOrder(updatedOrder)}
            />
          </div>
        </div>
      )}
    </div>
  );
} 