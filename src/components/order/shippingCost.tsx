import { CartItem } from 'types/schema';

export const calculateShippingCost = (items: CartItem[], shippingTerms: 'FOB' | 'CFR') => {
  let totalWeight = 0;
  let totalVolume = 0;

  // 각 아이템의 무게와 부피 계산
  items.forEach(item => {
    // 예시: 각 아이템의 무게를 1kg, 부피를 1m³로 가정
    // 실제로는 각 상품의 실제 무게와 부피를 사용해야 합니다
    totalWeight += item.quantity * 1; // kg
    totalVolume += item.quantity * 1; // m³
  });

  // 기본 운송비 계산 (예시)
  let baseCost = 0;
  if (shippingTerms === 'FOB') {
    // FOB: 공장 인도 조건
    baseCost = 0; // kg당 2달러
  } else {
    // CFR: 목적지 인도 조건
    baseCost = totalWeight * 3 + totalVolume * 100; // kg당 3달러 + m³당 100달러
  }

  return baseCost;
};
