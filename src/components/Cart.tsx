import React from 'react';
import { useCart } from 'context/CartContext';
import { Link } from 'react-router-dom';

export default function Cart() {
  const { items, removeItem, updateQuantity, totalAmount } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
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
                          {formatPrice(item.price)}원
                        </span>
                        <br />
                        <span className="text-primary-600">
                          {formatPrice(item.discountPrice)}원
                        </span>
                      </>
                    ) : (
                      <span>{formatPrice(item.price)}원</span>
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
                  {formatPrice((item.discountPrice || item.price) * item.quantity)}원
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
            {formatPrice(totalAmount)}원
          </span>
        </div>
        <div className="flex justify-end space-x-4">
          <Link
            to="/products"
            className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            계속 쇼핑하기
          </Link>
          <button
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            주문하기
          </button>
        </div>
      </div>
    </div>
  );
} 