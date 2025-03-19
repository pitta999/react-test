import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { db } from 'firebaseApp';
import { doc, getDoc } from 'firebase/firestore';
import { COLLECTIONS, Order } from 'types/schema';
import Loader from '../Loader';

interface LocationState {
  orderId: string;
}

export default function OrderComplete() {
  const { orderId } = useParams();
  const location = useLocation();
  const state = location.state as LocationState;
  const orderNumber = state?.orderId || '주문 번호 정보가 없습니다';

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) return;

      try {
        setIsLoading(true);
        const orderDoc = await getDoc(doc(db, COLLECTIONS.ORDERS, orderId));
        
        if (orderDoc.exists()) {
          setOrder({ ...orderDoc.data(), id: orderDoc.id } as Order);
        }
      } catch (error) {
        console.error('주문 정보를 불러오는 중 오류가 발생했습니다:', error);
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

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-5">
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">주문이 완료되었습니다</h1>
        <p className="text-gray-600">주문해주셔서 감사합니다. 주문 정보는 아래와 같습니다.</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between mb-6 pb-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">주문 정보</h2>
            <p className="text-gray-600">주문 번호: {orderNumber}</p>
            <p className="text-gray-600">주문일: {order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}</p>
          </div>
          <div className="mt-4 md:mt-0">
            <h2 className="text-lg font-medium text-gray-900 mb-2">결제 상태</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              결제 대기중
            </span>
          </div>
        </div>

        {order && (
          <>
            <h3 className="text-lg font-medium text-gray-900 mb-4">주문 상품</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상품</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가격</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수량</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">소계</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items.map((item) => (
                    <tr key={item.productId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <img className="h-10 w-10 rounded-full object-cover" src={item.imageUrl} alt={item.name} />
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
                <span className="text-gray-600">소계</span>
                <span className="text-gray-900">{formatPrice(parseFloat(order.totalAmount.toFixed(2)))}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">배송비</span>
                <span className="text-gray-900">$0.00</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-gray-900">합계</span>
                <span className="text-primary-600">{formatPrice(parseFloat(order.totalAmount.toFixed(2)))}</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="text-center">
        <p className="text-gray-600 mb-6">
          주문과 관련된 자세한 정보는 주문 내역에서 확인할 수 있습니다.
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            홈으로 이동
          </Link>
          <Link
            to="/order-history"
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            주문 내역 보기
          </Link>
        </div>
      </div>
    </div>
  );
} 