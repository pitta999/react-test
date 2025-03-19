import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { db } from 'firebaseApp';
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { COLLECTIONS, Order, OrderStatus } from 'types/schema';
import AuthContext from 'context/AuthContext';
import Loader from '../Loader';
import { toast } from 'react-toastify';

export default function AdminOrderList() {
  const { user, isAdmin } = useContext(AuthContext);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isUpdating, setIsUpdating] = useState<{[key: string]: boolean}>({});
  
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const orderQuery = query(
          collection(db, COLLECTIONS.ORDERS),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(orderQuery);
        const orderList: Order[] = [];
        
        querySnapshot.forEach((doc) => {
          orderList.push({ ...doc.data(), id: doc.id } as Order);
        });
        
        setOrders(orderList);
      } catch (error) {
        console.error('주문 목록을 불러오는 중 오류가 발생했습니다:', error);
        toast.error('주문 목록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [isAdmin]);

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

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setIsUpdating(prev => ({ ...prev, [orderId]: true }));
      
      await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || user?.uid
      });
      
      // 주문 상태 업데이트
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus, updatedAt: new Date().toISOString() } 
            : order
        )
      );
      
      toast.success('주문 상태가 업데이트되었습니다.');
    } catch (error) {
      console.error('주문 상태 업데이트 중 오류가 발생했습니다:', error);
      toast.error('주문 상태 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === statusFilter);

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">접근 권한이 없습니다</h2>
          <p className="text-gray-600 mb-8">관리자만 접근할 수 있는 페이지입니다.</p>
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">주문 관리</h1>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <div className="flex space-x-2 mb-4 sm:mb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 rounded-md text-sm ${
                statusFilter === 'all' 
                  ? 'bg-primary-100 text-primary-800 font-medium' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-2 rounded-md text-sm ${
                statusFilter === 'pending' 
                  ? 'bg-yellow-100 text-yellow-800 font-medium' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              대기중
            </button>
            <button
              onClick={() => setStatusFilter('processing')}
              className={`px-3 py-2 rounded-md text-sm ${
                statusFilter === 'processing' 
                  ? 'bg-blue-100 text-blue-800 font-medium' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              처리중
            </button>
            <button
              onClick={() => setStatusFilter('shipped')}
              className={`px-3 py-2 rounded-md text-sm ${
                statusFilter === 'shipped' 
                  ? 'bg-indigo-100 text-indigo-800 font-medium' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              배송중
            </button>
            <button
              onClick={() => setStatusFilter('delivered')}
              className={`px-3 py-2 rounded-md text-sm ${
                statusFilter === 'delivered' 
                  ? 'bg-green-100 text-green-800 font-medium' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              배송완료
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-2 rounded-md text-sm ${
                statusFilter === 'cancelled' 
                  ? 'bg-red-100 text-red-800 font-medium' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              취소됨
            </button>
          </div>
        </div>

        <p className="text-gray-500">
          총 {filteredOrders.length}건의 주문이 있습니다.
        </p>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
          <p className="text-gray-500">주문 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  주문 정보
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  고객 정보
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  주문 상태
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  결제 상태
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  금액
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.orderId}</div>
                    <div className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</div>
                    <div className="text-sm text-gray-500">상품 {order.items.length}개</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.companyName}</div>
                    <div className="text-sm text-gray-500">{order.userEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {order.paymentStatus && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadgeColor(order.paymentStatus)}`}>
                        {getPaymentStatusText(order.paymentStatus)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPrice(order.totalAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-col space-y-2">
                      <Link
                        to={`/order-detail-admin/${order.id}`}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        상세보기
                      </Link>
                      
                      <div className="relative inline-block text-left">
                        <select
                          disabled={isUpdating[order.id]}
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                          className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md"
                        >
                          <option value="pending">대기중</option>
                          <option value="processing">처리중</option>
                          <option value="shipped">배송중</option>
                          <option value="delivered">배송완료</option>
                          <option value="cancelled">취소됨</option>
                        </select>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 