import { db } from "firebaseApp";
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, setDoc } from "firebase/firestore";
import { COLLECTIONS, User, UserCategory, Product, ProductCategory, Cart, CustomerPrice } from "types/schema";

// 사용자 관련 유틸리티
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (!userDoc.exists()) return null;
    return { ...userDoc.data(), id: userDoc.id } as User;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};

export const getUsersByCategory = async (categoryId: string): Promise<User[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.USERS),
      where("categoryId", "==", categoryId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as User);
  } catch (error) {
    console.error("Error fetching users by category:", error);
    return [];
  }
};

// 사용자 카테고리 관련 유틸리티
export const getUserCategories = async (): Promise<UserCategory[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.USER_CATEGORIES),
      orderBy("level", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as UserCategory);
  } catch (error) {
    console.error("Error fetching user categories:", error);
    return [];
  }
};

// 상품 관련 유틸리티
export const getProductById = async (productId: string): Promise<Product | null> => {
  try {
    const productDoc = await getDoc(doc(db, COLLECTIONS.PRODUCTS, productId));
    if (!productDoc.exists()) return null;
    return { ...productDoc.data(), id: productDoc.id } as Product;
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
};

export const getProductsByCategory = async (categoryId: string): Promise<Product[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where("categoryId", "==", categoryId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Product);
  } catch (error) {
    console.error("Error fetching products by category:", error);
    return [];
  }
};

// 장바구니 관련 유틸리티
export const getUserCart = async (userId: string): Promise<Cart | null> => {
  try {
    const cartDoc = await getDoc(doc(db, COLLECTIONS.CARTS, userId));
    if (!cartDoc.exists()) return null;
    return { ...cartDoc.data(), id: cartDoc.id } as Cart;
  } catch (error) {
    console.error("Error fetching user cart:", error);
    return null;
  }
};

// 타임스탬프 유틸리티
export const getFormattedDate = (date: Date = new Date()): string => {
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// 고객별 맞춤 가격 관련 유틸리티
export const getCustomerPrices = async (userId: string): Promise<CustomerPrice | null> => {
  try {
    const priceDoc = await getDoc(doc(db, COLLECTIONS.CUSTOMER_PRICES, userId));
    if (!priceDoc.exists()) return null;
    return { ...priceDoc.data(), id: priceDoc.id } as CustomerPrice;
  } catch (error) {
    console.error("Error fetching customer prices:", error);
    return null;
  }
};

export const updateCustomerPrices = async (userId: string, data: Omit<CustomerPrice, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  try {
    const priceRef = doc(db, COLLECTIONS.CUSTOMER_PRICES, userId);
    const priceDoc = await getDoc(priceRef);
    
    if (priceDoc.exists()) {
      await updateDoc(priceRef, {
        ...data,
        updatedAt: getFormattedDate(),
      });
    } else {
      await setDoc(priceRef, {
        ...data,
        createdAt: getFormattedDate(),
        updatedAt: getFormattedDate(),
      });
    }
  } catch (error) {
    console.error("Error updating customer prices:", error);
    throw error;
  }
}; 