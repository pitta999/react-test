import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from 'firebaseApp';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { COLLECTIONS, Order, OrderItem } from 'types/schema';
import AuthContext from 'context/AuthContext';
import Loader from '../Loader';
import { toast } from 'react-toastify';

export default function AdminOrderDetail() {
  const { orderId } = useParams();
  const { user, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) return;

      try {
        setIsLoading(true);
        const orderDoc = await getDoc(doc(db, COLLECTIONS.ORDERS, orderId));
        
        if (orderDoc.exists()) {
          const orderData = { ...orderDoc.data(), id: orderDoc.id } as Order;
          setOrder(orderData);
          setEditedItems(JSON.parse(JSON.stringify(orderData.items)));
          setSubtotal(orderData.subtotal || calculateItemsSubtotal(orderData.items));
          setShippingCost(orderData.shippingCost || 0);
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

    if (user && isAdmin) {
      fetchOrderDetails();
    } else if (user && !isAdmin) {
      navigate('/');
    }
  }, [orderId, user, isAdmin, navigate]);

  const calculateItemsSubtotal = (items: OrderItem[]) => {
    return items.reduce((total, item) => {
      const itemPrice = item.discountPrice !== undefined ? item.discountPrice : item.price;
      return total + (itemPrice * item.quantity);
    }, 0);
  };

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

  const handleItemDiscountPriceChange = (index: number, value: string) => {
    const newItems = [...editedItems];
    if (value === '') {
      delete newItems[index].discountPrice;
    } else {
      newItems[index].discountPrice = parseFloat(value) || 0;
    }
    setEditedItems(newItems);
  };

  const handleItemQuantityChange = (index: number, value: string) => {
    const newItems = [...editedItems];
    newItems[index].quantity = parseInt(value) || 1;
    setEditedItems(newItems);
  };

  const handleItemSubtotalChange = (index: number, value: string) => {
    const newItems = [...editedItems];
    const subtotalValue = parseFloat(value) || 0;
    const quantity = newItems[index].quantity || 1;
    
    // 소계 기반으로 할인가 계산
    if (quantity > 0) {
      // 소계를 수량으로 나누어 단가 계산 (할인가로 설정)
      const unitPrice = subtotalValue / quantity;
      newItems[index].discountPrice = parseFloat(unitPrice.toFixed(2));
    }
    
    setEditedItems(newItems);
  };

  const getItemSubtotal = (item: OrderItem) => {
    const itemPrice = item.discountPrice !== undefined ? item.discountPrice : item.price;
    return itemPrice * item.quantity;
  };

  const handleSubtotalChange = (value: string) => {
    setSubtotal(parseFloat(value) || 0);
  };

  const calculateTotal = () => {
    return subtotal + shippingCost;
  };

  const handleSaveChanges = async () => {
    if (!order) return;
    
    try {
      setIsSaving(true);
      
      // 주문 정보 업데이트
      await updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), {
        items: editedItems,
        subtotal,
        shippingCost,
        totalAmount: calculateTotal(),
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || user?.uid
      });

      toast.success('주문 정보가 성공적으로 업데이트되었습니다.');
      
      // 주문 정보 다시 로드
      const updatedOrderDoc = await getDoc(doc(db, COLLECTIONS.ORDERS, order.id));
      if (updatedOrderDoc.exists()) {
        const updatedOrderData = { ...updatedOrderDoc.data(), id: updatedOrderDoc.id } as Order;
        setOrder(updatedOrderData);
      }
    } catch (error) {
      console.error('주문 정보 업데이트 중 오류가 발생했습니다:', error);
      toast.error('주문 정보 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

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

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">주문 정보를 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-8">요청하신 주문 정보가 존재하지 않거나 접근 권한이 없습니다.</p>
          <Link
            to="/admin/orders"
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
        <h1 className="text-3xl font-bold text-gray-900">주문 관리</h1>
        <Link
          to="/admin/orders"
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
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">주문 상품</h3>
          <p className="text-sm text-gray-500">상품 정보를 수정할 수 있습니다</p>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상품
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                정가
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                할인가
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
            {editedItems.map((item, index) => (
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPrice(item.price)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.discountPrice ?? ''}
                    onChange={(e) => handleItemDiscountPriceChange(index, e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="할인 없음"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemQuantityChange(index, e.target.value)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={getItemSubtotal(item)}
                    onChange={(e) => handleItemSubtotalChange(index, e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
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
          <div className="flex justify-between mb-2 items-center">
            <span className="text-gray-600">소계</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={subtotal}
              onChange={(e) => handleSubtotalChange(e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-right"
            />
          </div>
          <div className="flex justify-between mb-4 items-center">
            <span className="text-gray-600">배송비</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={shippingCost}
              onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-right"
            />
          </div>
          <div className="flex justify-between font-medium border-t border-gray-200 pt-4 mt-4">
            <span className="text-gray-900">합계</span>
            <span className="text-primary-600 text-xl">{formatPrice(calculateTotal())}</span>
          </div>

          <div className="mt-6">
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white ${
                isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {isSaving ? '저장 중...' : '변경사항 저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 