import React, { useState } from 'react';
import { createCheckoutSession, redirectToCheckout } from 'utils/stripe';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from 'firebaseApp';
import { COLLECTIONS, Order } from 'types/schema';
import { toast } from 'react-toastify';

interface PaymentButtonsProps {
  order: Order;
  userId: string;
  userEmail: string;
  onOrderUpdate?: (updatedOrder: Order) => void;
}

export default function PaymentButtons({ order, userId, userEmail, onOrderUpdate }: PaymentButtonsProps) {
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [isProcessingTT, setIsProcessingTT] = useState(false);

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
      console.error('결제 처리 중 오류가 발생했습니다:', error);
      toast.error('결제 처리 중 오류가 발생했습니다. 나중에 다시 시도해주세요.');
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  const handleTTPayment = async () => {
    try {
      setIsProcessingTT(true);
      
      // T/T 결제 정보 업데이트
      await updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), {
        paymentMethod: 'tt',
        paymentStatus: 'pending',
        updatedAt: new Date().toISOString(),
        updatedBy: userEmail || userId
      });

      toast.success('T/T 결제가 신청되었습니다.');
      
      // 주문 정보 업데이트 콜백 실행
      if (onOrderUpdate) {
        const updatedOrderDoc = await getDoc(doc(db, COLLECTIONS.ORDERS, order.id));
        if (updatedOrderDoc.exists()) {
          const updatedOrderData = { ...updatedOrderDoc.data(), id: updatedOrderDoc.id } as Order;
          onOrderUpdate(updatedOrderData);
        }
      }
    } catch (error) {
      console.error('T/T 결제 신청 중 오류가 발생했습니다:', error);
      toast.error('T/T 결제 신청 중 오류가 발생했습니다.');
    } finally {
      setIsProcessingTT(false);
    }
  };

  return (
    <div className="flex space-x-4">
      <button
        onClick={handleTTPayment}
        disabled={isProcessingTT}
        className={`min-w-[120px] py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
          isProcessingTT ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isProcessingTT ? '처리 중...' : 'T/T 결제'}
      </button>
      <button
        onClick={handleStripePayment}
        disabled={isInitiatingPayment}
        className={`min-w-[120px] py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
          isInitiatingPayment ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isInitiatingPayment ? '처리 중...' : '신용카드 결제'}
      </button>
    </div>
  );
} 