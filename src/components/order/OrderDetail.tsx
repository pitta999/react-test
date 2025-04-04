import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from 'firebaseApp';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { COLLECTIONS, MyInfo, Order, User } from 'types/schema';
import AuthContext from 'context/AuthContext';
import Loader from 'components/common/Loader';
import { createCheckoutSession, redirectToCheckout } from 'utils/stripe';
import { toast } from 'react-toastify';
import Invoice from './Invoice';
import TTPayment from './TTPayment';
import StripePayment from './StripePayment';

export default function OrderDetail() {
  const { orderId } = useParams();
  const { user, isAdmin } = useContext(AuthContext);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderUser, setOrderUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [myInfo, setMyInfo] = useState<MyInfo | null>(null);
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

          // myInfo 데이터 가져오기
          const myInfoDoc = await getDoc(doc(db, COLLECTIONS.MY_INFO, 'company'));
          if (myInfoDoc.exists()) {
            const myInfoData = { ...myInfoDoc.data(), id: myInfoDoc.id } as MyInfo;
            setMyInfo(myInfoData);
          }
        } else {
          setOrder(null);
        }
      } catch (error) {
        console.error('Error loading order details:', error);
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
        statusText = 'Pending';
        break;
      case 'processing':
        bgColor = 'bg-blue-100 text-blue-800';
        statusText = 'Processing';
        break;
      case 'shipped':
        bgColor = 'bg-indigo-100 text-indigo-800';
        statusText = 'Shipped';
        break;
      case 'delivered':
        bgColor = 'bg-green-100 text-green-800';
        statusText = 'Delivered';
        break;
      case 'cancelled':
        bgColor = 'bg-red-100 text-red-800';
        statusText = 'Cancelled';
        break;
      default:
        bgColor = 'bg-gray-100 text-gray-800';
        statusText = 'Unknown';
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
        statusText = 'Pending';
        break;
      case 'paid':
        bgColor = 'bg-green-100 text-green-800';
        statusText = 'Paid';
        break;
      case 'failed':
        bgColor = 'bg-red-100 text-red-800';
        statusText = 'Failed';
        break;
      default:
        bgColor = 'bg-gray-100 text-gray-800';
        statusText = 'Unknown';
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
      console.error('Error processing payment:', error);
      toast.error('Error processing payment. Please try again later.');
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

      toast.success('Order canceled successfully.');
    } catch (error) {
      console.error('Error canceling order:', error);
      toast.error('Error canceling order. Please try again later.');
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order information not found</h2>
          <p className="text-gray-600 mb-8">The requested order information may not exist or you do not have access.</p>
          <Link
            to="/order-history"
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            Go to Order History
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
        <Link
          to="/order-history"
          className="text-primary-600 hover:text-primary-700"
        >
          Go to Order History
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Order Information</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Order Number: {order.orderId}</p>
              <p className="max-w-2xl text-sm text-gray-500">
                Order Date: {new Date(order.createdAt).toLocaleDateString()}
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
              <dt className="text-sm font-medium text-gray-500">Order Information</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="space-y-1">
                  <p>Company Name: {orderUser?.fullCompanyName}</p>
                  <p>Contact Person: {orderUser?.personInCharge.name}</p>
                  <p>Email: {orderUser?.email}</p>
                  <p>Phone Number: {orderUser?.telNo}</p>
                  <p>Mobile Number: {orderUser?.mobNo}</p>
                  <p>Address: {orderUser?.companyAddress}</p>
                </div>
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Shipping Information</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="space-y-1">
                  <p>Company Name: {order.shipTo.companyName}</p>
                  <p>Contact Person: {order.shipTo.contactName}</p>
                  <p>Phone Number: {order.shipTo.telNo}</p>
                  <p>Mobile Number: {order.shipTo.mobNo}</p>
                  <p>Email: {order.shipTo.email}</p>
                  <p>Address: {order.shipTo.address}</p>
                </div>
              </dd>
            </div>
            {order.notes && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Order Notes</dt>
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
          <h3 className="text-lg leading-6 font-medium text-gray-900">Order Products</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
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
          <h3 className="text-lg leading-6 font-medium text-gray-900">Payment Information</h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Shipping Fee</span>
            <span className="text-gray-900">{formatPrice(order.shippingCost || 0)}</span>
          </div>
          <div className="flex justify-between font-medium border-t border-gray-200 pt-4 mt-4">
            <span className="text-gray-900">Total</span>
            <span className="text-primary-600 text-xl">{formatPrice(order.totalAmount)}</span>
          </div>
        </div>
      </div>

      {order.paymentStatus === 'pending' && order.status === 'pending' && (
        <>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Invoice</h3>
            </div>
            <div className="px-4 py-5 sm:p-6 flex">
              {orderUser && myInfo && (
                <Invoice order={order} user={orderUser} myInfo={myInfo} />
              )}
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Payment Options</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">T/T Payment</h4>
                  <TTPayment 
                    order={order} 
                    userId={user?.uid || ''} 
                    userEmail={user?.email || ''}
                    onOrderUpdate={(updatedOrder) => setOrder(updatedOrder)}
                  />
                </div>
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">Credit Card Payment</h4>
                  <StripePayment 
                    order={order} 
                    userId={user?.uid || ''} 
                    userEmail={user?.email || ''}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleCancelOrder}
                  className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 