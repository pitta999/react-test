import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { db } from 'firebaseApp';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { COLLECTIONS, Order } from 'types/schema';
import AuthContext from 'context/AuthContext';
import Loader from 'components/common/Loader';

export default function OrderHistory() {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.uid) {
        console.log('User information is missing. Unable to load orders.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log('Loading orders...', user.uid);
        
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
        
        console.log('Loaded all orders:', allOrders.length, 'orders');
        
        // 클라이언트에서 현재 사용자의 주문만 필터링
        const userOrders = allOrders.filter(order => order.userId === user.uid);
        console.log('Current user orders:', userOrders.length, 'orders');
        console.log('First order info:', userOrders.length > 0 ? JSON.stringify(userOrders[0]) : 'None');
        
        setOrders(userOrders);
      } catch (error) {
        console.error('Error loading orders:', error);
        setError('Error loading orders.');
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
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
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
        return 'Pending';
      case 'paid':
        return 'Paid';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">An error occurred</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No orders found</h2>
          <p className="text-gray-600 mb-8">No orders yet.</p>
          <Link
            to="/products"
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            Go to product list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Order History</h1>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {orders.map((order) => (
            <li key={order.id} className="p-4 hover:bg-gray-50">
              <Link to={`/order-detail/${order.id}`} className="block">
                <div className="flex flex-col md:flex-row justify-between">
                  <div className="mb-4 md:mb-0">
                    <p className="text-lg font-medium text-gray-900 mb-1">
                      Order Number: {order.orderId}
                    </p>
                    <p className="text-sm text-gray-500">
                      Order Date: {new Date(order.createdAt).toLocaleDateString()}
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
                    {order.items.length > 1 && ` and ${order.items.length - 1} more items`}
                    {' '}(Total {order.items.reduce((total, item) => total + item.quantity, 0)} items)
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
          Continue Shopping
        </Link>
      </div>
    </div>
  );
} 