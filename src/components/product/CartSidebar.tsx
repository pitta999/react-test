import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

export default function CartSidebar() {
  const { 
    items, 
    isCartOpen, 
    setIsCartOpen, 
    removeItem, 
    updateQuantity, 
    totalAmount 
  } = useCart();

  const handleQuantityChange = (itemId: string, value: string) => {
    const numValue = parseInt(value) || 1;
    updateQuantity(itemId, numValue);
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
    <div className="fixed inset-y-0 right-0 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50">
      <div className="h-full flex flex-col">
        {/* 헤더 */}
        <div className="px-3 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">Cart</h2>
            <button
              onClick={() => setIsCartOpen(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 상품 목록 */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {items.length === 0 ? (
            <p className="text-center text-xs text-gray-500">Cart is empty.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {items.map((item) => (
                <li key={item.id} className="py-3">
                  <div className="flex flex-col">
                    <div>
                      <div className="flex justify-between text-sm font-medium text-gray-900">
                        <h3 className="truncate max-w-[140px]">{item.name}</h3>
                        <div className="text-xs font-medium">
                          {item.discountPrice ? (
                            <>
                              <span className="line-through text-gray-500">
                                {formatPrice(item.price)}
                              </span>
                              <br />
                              <span className="text-primary-600">
                                {formatPrice(item.discountPrice)}
                              </span>
                            </>
                          ) : (
                            <span>{formatPrice(item.price)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 flex items-end justify-between text-xs mt-1">
                      <div className="flex items-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                          className="w-16 px-1.5 py-0.5 border rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>

                      <div className="flex">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="font-medium text-primary-600 hover:text-primary-500 text-xs"
                        >
                          Delete
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
        <div className="border-t border-gray-200 px-3 py-4">
          <div className="flex justify-between text-sm font-medium text-gray-900 mb-3">
            <p>Total</p>
            <span className="font-bold">
              {formatPrice(totalAmount)}
            </span>
          </div>
          <Link
            to="/cart"
            className="flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            onClick={() => setIsCartOpen(false)}
          >
            Go to Cart
          </Link>
        </div>
      </div>
    </div>
  );
} 