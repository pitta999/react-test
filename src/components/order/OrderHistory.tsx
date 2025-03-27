import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { db } from 'firebaseApp';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { COLLECTIONS, Order } from 'types/schema';
import AuthContext from 'context/AuthContext';
import Loader from '../Loader';

export default function OrderHistory() {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.uid) {
        console.log('사용자 정보가 없습니다. 주문을 불러올 수 없습니다.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log('주문 내역을 불러오는 중...', user.uid);
        
        // 일단 모든 주문을 가져온 다음 클라이언트에서 필터링
        const orderQuery = query(
          collection(db, COLLECTIONS.ORDERS),
          orderBy('createdAt', 'desc'),
          limit(100) // 최대 100개 주문 가져옴
        );
        
        const querySnapshot = await getDocs(orderQuery);
        const allOrders: Order[] = [];
        
        querySnapshot.forEach((doc) => {
          const orderData = { ...doc.data(), id: doc.id } as Order;
          allOrders.push(orderData);
        });
        
        console.log('불러온 전체 주문 내역:', allOrders.length, '건');
        
        // 클라이언트에서 현재 사용자의 주문만 필터링
        const userOrders = allOrders.filter(order => order.userId === user.uid);
        console.log('현재 사용자의 주문 내역:', userOrders.length, '건');
        console.log('첫 번째 주문 정보:', userOrders.length > 0 ? JSON.stringify(userOrders[0]) : '없음');
        
        setOrders(userOrders);
      } catch (error) {
        console.error('주문 내역을 불러오는 중 오류가 발생했습니다:', error);
        setError('주문 내역을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기중';
      case 'processing':
        return '처리중';
      case 'shipped':
        return '배송중';
      case 'delivered':
        return '배송완료';
      case 'cancelled':
        return '취소됨';
      default:
        return '알 수 없음';
    }
  };

  const getPaymentStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '결제 대기중';
      case 'paid':
        return '결제 완료';
      case 'failed':
        return '결제 실패';
      default:
        return '알 수 없음';
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">에러가 발생했습니다</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">주문 내역이 없습니다</h2>
          <p className="text-gray-600 mb-8">아직 주문한 상품이 없습니다.</p>
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">주문 내역</h1>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {orders.map((order) => (
            <li key={order.id} className="p-4 hover:bg-gray-50">
              <Link to={`/order-detail/${order.id}`} className="block">
                <div className="flex flex-col md:flex-row justify-between">
                  <div className="mb-4 md:mb-0">
                    <p className="text-lg font-medium text-gray-900 mb-1">
                      주문번호: {order.orderId}
                    </p>
                    <p className="text-sm text-gray-500">
                      주문일: {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col md:items-end">
                    <div className="flex space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                      {order.paymentStatus && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadgeColor(order.paymentStatus)}`}>
                          {getPaymentStatusText(order.paymentStatus)}
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-medium text-primary-600">
                      {formatPrice(order.totalAmount)}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-700">
                    {order.items[0]?.name}
                    {order.items.length > 1 && ` 외 ${order.items.length - 1}개 상품`}
                    {' '}(총 {order.items.reduce((total, item) => total + item.quantity, 0)}개)
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/products"
          className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          계속 쇼핑하기
        </Link>
      </div>
    </div>
  );
} 