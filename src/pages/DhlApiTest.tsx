import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface ShippingRate {
  productName: string;
  totalPrice: number;
  totalPriceBreakdown: {
    price: number;
    currency: string;
  };
}

interface RateResponse {
  products: ShippingRate[];
}

const DhlApiTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rates, setRates] = useState<ShippingRate[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions();
      const getDhlRates = httpsCallable(functions, "getDhlRates");

      const requestData = {
        requestedShipment: {
          shipper: {
            address: {
              postalCode: "12345",
              countryCode: "KR",
            },
          },
          recipient: {
            address: {
              postalCode: "54321",
              countryCode: "US",
            },
          },
          packages: [
            {
              weight: 1.0,
              dimensions: {
                length: 10,
                width: 10,
                height: 10,
              },
            },
          ],
        },
      };

      const result = await getDhlRates(requestData);
      const response = result.data as RateResponse;
      setRates(response.products);
    } catch (err) {
      console.error("Error fetching rates:", err);
      setError(err instanceof Error ? err.message : "배송비 계산 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">DHL 배송비 계산 테스트</h1>
      
      <form onSubmit={handleSubmit} className="mb-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? "계산 중..." : "배송비 계산하기"}
        </button>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {rates.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">계산 결과</h2>
          <div className="grid gap-4">
            {rates.map((rate, index) => (
              <div key={index} className="border p-4 rounded">
                <h3 className="font-medium">{rate.productName}</h3>
                <p>가격: {rate.totalPrice} {rate.totalPriceBreakdown.currency}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DhlApiTest;