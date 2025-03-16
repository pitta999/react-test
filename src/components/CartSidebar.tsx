import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function CartSidebar() {
  const { 
    items, 
    isCartOpen, 
    setIsCartOpen, 
    removeItem, 
    updateQuantity, 
    totalAmount 
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50">
      <div className="h-full flex flex-col">
        {/* 헤더 */}
        <div className="px-4 py-6 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">장바구니</h2>
            <button
              onClick={() => setIsCartOpen(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">닫기</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 상품 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {items.length === 0 ? (
            <p className="text-center text-gray-500">장바구니가 비어있습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {items.map((item) => (
                <li key={item.id} className="py-6 flex">
                  <div className="flex-shrink-0 h-10 w-10">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  </div>

                  <div className="ml-4 flex-1 flex flex-col">
                    <div>
                      <div className="flex justify-between text-base font-medium text-gray-900">
                        <h3>{item.name}</h3>
                        <p className="ml-4">
                          {new Intl.NumberFormat('ko-KR').format(
                            (item.discountPrice || item.price) * item.quantity
                          )}원
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 flex items-end justify-between text-sm">
                      <div className="flex items-center">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-1 border rounded-l"
                        >
                          -
                        </button>
                        <span className="px-4 py-1 border-t border-b">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-1 border rounded-r"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="font-medium text-primary-600 hover:text-primary-500"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 푸터 */}
        <div className="border-t border-gray-200 px-4 py-6">
          <div className="flex justify-between text-base font-medium text-gray-900 mb-4">
            <p>총계</p>
            <p>{new Intl.NumberFormat('ko-KR').format(totalAmount)}원</p>
          </div>
          <Link
            to="/cart"
            className="flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700"
            onClick={() => setIsCartOpen(false)}
          >
            장바구니로 이동
          </Link>
        </div>
      </div>
    </div>
  );
} 