import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from 'firebaseApp';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { useContext as useAuthContext } from 'react';
import AuthContext from './AuthContext';
import { Timestamp } from 'firebase/firestore';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  discountPrice?: number;
  categoryName: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  totalItems: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { user } = useAuthContext(AuthContext);

  // Firestore에서 장바구니 데이터 로드
  useEffect(() => {
    const loadCartData = async () => {
      if (!user?.uid) {
        setItems([]);
        return;
      }

      try {
        const cartDoc = await getDoc(doc(db, 'carts', user.uid));
        if (cartDoc.exists()) {
          setItems(cartDoc.data().items || []);
        } else {
          // 장바구니가 없으면 빈 배열로 초기화
          await setDoc(doc(db, 'carts', user.uid), { items: [] });
          setItems([]);
        }
      } catch (error) {
        console.error('Error loading cart:', error);
        setItems([]);
      }
    };

    loadCartData();
  }, [user]);

  // Firestore에 장바구니 데이터 저장
  const saveCartToFirestore = async (newItems: CartItem[]) => {
    if (!user?.uid) return;

    try {
      await setDoc(doc(db, 'carts', user.uid), {
        items: newItems,
        updatedAt: Timestamp.fromDate(new Date())
      });
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addItem = (newItem: CartItem) => {
    const newItems = [...items];
    const existingItem = newItems.find(item => item.id === newItem.id);

    if (existingItem) {
      existingItem.quantity += newItem.quantity;
      setItems(newItems);
    } else {
      newItems.push(newItem);
      setItems(newItems);
    }

    saveCartToFirestore(newItems);
    setIsCartOpen(true);
  };

  const removeItem = (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    saveCartToFirestore(newItems);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    
    const newItems = items.map(item =>
      item.id === id ? { ...item, quantity } : item
    );
    setItems(newItems);
    saveCartToFirestore(newItems);
  };

  const clearCart = () => {
    setItems([]);
    saveCartToFirestore([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  
  const totalAmount = items.reduce((sum, item) => {
    const price = item.discountPrice || item.price;
    return sum + (price * item.quantity);
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        totalItems,
        totalAmount
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default CartContext; 