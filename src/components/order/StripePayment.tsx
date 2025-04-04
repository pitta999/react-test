import React, { useState } from 'react';
import { createCheckoutSession, redirectToCheckout } from 'utils/stripe';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from 'firebaseApp';
import { COLLECTIONS, Order } from 'types/schema';
import { toast } from 'react-toastify';

interface StripePaymentProps {
  order: Order;
  userId: string;
  userEmail: string;
}

export default function StripePayment({ order, userId, userEmail }: StripePaymentProps) {
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);

  const handleStripePayment = async () => {
    try {
      setIsInitiatingPayment(true);
      
      // Stripe 결제 세션 생성
      const session = await createCheckoutSession(order.orderId, order.totalAmount);
      
      // 주문 정보 업데이트 (결제 세션 ID 저장)
      await updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), {
        paymentId: session.id,
        paymentMethod: 'stripe',
        updatedAt: new Date().toISOString(),
        updatedBy: userEmail || userId
      });
      
      // Stripe 결제 페이지로 리다이렉트
      await redirectToCheckout(session.id);
      
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error('Payment processing error. Please try again later.');
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  return (
    <button
      onClick={handleStripePayment}
      disabled={isInitiatingPayment || order.paymentMethod === 'tt'}
      className={`min-w-[120px] py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
        (isInitiatingPayment || order.paymentMethod === 'tt') ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {isInitiatingPayment ? 'Processing...' : 'Credit Card Payment'}
    </button>
  );
} 