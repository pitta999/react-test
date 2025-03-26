import React, { useState } from 'react';
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

  const [editingQuantity, setEditingQuantity] = useState<{ [key: string]: number }>({});

  const handleQuantityChange = (itemId: string, value: string) => {
    const numValue = parseInt(value) || 1;
    setEditingQuantity(prev => ({
      ...prev,
      [itemId]: numValue
    }));
  };

  const handleQuantityBlur = (itemId: string) => {
    const quantity = editingQuantity[itemId] || 1;
    updateQuantity(itemId, quantity);
    setEditingQuantity(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  };

  // 가격 포맷팅 함수
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50">
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
                <li key={item.id} className="py-4">
                  <div className="flex flex-col">
                    <div>
                      <div className="flex justify-between text-base font-medium text-gray-900">
                        <h3>{item.name}</h3>
                        <span className="text-sm font-medium">
                          {formatPrice(item.price)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 flex items-end justify-between text-sm mt-2">
                      <div className="flex items-center">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-1 border rounded-l"
                        >
                          -
                        </button>
                        {editingQuantity[item.id] !== undefined ? (
                          <input
                            type="number"
                            min="1"
                            value={editingQuantity[item.id]}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            onBlur={() => handleQuantityBlur(item.id)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleQuantityBlur(item.id);
                              }
                            }}
                            className="w-16 px-2 py-1 border-t border-b text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="px-4 py-1 border-t border-b cursor-pointer"
                            onClick={() => setEditingQuantity(prev => ({ ...prev, [item.id]: item.quantity }))}
                          >
                            {item.quantity}
                          </span>
                        )}
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
            <span className="text-lg font-bold">
              {formatPrice(totalAmount)}
            </span>
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